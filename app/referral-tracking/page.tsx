'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Users, TrendingUp, Award, Search, Download, RefreshCw, X, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { api } from '../lib/api';

interface ReferralStats {
  totalReferrals: number;
  totalReferralCreditsGiven: number;
  uniqueReferrers: number;
  averageReferralsPerUser: number;
  topReferrers: Array<{
    userId: string;
    name: string;
    phone: string;
    referralCode: string;
    totalReferrals: number;
    creditsEarned: number;
    joinedDate: string;
  }>;
  recentActivity: Array<{
    referrerName: string;
    referrerCode: string;
    newUserName: string;
    newUserPhone: string;
    date: string;
    creditsAwarded: number;
  }>;
  referralTrends: Array<{
    date: string;
    count: number;
  }>;
}

interface ReferralChainData {
  user: {
    userId: string;
    name: string;
    phone: string;
    referralCode: string;
    joinedDate: string;
  };
  referredUsers: Array<{
    userId: string;
    name: string;
    phone: string;
    referralCode: string;
    totalReferrals: number;
    creditsEarned: number;
    joinedDate: string;
  }>;
  totalCount: number;
}

interface ChainLevel {
  userId: string;
  userName: string;
  level: number;
}

function ReferralTrackingContent() {
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDays, setFilterDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [chainData, setChainData] = useState<ReferralChainData | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<ChainLevel[]>([]);

  useEffect(() => {
    fetchReferralStats();
  }, [filterDays]);

  const fetchReferralStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/admin/referral-tracking', {
        params: { days: filterDays }
      });
      
      if (response.success) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching referral stats:', err);
      setError(err.message || 'Failed to load referral statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralChain = async (userId: string, userName: string, level: number = 1) => {
    setModalLoading(true);
    try {
      const response = await api.get(`/api/admin/referral-chain/${userId}`);
      
      if (response.success) {
        setChainData(response.data);
        
        // Update breadcrumb
        if (level === 1) {
          // First level - reset breadcrumb
          setBreadcrumb([{ userId, userName, level }]);
        } else {
          // Deeper level - add to breadcrumb
          setBreadcrumb(prev => [...prev, { userId, userName, level }]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching referral chain:', err);
      alert('Failed to load referral chain: ' + (err.message || 'Unknown error'));
    } finally {
      setModalLoading(false);
    }
  };

  const handleReferralClick = (userId: string, userName: string, totalReferrals: number) => {
    if (totalReferrals === 0) {
      return; // Don't open modal if no referrals
    }
    setShowModal(true);
    fetchReferralChain(userId, userName, 1);
  };

  const handleBreadcrumbClick = (index: number) => {
    const level = breadcrumb[index];
    // Remove all levels after the clicked one
    setBreadcrumb(prev => prev.slice(0, index + 1));
    fetchReferralChain(level.userId, level.userName, level.level);
  };

  const closeModal = () => {
    setShowModal(false);
    setChainData(null);
    setBreadcrumb([]);
  };

  const exportToCSV = () => {
    if (!stats?.topReferrers) return;

    const csvContent = [
      ['Name', 'Phone', 'Referral Code', 'Total Referrals', 'Credits Earned', 'Joined Date'].join(','),
      ...stats.topReferrers.map(r => 
        [r.name, r.phone, r.referralCode, r.totalReferrals, r.creditsEarned, new Date(r.joinedDate).toLocaleDateString()].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-stats-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredReferrers = stats?.topReferrers.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone.includes(searchTerm) ||
    r.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Referral Tracking</h1>
            </div>
            <div className="flex gap-3">
              <select
                value={filterDays}
                onChange={(e) => setFilterDays(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
                <option value={365}>Last Year</option>
                <option value={0}>All Time</option>
              </select>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Joined Via Referral Code</p>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalReferrals.toLocaleString() || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Credits Distributed</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalReferralCreditsGiven.toLocaleString() || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Active Referrers</p>
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.uniqueReferrers.toLocaleString() || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Avg. Referrals/User</p>
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.averageReferralsPerUser.toFixed(1) || '0.0'}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone, or referral code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Top Referrers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Top Referrers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Referrals</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits Earned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReferrers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'No referrers found matching your search' : 'No referral data available'}
                    </td>
                  </tr>
                ) : (
                  filteredReferrers.map((referrer, index) => (
                    <tr key={referrer.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-50 text-blue-800'
                        }`}>
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{referrer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{referrer.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {referrer.referralCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleReferralClick(referrer.userId, referrer.name, referrer.totalReferrals)}
                          disabled={referrer.totalReferrals === 0}
                          className={`text-sm font-semibold ${
                            referrer.totalReferrals > 0 
                              ? 'text-purple-600 hover:text-purple-800 cursor-pointer hover:underline' 
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {referrer.totalReferrals}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">{referrer.creditsEarned.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{new Date(referrer.joinedDate).toLocaleDateString()}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Referral Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Referral Activity</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {stats?.recentActivity.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No recent referral activity
              </div>
            ) : (
              stats?.recentActivity.slice(0, 20).map((activity, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.referrerName}</span>
                        {' '}referred{' '}
                        <span className="font-medium">{activity.newUserName}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Code: <span className="font-mono font-medium">{activity.referrerCode}</span>
                        {' • '}
                        Phone: {activity.newUserPhone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">+{activity.creditsAwarded} credits</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(activity.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Referral Chain Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-purple-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Referral Chain</h2>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mt-2 text-sm">
                  {breadcrumb.map((level, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <button
                        onClick={() => handleBreadcrumbClick(index)}
                        className={`${
                          index === breadcrumb.length - 1
                            ? 'text-purple-600 font-semibold'
                            : 'text-gray-600 hover:text-purple-600'
                        }`}
                      >
                        {level.userName}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                </div>
              ) : chainData ? (
                <div>
                  {/* User Info */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-6 border border-purple-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Name</p>
                        <p className="font-semibold text-gray-900">{chainData.user.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Phone</p>
                        <p className="font-semibold text-gray-900">{chainData.user.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Referral Code</p>
                        <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          {chainData.user.referralCode}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Referred</p>
                        <p className="font-bold text-purple-600 text-lg">{chainData.totalCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Referred Users Table */}
                  {chainData.referredUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No users referred yet</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral Code</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Referrals</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits Earned</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {chainData.referredUsers.map((user, index) => (
                              <tr key={user.userId} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-600">{user.phone}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                    {user.referralCode}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <button
                                    onClick={() => fetchReferralChain(user.userId, user.name, breadcrumb.length + 1)}
                                    disabled={user.totalReferrals === 0}
                                    className={`text-sm font-semibold ${
                                      user.totalReferrals > 0
                                        ? 'text-purple-600 hover:text-purple-800 cursor-pointer hover:underline flex items-center gap-1'
                                        : 'text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    {user.totalReferrals}
                                    {user.totalReferrals > 0 && <ChevronRight className="w-4 h-4" />}
                                  </button>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-semibold text-green-600">
                                    {user.creditsEarned.toLocaleString()}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-600">
                                    {new Date(user.joinedDate).toLocaleDateString()}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReferralTracking() {
  return (
    <AuthGuard>
      <ReferralTrackingContent />
    </AuthGuard>
  );
}
