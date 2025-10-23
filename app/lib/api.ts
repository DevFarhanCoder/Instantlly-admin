import axios, { AxiosRequestConfig } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://instantlly-cards-backend-6ki0.onrender.com/api';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'your-secure-admin-key-here';

// Render free tier can take 50+ seconds to wake up from sleep
const HEALTH_CHECK_TIMEOUT = 90000; // 90 seconds
const API_TIMEOUT = 30000; // 30 seconds for regular API calls

interface WakeUpProgress {
  message: string;
  attempt: number;
  maxAttempts: number;
}

/**
 * Wake up the Render server by pinging the health endpoint
 * Render free tier services go to sleep after 15 minutes of inactivity
 * and can take 50+ seconds to wake up
 */
export async function wakeUpServer(
  onProgress?: (progress: WakeUpProgress) => void
): Promise<boolean> {
  const maxAttempts = 3;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      onProgress?.({
        message: `Waking up server... (Attempt ${attempt}/${maxAttempts})`,
        attempt,
        maxAttempts
      });

      const response = await axios.get(`${API_BASE}/health`.replace('/api', ''), {
        timeout: HEALTH_CHECK_TIMEOUT,
        validateStatus: (status) => status < 500 // Accept any status < 500
      });

      if (response.data?.ok) {
        onProgress?.({
          message: 'Server is ready!',
          attempt,
          maxAttempts
        });
        return true;
      }
    } catch (error: any) {
      console.warn(`Health check attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxAttempts) {
        throw new Error(
          'Server is not responding. Please check if the backend is running on Render.'
        );
      }
      
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  return false;
}

/**
 * Make an API request with automatic server wake-up and retry logic
 */
export async function apiRequest<T = any>(
  endpoint: string,
  config: AxiosRequestConfig = {},
  onWakeUpProgress?: (progress: WakeUpProgress) => void
): Promise<T> {
  // Add admin key header
  const headers = {
    'x-admin-key': ADMIN_KEY,
    ...config.headers
  };

  // Try the request first (server might already be awake)
  try {
    const response = await axios({
      ...config,
      url: `${API_BASE}${endpoint}`,
      headers,
      timeout: config.timeout || API_TIMEOUT
    });
    return response.data;
  } catch (firstError: any) {
    // If it's a timeout or network error, try waking up the server
    const isTimeoutOrNetwork = 
      firstError.code === 'ECONNABORTED' ||
      firstError.code === 'ERR_NETWORK' ||
      firstError.message?.includes('timeout') ||
      firstError.message?.includes('Network Error');

    if (isTimeoutOrNetwork) {
      console.log('Initial request failed, attempting to wake up server...');
      
      try {
        // Wake up the server
        await wakeUpServer(onWakeUpProgress);
        
        // Retry the original request
        const response = await axios({
          ...config,
          url: `${API_BASE}${endpoint}`,
          headers,
          timeout: config.timeout || API_TIMEOUT
        });
        return response.data;
      } catch (wakeUpError: any) {
        throw new Error(
          `Server wake-up failed: ${wakeUpError.message || 'Unknown error'}. ` +
          'Please ensure the backend is deployed and running on Render.'
        );
      }
    }
    
    // For other errors, just throw them
    throw firstError;
  }
}

/**
 * Export convenience methods for common HTTP methods
 */
export const api = {
  get: <T = any>(
    endpoint: string,
    config?: AxiosRequestConfig,
    onWakeUpProgress?: (progress: WakeUpProgress) => void
  ) => apiRequest<T>(endpoint, { ...config, method: 'GET' }, onWakeUpProgress),

  post: <T = any>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig,
    onWakeUpProgress?: (progress: WakeUpProgress) => void
  ) => apiRequest<T>(endpoint, { ...config, method: 'POST', data }, onWakeUpProgress),

  put: <T = any>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig,
    onWakeUpProgress?: (progress: WakeUpProgress) => void
  ) => apiRequest<T>(endpoint, { ...config, method: 'PUT', data }, onWakeUpProgress),

  delete: <T = any>(
    endpoint: string,
    config?: AxiosRequestConfig,
    onWakeUpProgress?: (progress: WakeUpProgress) => void
  ) => apiRequest<T>(endpoint, { ...config, method: 'DELETE' }, onWakeUpProgress),
};

export { API_BASE, ADMIN_KEY };
