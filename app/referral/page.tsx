'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Gift, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { api } from '../lib/api';

function ReferralSystemContent() {
  const router = useRouter();
  const [signupBonus, setSignupBonus] = useState(200);
  const [referralReward, setReferralReward] = useState(300);
  const [originalSignupBonus, setOriginalSignupBonus] = useState(200);
  const [originalReferralReward, setOriginalReferralReward] = useState(300);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch current configuration on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setFetching(true);
    setError(null);
    try {
      const response = await api.get('/api/credits/config');
      
      if (response.success && response.config) {
        const { signupBonus: sb, referralReward: rr } = response.config;
        setSignupBonus(sb);
        setReferralReward(rr);
        setOriginalSignupBonus(sb);
        setOriginalReferralReward(rr);
        console.log('✅ Current credit config loaded:', response.config);
      }
    } catch (err: any) {
      console.error('Error fetching configuration:', err);
      setError('Failed to load current configuration. Using defaults.');
    } finally {
      setFetching(false);
    }
  };

  const handleUpdate = async () => {
    // Validation
    if (signupBonus < 0 || !Number.isInteger(signupBonus)) {
      setError('Self Download credits must be a non-negative whole number');
      return;
    }
    if (referralReward < 0 || !Number.isInteger(referralReward)) {
      setError('Introducer credits must be a non-negative whole number');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await api.put('/api/credits/config', {
        signupBonus,
        referralReward,
        updatedBy: 'admin'
      });

      if (response.success) {
        setSuccessMessage('✅ Credit configuration updated successfully! New values will apply to all future signups.');
        setOriginalSignupBonus(signupBonus);
        setOriginalReferralReward(referralReward);
        console.log('✅ Config updated:', response.config);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      console.error('Error updating configuration:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to update configuration';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSignupBonus(originalSignupBonus);
    setReferralReward(originalReferralReward);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className='min-h-screen bg-gray-100'>
      <header className='bg-white shadow'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <button
            onClick={() => router.push('/')}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition'
          >
            <ArrowLeft className='w-5 h-5' />
            Back to Dashboard
          </button>
          <div className='flex items-start gap-4'>
            <div className='p-3 bg-purple-100 rounded-xl'>
              <Gift className='w-8 h-8 text-purple-600' />
            </div>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>Referral System</h1>
              <p className='mt-1 text-sm text-gray-600'>Manage signup and referral credit rewards</p>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Error Message */}
        {error && (
          <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 flex-shrink-0 mt-0.5' />
            <p className='text-red-800 text-sm'>{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className='mb-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
            <p className='text-green-800 text-sm'>{successMessage}</p>
          </div>
        )}

        {/* Loading State */}
        {fetching ? (
          <div className='bg-white rounded-lg shadow p-12 mb-6 flex flex-col items-center justify-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4'></div>
            <p className='text-gray-600'>Loading current configuration...</p>
          </div>
        ) : (
          <div className='bg-white rounded-lg shadow p-6 mb-6'>
          <h2 className='text-xl font-semibold text-gray-900 mb-6'>Credit Configuration</h2>

          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Self Download
              </label>
              <p className='text-sm text-gray-500 mb-3'>
                Credits awarded to new users when they sign up
              </p>
              <input
                type='number'
                value={signupBonus}
                onChange={(e) => setSignupBonus(Number(e.target.value))}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black font-medium'
                min='0'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Introducer
              </label>
              <p className='text-sm text-gray-500 mb-3'>
                Credits awarded to existing users when someone uses their referral code
              </p>
              <input
                type='number'
                value={referralReward}
                onChange={(e) => setReferralReward(Number(e.target.value))}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black font-medium'
                min='0'
              />
            </div>

            <div className='bg-purple-50 border border-purple-200 rounded-lg p-4'>
              <h3 className='text-sm font-semibold text-purple-900 mb-2'>Preview</h3>
              <ul className='space-y-1 text-sm text-purple-800'>
                <li>• New user signs up → Gets <span className='font-bold'>{signupBonus} credits</span></li>
                <li>• Existing user's referral code used → Gets <span className='font-bold'>{referralReward} credits</span></li>
              </ul>
            </div>

            <div className='flex gap-3'>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className='flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-medium transition'
              >
                <Save className='w-5 h-5' />
                {loading ? 'Updating...' : 'Update Referral'}
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className='flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg font-medium transition'
              >
                <RotateCcw className='w-5 h-5' />
                Reset
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Info Banner */}
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-6'>
          <h3 className='flex items-center gap-2 text-blue-900 font-semibold mb-3'>
            <Gift className='w-5 h-5' />
            Important Information
          </h3>
          <ul className='space-y-2 text-sm text-blue-800'>
            <li className='flex items-start'>
              <span className='mr-2'>•</span>
              <span><strong>New users only:</strong> Changes affect all future signups, not existing users</span>
            </li>
            <li className='flex items-start'>
              <span className='mr-2'>•</span>
              <span><strong>Existing 145+ users:</strong> Keep their original credits (200 self download, 300 introducer)</span>
            </li>
            <li className='flex items-start'>
              <span className='mr-2'>•</span>
              <span><strong>Immediate effect:</strong> New values apply instantly after clicking "Update Referral"</span>
            </li>
            <li className='flex items-start'>
              <span className='mr-2'>•</span>
              <span><strong>Mobile app:</strong> Will automatically display updated credit amounts</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default function ReferralPage() {
  return (
    <AuthGuard>
      <ReferralSystemContent />
    </AuthGuard>
  );
}
