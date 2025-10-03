'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  CreditCard,
  MessageSquare,
  UsersRound,
  Download,
  Search,
  TrendingUp,
  Activity,
  Trash2,
  LogOut
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';
import AuthGuard from './components/AuthGuard';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://instantlly-cards-backend.onrender.com/api';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'your-secure-admin-key-here';

function DashboardContent() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminAuthTime');
    router.push('/login');
  };

  useEffect(() => {
    fetchStats();
    fetchUserGrowth();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/stats`, {
        headers: { 'x-admin-key': ADMIN_KEY }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/admin/users`, {
        headers: { 'x-admin-key': ADMIN_KEY },
        params: {
          page: currentPage,
          limit: 50,
          search: searchTerm
        }
      });
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGrowth = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/analytics/user-growth`, {
        headers: { 'x-admin-key': ADMIN_KEY },
        params: { days: 30 }
      });
      setUserGrowth(response.data);
    } catch (error) {
      console.error('Error fetching user growth:', error);
    }
  };

  const exportAllUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/users/export`, {
        headers: { 'x-admin-key': ADMIN_KEY },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting users:', error);
    }
  };

  const exportPhoneNumbers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/admin/users/export-phones`, {
        headers: { 'x-admin-key': ADMIN_KEY },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `phone-numbers-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting phone numbers:', error);
    }
  };

  const exportUserContacts = async (userId: string, userName: string) => {
    try {
      const response = await axios.get(`${API_BASE}/admin/users/${userId}/contacts/export`, {
        headers: { 'x-admin-key': ADMIN_KEY },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${userName}-contacts-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting user contacts:', error);
      alert('Failed to export contacts. Please try again.');
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${userName}"?\n\nThis will permanently delete:\n- User account\n- All their cards\n- All their contacts\n- All their messages\n- All their notifications\n- All related data\n\nThis action CANNOT be undone!`
    );
    
    if (!confirmed) return;

    try {
      await axios.delete(`${API_BASE}/admin/users/${userId}`, {
        headers: { 'x-admin-key': ADMIN_KEY }
      });
      
      alert(`User "${userName}" has been deleted successfully!`);
      
      // Refresh the user list and stats
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  if (!stats) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      <header className='bg-white shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex justify-between items-center'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>InstantllyCards Admin Dashboard</h1>
              <p className='mt-2 text-sm text-gray-600'>Monitor and manage your application</p>
            </div>
            <button
              onClick={handleLogout}
              className='flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition'
            >
              <LogOut className='w-4 h-4' />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <StatCard
            title='Total Users'
            value={stats.totalUsers}
            icon={<Users className='w-8 h-8 text-blue-600' />}
            trend={`+${stats.newUsersThisWeek} this week`}
          />
          <StatCard
            title='Total Cards'
            value={stats.totalCards}
            icon={<CreditCard className='w-8 h-8 text-green-600' />}
            trend={null}
          />
          <StatCard
            title='Total Messages'
            value={stats.totalMessages}
            icon={<MessageSquare className='w-8 h-8 text-purple-600' />}
            trend={null}
          />
          <StatCard
            title='Total Groups'
            value={stats.totalGroups}
            icon={<UsersRound className='w-8 h-8 text-orange-600' />}
            trend={null}
          />
        </div>

        {userGrowth.length > 0 && (
          <div className='bg-white rounded-lg shadow p-6 mb-8'>
            <h2 className='text-xl font-semibold mb-4 flex items-center'>
              <TrendingUp className='w-5 h-5 mr-2' />
              User Growth (Last 30 Days)
            </h2>
            <ResponsiveContainer width='100%' height={300}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='_id' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type='monotone' dataKey='count' stroke='#2563eb' name='New Users' />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className='bg-white rounded-lg shadow'>
          <div className='px-6 py-4 border-b border-gray-200'>
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
              <h2 className='text-xl font-semibold flex items-center'>
                <Activity className='w-5 h-5 mr-2' />
                All Users
              </h2>
              <div className='flex gap-2'>
                <button
                  onClick={exportAllUsers}
                  className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
                >
                  <Download className='w-4 h-4 mr-2' />
                  Export All Users
                </button>
                <button
                  onClick={exportPhoneNumbers}
                  className='flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700'
                >
                  <Download className='w-4 h-4 mr-2' />
                  Export Phone Numbers
                </button>
              </div>
            </div>
            
            <div className='mt-4 relative'>
              <Search className='w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                placeholder='Search by name or phone...'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>

          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    User
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Phone
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Stats
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Joined
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {loading ? (
                  <tr>
                    <td colSpan={5} className='px-6 py-4 text-center text-gray-500'>
                      Loading...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='px-6 py-4 text-center text-gray-500'>
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 h-10 w-10'>
                            {user.profilePicture ? (
                              <img className='h-10 w-10 rounded-full' src={user.profilePicture} alt='' />
                            ) : (
                              <div className='h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center'>
                                <span className='text-gray-600 font-medium'>
                                  {user.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>{user.name}</div>
                            <div className='text-sm text-gray-500'>{user.about || 'No bio'}</div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-900'>{user.phone}</div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-500'>
                          <div>Cards: {user.stats?.cards || 0}</div>
                          <div>Messages: {user.stats?.messages || 0}</div>
                          <div>Contacts: {user.stats?.contacts || 0}</div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-500'>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex gap-2'>
                          <button
                            onClick={() => exportUserContacts(user._id, user.name || user.phone)}
                            className='flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700'
                            title={`Download ${user.stats?.contacts || 0} contacts`}
                          >
                            <Download className='w-3 h-3 mr-1' />
                            Contacts ({user.stats?.contacts || 0})
                          </button>
                          <button
                            onClick={() => deleteUser(user._id, user.name || user.phone)}
                            className='flex items-center px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700'
                            title='Delete user and all related data'
                          >
                            <Trash2 className='w-3 h-3 mr-1' />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
            <div className='text-sm text-gray-500'>
              Page {currentPage} of {totalPages}
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: any) {
  return (
    <div className='bg-white rounded-lg shadow p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-gray-600'>{title}</p>
          <p className='text-2xl font-bold mt-1'>{value.toLocaleString()}</p>
          {trend && <p className='text-xs text-green-600 mt-1'>{trend}</p>}
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
