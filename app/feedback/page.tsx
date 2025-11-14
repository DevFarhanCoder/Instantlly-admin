'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Star,
  Clock,
  User,
  Phone,
  Mail,
  ChevronLeft,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { API_BASE } from '../lib/api';

interface Feedback {
  _id: string;
  userId: {
    name: string;
    phone: string;
    email?: string;
  };
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
  rating?: number;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function FeedbackContent() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [updating, setUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchFeedbacks();
  }, [statusFilter, currentPage]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = sessionStorage.getItem('adminToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const params: any = {
        page: currentPage,
        limit: 20
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await axios.get(`${API_BASE}/api/feedback/all`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setFeedbacks(response.data.data);
        setTotal(response.data.pagination.total);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error: any) {
      console.error('Error fetching feedbacks:', error);
      setError(error.response?.data?.message || 'Failed to fetch feedbacks');
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, status: string) => {
    try {
      setUpdating(true);
      const token = sessionStorage.getItem('adminToken');

      const response = await axios.patch(
        `${API_BASE}/api/feedback/${feedbackId}/status`,
        { 
          status,
          adminResponse: adminResponse || undefined
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        fetchFeedbacks();
        setSelectedFeedback(null);
        setAdminResponse('');
      }
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      alert(error.response?.data?.message || 'Failed to update feedback');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in-progress': return <AlertCircle className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-sm text-gray-400">No rating</span>;
    
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
                <p className="text-sm text-gray-500">Manage and respond to user feedback</p>
              </div>
            </div>
            <button
              onClick={fetchFeedbacks}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Pending</span>
            </div>
            <p className="text-2xl font-bold">
              {feedbacks.filter(f => f.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">In Progress</span>
            </div>
            <p className="text-2xl font-bold">
              {feedbacks.filter(f => f.status === 'in-progress').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Resolved</span>
            </div>
            <p className="text-2xl font-bold">
              {feedbacks.filter(f => f.status === 'resolved').length}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-700">Filter by Status</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'in-progress', 'resolved', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All Feedback' : status.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-500">Loading feedback...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No feedback found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div
                key={feedback._id}
                className="bg-white rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {feedback.subject}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(feedback.status)}`}>
                          {getStatusIcon(feedback.status)}
                          {feedback.status.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {feedback.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {feedback.phone}
                        </div>
                        {feedback.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {feedback.email}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(feedback.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="mb-3">
                        {renderStars(feedback.rating)}
                      </div>

                      <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                        {feedback.message}
                      </p>

                      {feedback.adminResponse && (
                        <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-blue-900 mb-1">Admin Response</p>
                          <p className="text-sm text-blue-800">{feedback.adminResponse}</p>
                          {feedback.respondedAt && (
                            <p className="text-xs text-blue-600 mt-2">
                              Responded on {new Date(feedback.respondedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {selectedFeedback?._id === feedback._id ? (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={adminResponse}
                        onChange={(e) => setAdminResponse(e.target.value)}
                        placeholder="Add admin response (optional)"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateFeedbackStatus(feedback._id, 'in-progress')}
                          disabled={updating}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                          Mark In Progress
                        </button>
                        <button
                          onClick={() => updateFeedbackStatus(feedback._id, 'resolved')}
                          disabled={updating}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => updateFeedbackStatus(feedback._id, 'closed')}
                          disabled={updating}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                          Close
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFeedback(null);
                            setAdminResponse('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedFeedback(feedback)}
                      className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Manage Feedback
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-white border rounded-lg">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <AuthGuard>
      <FeedbackContent />
    </AuthGuard>
  );
}
