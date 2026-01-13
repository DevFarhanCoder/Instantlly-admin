'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CreditCard, ArrowLeft, Send, AlertCircle, CheckCircle } from 'lucide-react';
import AuthGuard from '../components/AuthGuard';
import { api } from '../lib/api';

function CreditTransferContent() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    setMessage(null);
    
    try {
      // Fetch users with search from backend
      const response = await api.get('/api/admin/users', {
        params: { 
          page: 1, 
          limit: 100, // Get more users for better search results
          search: searchTerm 
        }
      });
      
      if (response.users && response.users.length > 0) {
        setSearchResults(response.users);
      } else {
        setSearchResults([]);
        setMessage({ type: 'error', text: 'No users found matching your search' });
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to search users' });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/api/admin/credits/transfer', {
        userId: selectedUser._id,
        amount: parseFloat(amount),
        reason: 'Admin credit transfer'
      });

      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `Successfully transferred ₹${amount} credits to ${selectedUser.name}` 
        });
        
        // Update selected user's balance
        setSelectedUser({ ...selectedUser, credits: (selectedUser.credits || 0) + parseFloat(amount) });
        
        // Clear form after delay
        setTimeout(() => {
          setAmount('');
          setSelectedUser(null);
          setSearchResults([]);
          setSearchTerm('');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: response.message || 'Transfer failed' });
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to transfer credits' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Credit Transfer</h1>
                  <p className="text-sm text-gray-600">Transfer credits to users</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search User</h2>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Search Results:</p>
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedUser?._id === user._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Current Balance</p>
                      <p className="font-semibold text-gray-900">₹{user.credits || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transfer Section */}
        {selectedUser && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transfer Credits</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Selected User</p>
                  <p className="text-sm text-blue-700">{selectedUser.name} - {selectedUser.phone}</p>
                  <p className="text-sm text-blue-700">Current Balance: ₹{selectedUser.credits || 0}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Transfer (₹)
              </label>
              <input
                type="number"
                placeholder="Enter amount..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                step="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAmount('200')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ₹200
              </button>
              <button
                onClick={() => setAmount('500')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ₹500
              </button>
              <button
                onClick={() => setAmount('1000')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ₹1000
              </button>
              <button
                onClick={() => setAmount('5000')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ₹5000
              </button>
            </div>

            <button
              onClick={handleTransfer}
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {loading ? 'Transferring...' : `Transfer ₹${amount || '0'} Credits`}
            </button>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreditTransferPage() {
  return (
    <AuthGuard>
      <CreditTransferContent />
    </AuthGuard>
  );
}
