'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Palette,
  Clock,
  Loader2,
  CheckCircle,
  List,
  RefreshCw,
  X,
  Eye,
  Edit,
  Image as ImageIcon,
  Phone,
  Mail,
  Building,
  Calendar,
  User,
  ArrowLeft,
  Play,
  XCircle,
  Key,
  Send,
  UserPlus,
  Trash2,
  Lock,
  Inbox,
  Upload,
  Download,
  FileImage,
  EyeOff
} from 'lucide-react';
import AuthGuard from '../components/AuthGuard';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.instantllycards.com';

interface DesignRequest {
  _id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  adType: 'image' | 'video';
  channelType: 'withChannel' | 'withoutChannel';
  uploaderName?: string;
  uploaderPhone?: string;
  businessName?: string;
  email?: string;
  phoneNumber?: string;
  adText?: string;
  businessAddress?: string;
  webLinks?: string[];
  referenceImagesGridFS?: string[];
  referenceVideosGridFS?: string[];
  referenceImagesS3?: Array<{ url: string; key: string }>;
  referenceVideosS3?: Array<{ url: string; key: string }>;
  adminNotes?: string;
  assignedDesignerId?: string;
  assignedDesignerName?: string;
  assignedAt?: string;
  createdAt: string;
}

interface Ad {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  adType: 'image' | 'video';
  phoneNumber: string;
  uploaderName?: string;
  uploadedBy?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  priority?: number;
  rejectionReason?: string;
  bottomImageId?: string;
  fullscreenImageId?: string;
  bottomVideoId?: string;
  fullscreenVideoId?: string;
  // S3/CloudFront URLs (preferred over GridFS)
  bottomImageS3Url?: string;
  fullscreenImageS3Url?: string;
  bottomVideoS3Url?: string;
  fullscreenVideoS3Url?: string;
  hasBottomImage?: boolean;
  hasFullscreenImage?: boolean;
  hasBottomVideo?: boolean;
  hasFullscreenVideo?: boolean;
  approvedBy?: string;
}

interface Designer {
  id: string;
  username: string;
  name: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  assignedRequests: number;
  completedRequests: number;
}

interface ReceivedDesign {
  id: string;
  designRequestId: string;
  designerName: string;
  designerId: string;
  uploaderName: string;
  uploaderPhone: string;
  businessName?: string;
  adType: 'image' | 'video';
  status: 'new' | 'reviewed' | 'sent-to-user' | 'user-approved' | 'user-rejected' | 'changes-requested';
  designFiles: Array<{ url: string; type: 'image' | 'video'; name: string }>;
  designerNotes?: string;
  adminFeedback?: string;
  userFeedback?: string;
  uploadedAt: string;
  sentToUserAt?: string;
}

function DesignRequestContent() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<'design-requests' | 'ads-pending' | 'designer-passwords' | 'received-designs'>('design-requests');
  const [loading, setLoading] = useState(false);
  
  // Design Requests State
  const [allRequests, setAllRequests] = useState<DesignRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DesignRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [adTypeFilter, setAdTypeFilter] = useState('');
  const [channelTypeFilter, setChannelTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ads State
  const [allAds, setAllAds] = useState<Ad[]>([]);
  const [filteredAds, setFilteredAds] = useState<Ad[]>([]);
  const [adsStatusFilter, setAdsStatusFilter] = useState('pending');
  const [adsTypeFilter, setAdsTypeFilter] = useState('');
  const [adsSearchQuery, setAdsSearchQuery] = useState('');
  
  // Modal State
  const [selectedRequest, setSelectedRequest] = useState<DesignRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  
  // Image/Video Modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  
  // Ad Modals
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [showAdDetailsModal, setShowAdDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvePriority, setApprovePriority] = useState(5);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Accordion state for design requests
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Designer Password State
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [designerUsername, setDesignerUsername] = useState('');
  const [designerPassword, setDesignerPassword] = useState('');
  const [designerName, setDesignerName] = useState('');
  const [designerEmail, setDesignerEmail] = useState('');
  const [showDesignerPassword, setShowDesignerPassword] = useState(false);

  // Share to Designer State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRequest, setShareRequest] = useState<DesignRequest | null>(null);
  const [assigningDesigner, setAssigningDesigner] = useState(false);
  const [selectedDesignerId, setSelectedDesignerId] = useState<string | null>(null);
  const [selectedDesignerName, setSelectedDesignerName] = useState<string>('');

  // Received Designs State
  const [receivedDesigns, setReceivedDesigns] = useState<ReceivedDesign[]>([]);
  const [receivedDesignsFilter, setReceivedDesignsFilter] = useState('');
  const [receivedDesignsSearch, setReceivedDesignsSearch] = useState('');
  const [selectedDesign, setSelectedDesign] = useState<ReceivedDesign | null>(null);
  const [showDesignPreviewModal, setShowDesignPreviewModal] = useState(false);
  const [showSendToUserModal, setShowSendToUserModal] = useState(false);
  const [sendToUserMessage, setSendToUserMessage] = useState('');
  
  const toggleAccordion = (requestId: string) => {
    setExpandedRequestId(expandedRequestId === requestId ? null : requestId);
  };

  useEffect(() => {
    loadDesignRequests();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRequests, statusFilter, adTypeFilter, channelTypeFilter, searchQuery]);

  useEffect(() => {
    applyAdsFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAds, adsStatusFilter, adsTypeFilter, adsSearchQuery]);

  const loadDesignRequests = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/api/channel-partner/ads/design-requests/all`;
      console.log('🔍 DEBUG API_BASE:', API_BASE);
      console.log('🔍 DEBUG Full URL:', url);
      const response = await fetch(url);
      console.log('🔍 DEBUG Response status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch design requests');
      const data = await response.json();
      setAllRequests(data.designRequests || []);
    } catch (error) {
      console.error('Error loading design requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingAds = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/channel-partner/ads`);
      if (!response.ok) throw new Error('Failed to fetch ads');
      const data = await response.json();
      // Filter to only show mobile user ads
      const mobileAds = (data.ads || []).filter((ad: Ad) => {
        const uploadedBy = ad.uploadedBy || '';
        return uploadedBy !== 'admin' && uploadedBy !== '' && /^\+?\d+$/.test(uploadedBy);
      });
      setAllAds(mobileAds);
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const filtered = allRequests.filter(request => {
      const matchesStatus = !statusFilter || request.status === statusFilter;
      const matchesAdType = !adTypeFilter || request.adType === adTypeFilter;
      const matchesChannelType = !channelTypeFilter || request.channelType === channelTypeFilter;
      const matchesSearch = !searchQuery || 
        (request.uploaderName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (request.uploaderPhone?.includes(searchQuery)) ||
        (request.businessName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (request.email?.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesAdType && matchesChannelType && matchesSearch;
    });
    setFilteredRequests(filtered);
  };

  const applyAdsFilters = () => {
    const filtered = allAds.filter(ad => {
      const matchesStatus = !adsStatusFilter || ad.status === adsStatusFilter;
      const matchesType = !adsTypeFilter || ad.adType === adsTypeFilter;
      const matchesSearch = !adsSearchQuery || 
        ad.title.toLowerCase().includes(adsSearchQuery.toLowerCase()) ||
        ad.phoneNumber.includes(adsSearchQuery) ||
        ad.uploaderName?.toLowerCase().includes(adsSearchQuery.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });
    setFilteredAds(filtered);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setAdTypeFilter('');
    setChannelTypeFilter('');
    setSearchQuery('');
  };

  const clearAdsFilters = () => {
    setAdsStatusFilter('pending');
    setAdsTypeFilter('');
    setAdsSearchQuery('');
  };

  const handleTabChange = (tab: 'design-requests' | 'ads-pending' | 'designer-passwords' | 'received-designs') => {
    setCurrentTab(tab);
    if (tab === 'ads-pending') {
      loadPendingAds();
    } else if (tab === 'designer-passwords') {
      loadDesigners();
    } else if (tab === 'received-designs') {
      loadReceivedDesigns();
    } else {
      loadDesignRequests();
    }
  };

  // Designer management functions
  const loadDesigners = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/designers`);
      if (response.ok) {
        const data = await response.json();
        setDesigners(data.designers || []);
      }
    } catch (error) {
      console.error('Error loading designers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDesigner = async () => {
    if (!designerUsername || !designerPassword) {
      alert('Please fill in username and password');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/admin/designers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: designerUsername,
          password: designerPassword
        })
      });
      if (response.ok) {
        alert('Designer account created successfully!');
        setDesignerUsername('');
        setDesignerPassword('');
        loadDesigners();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to create designer');
      }
    } catch (error) {
      console.error('Error creating designer:', error);
      alert('Failed to create designer account');
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDesignerPassword(password);
    setShowDesignerPassword(true);
  };

  // Received designs functions
  const loadReceivedDesigns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/received-designs`);
      if (response.ok) {
        const data = await response.json();
        setReceivedDesigns(data.designs || []);
      }
    } catch (error) {
      console.error('Error loading received designs:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendDesignToUser = async () => {
    if (!selectedDesign) return;
    try {
      const response = await fetch(`${API_BASE}/api/admin/received-designs/${selectedDesign.id}/send-to-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sendToUserMessage })
      });
      if (response.ok) {
        alert('Design sent to user for approval!');
        setShowSendToUserModal(false);
        setSendToUserMessage('');
        loadReceivedDesigns();
      } else {
        alert('Failed to send design to user');
      }
    } catch (error) {
      console.error('Error sending design to user:', error);
      alert('Failed to send design to user');
    }
  };

  const filteredReceivedDesigns = receivedDesigns.filter(design => {
    const matchesFilter = !receivedDesignsFilter || design.status === receivedDesignsFilter;
    const matchesSearch = !receivedDesignsSearch ||
      design.designerName.toLowerCase().includes(receivedDesignsSearch.toLowerCase()) ||
      design.uploaderName.toLowerCase().includes(receivedDesignsSearch.toLowerCase()) ||
      design.businessName?.toLowerCase().includes(receivedDesignsSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const receivedDesignsStats = {
    total: receivedDesigns.length,
    new: receivedDesigns.filter(d => d.status === 'new').length,
    sentToUser: receivedDesigns.filter(d => d.status === 'sent-to-user').length,
    changesRequested: receivedDesigns.filter(d => d.status === 'changes-requested').length,
  };

  const getDesignStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-purple-100 text-purple-800';
      case 'sent-to-user': return 'bg-green-100 text-green-800';
      case 'user-approved': return 'bg-emerald-100 text-emerald-800';
      case 'user-rejected': return 'bg-red-100 text-red-800';
      case 'changes-requested': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const updateRequestStatus = async () => {
    if (!selectedRequest) return;
    try {
      const response = await fetch(`${API_BASE}/api/channel-partner/ads/design-requests/${selectedRequest._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, adminNotes })
      });
      if (!response.ok) throw new Error('Failed to update status');
      alert('Status updated successfully!');
      setShowStatusModal(false);
      loadDesignRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const approveAd = async () => {
    if (!selectedAd) return;
    if (!confirm('Are you sure you want to approve this ad? This will deduct 1200 credits from the user.')) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/ads/${selectedAd.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: approvePriority })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to approve ad');
      alert('Ad approved successfully!');
      setShowApproveModal(false);
      loadPendingAds();
    } catch (error: any) {
      console.error('Error approving ad:', error);
      alert('Error: ' + error.message);
    }
  };

  const rejectAd = async () => {
    if (!selectedAd || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    if (!confirm('Are you sure you want to reject this ad? All images/videos will be deleted.')) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/ads/${selectedAd.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to reject ad');
      alert('Ad rejected successfully!');
      setShowRejectModal(false);
      loadPendingAds();
    } catch (error: any) {
      console.error('Error rejecting ad:', error);
      alert('Error: ' + error.message);
    }
  };

  // Stats calculations
  const stats = {
    total: allRequests.length,
    pending: allRequests.filter(r => r.status === 'pending').length,
    inProgress: allRequests.filter(r => r.status === 'in-progress').length,
    completed: allRequests.filter(r => r.status === 'completed').length
  };

  const adsStats = {
    total: allAds.length,
    pending: allAds.filter(a => a.status === 'pending').length,
    approved: allAds.filter(a => a.status === 'approved').length,
    rejected: allAds.filter(a => a.status === 'rejected').length
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Palette className="w-6 h-6 text-pink-600" />
                  {currentTab === 'design-requests' ? 'Design Requests Dashboard' : 
                   currentTab === 'ads-pending' ? 'Ads Pending Approval' :
                   currentTab === 'designer-passwords' ? 'Designer Management' :
                   'Received Designs'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {currentTab === 'design-requests' 
                    ? 'Manage ad design requests submitted by users from mobile app'
                    : currentTab === 'ads-pending'
                    ? 'Review and approve/reject ads submitted by users'
                    : currentTab === 'designer-passwords'
                    ? 'Create and manage designer login credentials'
                    : 'Review designs uploaded by designers and send to users for approval'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleTabChange('design-requests')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentTab === 'design-requests' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Palette className="w-4 h-4 inline mr-2" />
                Design Requests
              </button>
              <button
                onClick={() => handleTabChange('ads-pending')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentTab === 'ads-pending' 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ImageIcon className="w-4 h-4 inline mr-2" />
                Ads - Pending
              </button>
              <button
                onClick={() => handleTabChange('designer-passwords')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentTab === 'designer-passwords' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Key className="w-4 h-4 inline mr-2" />
                Designer Passwords
              </button>
              <button
                onClick={() => handleTabChange('received-designs')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentTab === 'received-designs' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Inbox className="w-4 h-4 inline mr-2" />
                Received Designs
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Design Requests Tab */}
        {currentTab === 'design-requests' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <List className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-gray-600">Total Requests</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-8 h-8 text-cyan-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.inProgress}</p>
                    <p className="text-sm text-gray-600">In Progress</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-sm text-gray-600">Completed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Status</label>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">All Status</option>
                    <option value="pending" className="text-gray-900">Pending</option>
                    <option value="in-progress" className="text-gray-900">In Progress</option>
                    <option value="completed" className="text-gray-900">Completed</option>
                    <option value="cancelled" className="text-gray-900">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Ad Type</label>
                  <select 
                    value={adTypeFilter} 
                    onChange={(e) => setAdTypeFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">All Types</option>
                    <option value="image" className="text-gray-900">Image</option>
                    <option value="video" className="text-gray-900">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Channel Type</label>
                  <select 
                    value={channelTypeFilter} 
                    onChange={(e) => setChannelTypeFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">All Channels</option>
                    <option value="withChannel" className="text-gray-900">With Channel</option>
                    <option value="withoutChannel" className="text-gray-900">Without Channel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, business..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={loadDesignRequests}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
                <button 
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-gray-800 font-medium"
                >
                  <X className="w-4 h-4" /> Clear Filters
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">Loading design requests...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredRequests.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Palette className="w-16 h-16 text-gray-300 mx-auto" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Design Requests Found</h3>
                <p className="text-gray-600">There are no design requests matching your filters.</p>
              </div>
            )}

            {/* Requests List */}
            {!loading && filteredRequests.length > 0 && (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div 
                    key={request._id} 
                    className={`bg-white rounded-lg shadow overflow-hidden border-l-4 transition-all duration-300 ${
                      request.status === 'pending' ? 'border-yellow-500' :
                      request.status === 'in-progress' ? 'border-cyan-500' :
                      request.status === 'completed' ? 'border-green-500' :
                      'border-red-500'
                    }`}
                  >
                    {/* Accordion Header - Always Visible */}
                    <div 
                      onClick={() => toggleAccordion(request._id)}
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <User className="w-5 h-5 text-gray-600" />
                              <span className="font-semibold text-gray-900 text-lg">{request.uploaderName || 'N/A'}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(request.status)}`}>
                              {request.status.toUpperCase()}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              request.adType === 'image' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {request.adType === 'image' ? '📷 Image' : '🎬 Video'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              request.channelType === 'withChannel' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {request.channelType === 'withChannel' ? '📺 With Channel' : '🚫 Without Channel'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Phone className="w-4 h-4 text-gray-600" />
                            <span className="text-gray-700">{request.uploaderPhone || 'N/A'}</span>
                            <span className="text-gray-400 mx-2">•</span>
                            <Calendar className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-600">{new Date(request.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <svg 
                            className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${
                              expandedRequestId === request._id ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Accordion Body - Expanded Details */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ${
                        expandedRequestId === request._id ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-4 border-t space-y-4">
                        <div className="mb-3">
                          <p className="text-sm text-gray-500">Request ID: {request._id}</p>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              console.log('🔍 Design Request Data:', {
                                id: request._id,
                                gridFSImages: request.referenceImagesGridFS,
                                gridFSVideos: request.referenceVideosGridFS,
                                s3Images: request.referenceImagesS3,
                                s3Videos: request.referenceVideosS3,
                              });
                              setSelectedRequest(request); 
                              setShowDetailsModal(true); 
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" /> View Details
                          </button>
                          <button
                            onClick={(e) => { 
                              e.stopPropagation();
                              setSelectedRequest(request); 
                              setNewStatus(request.status);
                              setAdminNotes('');
                              setShowStatusModal(true); 
                            }}
                            className="px-3 py-1 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700 flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" /> Update Status
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareRequest(request);
                              setShowShareModal(true);
                              if (designers.length === 0) loadDesigners();
                            }}
                            className={`px-3 py-1 text-white text-sm rounded flex items-center gap-1 ${
                              request.assignedDesignerName
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                          >
                            <Send className="w-4 h-4" />
                            {request.assignedDesignerName
                              ? `Shared: ${request.assignedDesignerName}`
                              : 'Share to Designer'}
                          </button>
                        </div>

                        <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {request.businessName && (
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-700">Business:</span>
                            <span className="text-gray-900">{request.businessName}</span>
                          </div>
                        )}
                        {request.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-700">Email:</span>
                            <span className="text-gray-900">{request.email}</span>
                          </div>
                        )}
                        {((request.referenceImagesGridFS && request.referenceImagesGridFS.length > 0) ||
                   (request.referenceVideosGridFS && request.referenceVideosGridFS.length > 0) ||
                          (request.referenceImagesS3 && request.referenceImagesS3.length > 0) || 
                          (request.referenceVideosS3 && request.referenceVideosS3.length > 0)) && (
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-700">
                              {(request.referenceImagesGridFS?.length || 0) + (request.referenceVideosGridFS?.length || 0) + (request.referenceImagesS3?.length || 0) + (request.referenceVideosS3?.length || 0)} Media File(s)
                            </span>
                            <span className="text-xs text-gray-500">(Click View Details to see)</span>
                          </div>
                        )}
                      </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Ads Pending Tab */}
        {currentTab === 'ads-pending' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{adsStats.total}</p>
                    <p className="text-sm text-gray-600">Total Ads</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{adsStats.pending}</p>
                    <p className="text-sm text-gray-600">Pending Approval</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{adsStats.approved}</p>
                    <p className="text-sm text-gray-600">Approved</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{adsStats.rejected}</p>
                    <p className="text-sm text-gray-600">Rejected</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Status</label>
                  <select 
                    value={adsStatusFilter} 
                    onChange={(e) => setAdsStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">All Status</option>
                    <option value="pending" className="text-gray-900">Pending</option>
                    <option value="approved" className="text-gray-900">Approved</option>
                    <option value="rejected" className="text-gray-900">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Ad Type</label>
                  <select 
                    value={adsTypeFilter} 
                    onChange={(e) => setAdsTypeFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">All Types</option>
                    <option value="image" className="text-gray-900">Image</option>
                    <option value="video" className="text-gray-900">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Search</label>
                  <input
                    type="text"
                    value={adsSearchQuery}
                    onChange={(e) => setAdsSearchQuery(e.target.value)}
                    placeholder="Search by title, phone..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button 
                    onClick={loadPendingAds}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                  >
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                  <button 
                    onClick={clearAdsFilters}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-800 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
                <p className="mt-4 text-gray-600">Loading ads...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredAds.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Ads Found</h3>
                <p className="text-gray-600">There are no ads matching your filters.</p>
              </div>
            )}

            {/* Ads List */}
            {!loading && filteredAds.length > 0 && (
              <div className="space-y-4">
                {filteredAds.map((ad) => (
                  <div key={ad.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{ad.title}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(ad.status)}`}>
                            {ad.status.toUpperCase()}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">
                            {(ad.adType || 'image').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mt-2">
                          <Phone className="w-4 h-4 inline mr-1" /> {ad.phoneNumber} | 
                          <User className="w-4 h-4 inline mx-1" /> {ad.uploaderName || 'Unknown'} |
                          <Calendar className="w-4 h-4 inline mx-1" /> {new Date(ad.startDate).toLocaleDateString()} - {new Date(ad.endDate).toLocaleDateString()}
                        </p>
                        {ad.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                            <strong>Rejected:</strong> {ad.rejectionReason}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 mt-4 md:mt-0 md:ml-4">
                        <button
                          onClick={() => { setSelectedAd(ad); setShowAdDetailsModal(true); }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4 inline mr-1" /> View Details
                        </button>
                        {ad.status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setSelectedAd(ad); setApprovePriority(ad.priority || 5); setShowApproveModal(true); }}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 inline mr-1" /> Approve
                            </button>
                            <button
                              onClick={() => { setSelectedAd(ad); setRejectionReason(''); setShowRejectModal(true); }}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                              <XCircle className="w-4 h-4 inline mr-1" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Designer Passwords Tab */}
        {currentTab === 'designer-passwords' && (
          <>
            {/* Create Designer Form */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                Create Designer Account
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Username *</label>
                  <input
                    type="text"
                    value={designerUsername}
                    onChange={(e) => setDesignerUsername(e.target.value)}
                    placeholder="e.g., designer_john"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showDesignerPassword ? 'text' : 'password'}
                      value={designerPassword}
                      onChange={(e) => setDesignerPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-gray-900 placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDesignerPassword(!showDesignerPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showDesignerPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={createDesigner}
                  disabled={!designerUsername || !designerPassword}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  <UserPlus className="w-4 h-4" /> Create Designer
                </button>
              </div>
            </div>

            {/* Designers List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  Registered Designers ({designers.length})
                </h3>
                <button
                  onClick={loadDesigners}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              </div>

              {loading && (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
                  <p className="mt-4 text-gray-600">Loading designers...</p>
                </div>
              )}

              {!loading && designers.length === 0 && (
                <div className="text-center py-12">
                  <Key className="w-16 h-16 text-gray-300 mx-auto" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Designers Yet</h3>
                  <p className="text-gray-600">Create a designer account above to get started.</p>
                </div>
              )}

              {!loading && designers.length > 0 && (
                <div className="divide-y">
                  {designers.map((designer) => (
                    <div key={designer.id} className="p-4 hover:bg-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-purple-600" />
                          <span className="font-semibold text-gray-900">{designer.name || designer.username}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            designer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {designer.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> {designer.username}</span>
                          {designer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {designer.email}</span>}
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Created: {new Date(designer.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Assigned: {designer.assignedRequests} requests | Completed: {designer.completedRequests}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => alert(`Reset password for ${designer.username}`)}
                          className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 flex items-center gap-1"
                        >
                          <Key className="w-4 h-4" /> Reset Password
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete designer "${designer.username}"?`)) {
                              try {
                                const response = await fetch(`${API_BASE}/api/admin/designers/${designer.id || designer._id}`, {
                                  method: 'DELETE',
                                });
                                if (response.ok) {
                                  alert(`Designer ${designer.username} deleted successfully!`);
                                  loadDesigners();
                                } else {
                                  const data = await response.json().catch(() => ({}));
                                  alert(data.message || 'Failed to delete designer');
                                }
                              } catch (err) {
                                console.error('Error deleting designer:', err);
                                alert('Failed to delete designer. Please try again.');
                              }
                            }
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Received Designs Tab */}
        {currentTab === 'received-designs' && (
          <>
            {/* Search & Refresh */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Search</label>
                  <input
                    type="text"
                    value={receivedDesignsSearch}
                    onChange={(e) => setReceivedDesignsSearch(e.target.value)}
                    placeholder="Search by designer, user, business..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadReceivedDesigns}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
                  >
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto" />
                <p className="mt-4 text-gray-600">Loading received designs...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredReceivedDesigns.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Inbox className="w-16 h-16 text-gray-300 mx-auto" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Designs Received</h3>
                <p className="text-gray-600">Designs uploaded by designers will appear here for review.</p>
              </div>
            )}

            {/* Designs List */}
            {!loading && filteredReceivedDesigns.length > 0 && (
              <div className="space-y-4">
                {filteredReceivedDesigns.map((design) => (
                  <div key={design.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-400">
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span className="font-semibold text-gray-900 text-lg flex items-center gap-1">
                            <FileImage className="w-5 h-5 text-indigo-600" />
                            Design from {design.designerName}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            design.adType === 'image' ? 'bg-indigo-100 text-indigo-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {design.adType === 'image' ? '📷 Image' : '🎬 Video'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <p className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">For User:</span> {design.uploaderName} ({design.uploaderPhone})
                          </p>
                          {design.businessName && (
                            <p className="flex items-center gap-1">
                              <Building className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">Business:</span> {design.businessName}
                            </p>
                          )}
                          <p className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">Uploaded:</span> {new Date(design.uploadedAt).toLocaleString()}
                          </p>
                          {design.designFiles.length > 0 && (
                            <p className="flex items-center gap-1">
                              <ImageIcon className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-blue-700">{design.designFiles.length} Design File(s)</span>
                            </p>
                          )}
                        </div>
                        {design.designerNotes && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                            <strong>Designer Notes:</strong> {design.designerNotes}
                          </div>
                        )}

                        {/* User Approval Status Badge */}
                        {(design.status === 'sent-to-user' || design.status === 'user-approved' || design.status === 'user-rejected' || design.status === 'changes-requested') && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                              design.status === 'user-approved' ? 'bg-green-100 text-green-800 border border-green-300' :
                              (design.status === 'user-rejected' || design.status === 'changes-requested') ? 'bg-red-100 text-red-800 border border-red-300' :
                              'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {design.status === 'user-approved' ? '✅ Approved by User' :
                               (design.status === 'user-rejected' || design.status === 'changes-requested') ? '🔄 Changes Requested by User' :
                               '📨 Sent to User (Awaiting Response)'}
                            </span>
                          </div>
                        )}

                        {/* User Feedback Message */}
                        {design.userFeedback && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                            <strong className="text-red-700 flex items-center gap-1">💬 User Feedback:</strong>
                            <p className="text-red-600 mt-1">{design.userFeedback}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 mt-4 md:mt-0 md:ml-4">
                        <button
                          onClick={() => { setSelectedDesign(design); setShowDesignPreviewModal(true); }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" /> Preview
                        </button>
                        <button
                          onClick={() => { setSelectedDesign(design); setSendToUserMessage(''); setShowSendToUserModal(true); }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
                        >
                          <Send className="w-4 h-4" /> Send to User
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-white">
              <h2 className="text-xl font-bold text-gray-900">Design Request Details</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <p className="text-gray-900"><strong className="text-gray-700">ID:</strong> {selectedRequest._id}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Status:</strong> <span className={`px-2 py-1 rounded ${getStatusBadgeColor(selectedRequest.status)}`}>{selectedRequest.status}</span></p>
                <p className="text-gray-900"><strong className="text-gray-700">Uploader Name:</strong> {selectedRequest.uploaderName || 'N/A'}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Phone:</strong> {selectedRequest.uploaderPhone || 'N/A'}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Business Name:</strong> {selectedRequest.businessName || 'N/A'}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Email:</strong> {selectedRequest.email || 'N/A'}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Business Phone:</strong> {selectedRequest.phoneNumber || 'N/A'}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Ad Type:</strong> {selectedRequest.adType}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Channel Type:</strong> {selectedRequest.channelType}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Created:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
              </div>
              {selectedRequest.adText && <p className="text-gray-900"><strong className="text-gray-700">Ad Text:</strong> {selectedRequest.adText}</p>}
              {selectedRequest.businessAddress && <p className="text-gray-900"><strong className="text-gray-700">Address:</strong> {selectedRequest.businessAddress}</p>}
              {selectedRequest.webLinks && selectedRequest.webLinks.length > 0 && (
                <div className="text-gray-900">
                  <strong className="text-gray-700">Web Links:</strong>
                  <ul className="list-disc ml-6">
                    {selectedRequest.webLinks.map((link, i) => (
                      <li key={i}><a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{link}</a></li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Media Files */}
              {((selectedRequest.referenceImagesGridFS && selectedRequest.referenceImagesGridFS.length > 0) ||
                (selectedRequest.referenceVideosGridFS && selectedRequest.referenceVideosGridFS.length > 0) ||
                (selectedRequest.referenceImagesS3 && selectedRequest.referenceImagesS3.length > 0) ||
                (selectedRequest.referenceVideosS3 && selectedRequest.referenceVideosS3.length > 0)) && (
                <div className="mt-4">
                  <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-gray-700" /> Media Files:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {/* GridFS Images */}
                    {selectedRequest.referenceImagesGridFS?.map((imgId, index) => (
                      <div 
                        key={imgId}
                        onClick={(e) => { e.stopPropagation(); setMediaUrl(`${API_BASE}/api/channel-partner/ads/image/${imgId}`); setShowImageModal(true); }}
                        className="w-32 h-32 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition border-2 border-gray-200 hover:border-blue-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={`${API_BASE}/api/channel-partner/ads/image/${imgId}`}
                          alt={`Reference ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('❌ Failed to load GridFS image:', imgId);
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="12">Image Not Found</text></svg>';
                          }}
                        />
                      </div>
                    ))}
                    {/* S3 Images */}
                    {selectedRequest.referenceImagesS3?.map((img, index) => (
                      <div 
                        key={img.key}
                        onClick={(e) => { e.stopPropagation(); setMediaUrl(img.url); setShowImageModal(true); }}
                        className="w-32 h-32 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition border-2 border-gray-200 hover:border-blue-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={img.url}
                          alt={`S3 Reference ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {/* GridFS Videos */}
                    {selectedRequest.referenceVideosGridFS?.map((vidId) => (
                      <div 
                        key={vidId}
                        onClick={(e) => { e.stopPropagation(); setMediaUrl(`${API_BASE}/api/channel-partner/ads/video/${vidId}`); setShowVideoModal(true); }}
                        className="w-32 h-32 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition bg-gray-800 flex items-center justify-center relative border-2 border-gray-200 hover:border-blue-500"
                      >
                        <Play className="w-12 h-12 text-white" />
                        <span className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">Video</span>
                      </div>
                    ))}
                    {/* S3 Videos */}
                    {selectedRequest.referenceVideosS3?.map((vid, index) => (
                      <div 
                        key={vid.key}
                        onClick={(e) => { e.stopPropagation(); setMediaUrl(vid.url); setShowVideoModal(true); }}
                        className="w-32 h-32 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition bg-gray-800 flex items-center justify-center relative border-2 border-gray-200 hover:border-blue-500"
                      >
                        <Play className="w-12 h-12 text-white" />
                        <span className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">S3 Video</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedRequest.adminNotes && <p className="text-gray-900"><strong className="text-gray-700">Admin Notes:</strong> {selectedRequest.adminNotes}</p>}
            </div>
            <div className="p-4 border-t flex justify-end bg-gray-50">
              <button onClick={() => setShowDetailsModal(false)} className="px-6 py-2.5 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 shadow-md transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-900">Update Status</h2>
              <button 
                onClick={() => setShowStatusModal(false)} 
                className="text-white bg-gray-700 hover:bg-red-600 border-2 border-gray-800 p-2 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg"
                aria-label="Close"
              >
                <X className="w-6 h-6 font-bold" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select 
                  value={newStatus} 
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this update..."
                  className="w-full border rounded-lg px-3 py-2 h-32 text-gray-900"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setShowStatusModal(false)} className="px-6 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 shadow-md transition-colors">Cancel</button>
              <button onClick={updateRequestStatus} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-md transition-colors">Update Status</button>
            </div>
          </div>
        </div>
      )}

      {/* Share to Designer Modal */}
      {showShareModal && shareRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Share to Designer</h3>
                <p className="text-sm text-gray-500 mt-1">Select a designer to assign this request</p>
              </div>
              <button onClick={() => { setShowShareModal(false); setShareRequest(null); setSelectedDesignerId(null); setSelectedDesignerName(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Request info summary */}
            <div className="px-4 py-3 bg-gray-50 border-b">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-700">Request:</span>
                <span className="text-gray-600">{shareRequest.businessName || shareRequest.uploaderName || 'Unnamed'}</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${
                  shareRequest.adType === 'image' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {shareRequest.adType}
                </span>
              </div>
              {shareRequest.assignedDesignerName && (
                <div className="flex items-center gap-2 text-sm mt-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-700">Currently assigned to: <strong>{shareRequest.assignedDesignerName}</strong></span>
                </div>
              )}
            </div>

            {/* Designer list */}
            <div className="flex-1 overflow-y-auto p-4">
              {designers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>No designers found</p>
                  <p className="text-sm">Add designers in the Designer Passwords tab</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {designers.map((designer) => (
                    <button
                      key={designer.id}
                      disabled={assigningDesigner}
                      onClick={() => {
                        setSelectedDesignerId(designer.id);
                        setSelectedDesignerName(designer.username);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        selectedDesignerId === designer.id
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300'
                          : shareRequest.assignedDesignerId === designer.id
                            ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      } ${assigningDesigner ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{designer.username}</p>
                        {designer.name && <p className="text-sm text-gray-500">{designer.name}</p>}
                      </div>
                      {selectedDesignerId === designer.id && (
                        <CheckCircle className="w-5 h-5 text-purple-500" />
                      )}
                      {shareRequest.assignedDesignerId === designer.id && selectedDesignerId !== designer.id && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => { setShowShareModal(false); setShareRequest(null); setSelectedDesignerId(null); setSelectedDesignerName(''); }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                disabled={!selectedDesignerId || assigningDesigner}
                onClick={async () => {
                  if (!selectedDesignerId || !shareRequest) return;
                  setAssigningDesigner(true);
                  try {
                    const response = await fetch(
                      `${API_BASE}/api/channel-partner/ads/design-requests/${shareRequest._id}/assign`,
                      {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ designerId: selectedDesignerId, designerName: selectedDesignerName }),
                      }
                    );
                    if (response.ok) {
                      alert(`Request shared with ${selectedDesignerName} successfully!`);
                      setShowShareModal(false);
                      setShareRequest(null);
                      setSelectedDesignerId(null);
                      setSelectedDesignerName('');
                      loadDesignRequests();
                    } else {
                      const errData = await response.json().catch(() => ({}));
                      alert(errData.message || 'Failed to assign designer');
                    }
                  } catch (err) {
                    console.error('Failed to assign designer:', err);
                    alert('Failed to assign designer. Please try again.');
                  } finally {
                    setAssigningDesigner(false);
                  }
                }}
                className={`flex-1 px-4 py-2 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  selectedDesignerId && !assigningDesigner
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {assigningDesigner ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain" />
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowVideoModal(false)}>
          <video src={mediaUrl} controls autoPlay className="max-w-full max-h-[90vh]" />
        </div>
      )}

      {/* Approve Ad Modal */}
      {showApproveModal && selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b bg-green-600 text-white rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Approve Advertisement
              </h2>
              <button 
                onClick={() => setShowApproveModal(false)} 
                className="text-white bg-gray-800 hover:bg-red-600 border-2 border-white p-2 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg"
                aria-label="Close"
              >
                <X className="w-6 h-6 font-bold" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-blue-50 rounded text-blue-700 text-sm">
                ℹ️ Approving this ad will deduct 1200 credits from the user and publish the ad.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={approvePriority}
                  onChange={(e) => setApprovePriority(parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                />
                <p className="text-sm text-gray-500 mt-1">Higher priority ads are shown more frequently</p>
              </div>
              <div className="p-3 bg-gray-50 rounded text-gray-900">
                <p><strong className="text-gray-700">Title:</strong> {selectedAd.title}</p>
                <p><strong className="text-gray-700">Phone:</strong> {selectedAd.phoneNumber}</p>
                <p><strong className="text-gray-700">Type:</strong> {selectedAd.adType || 'image'}</p>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setShowApproveModal(false)} className="px-6 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 shadow-md transition-colors">Cancel</button>
              <button onClick={approveAd} className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 shadow-md transition-colors">Approve & Publish</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Ad Modal */}
      {showRejectModal && selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b bg-red-600 text-white rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Reject Advertisement
              </h2>
              <button 
                onClick={() => setShowRejectModal(false)} 
                className="text-white bg-gray-800 hover:bg-white hover:text-red-600 border-2 border-white hover:border-red-600 p-2 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg"
                aria-label="Close"
              >
                <X className="w-6 h-6 font-bold" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-yellow-50 rounded text-yellow-700 text-sm">
                ⚠️ Rejecting this ad will delete all associated images/videos and notify the user.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this ad is being rejected..."
                  className="w-full border rounded-lg px-3 py-2 h-32 text-gray-900"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">This message will be shown to the user</p>
              </div>
              <div className="p-3 bg-gray-50 rounded text-gray-900">
                <p><strong className="text-gray-700">Title:</strong> {selectedAd.title}</p>
                <p><strong className="text-gray-700">Phone:</strong> {selectedAd.phoneNumber}</p>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setShowRejectModal(false)} className="px-6 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 shadow-md transition-colors">Cancel</button>
              <button onClick={rejectAd} className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-md transition-colors">Reject Ad</button>
            </div>
          </div>
        </div>
      )}

      {/* Ad Details Modal */}
      {showAdDetailsModal && selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-900">Advertisement Details</h2>
              <button 
                onClick={() => setShowAdDetailsModal(false)} 
                className="text-white bg-gray-700 hover:bg-red-600 border-2 border-gray-800 p-2 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg"
                aria-label="Close"
              >
                <X className="w-6 h-6 font-bold" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <p className="text-gray-900"><strong className="text-gray-700">Title:</strong> {selectedAd.title}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Phone Number:</strong> {selectedAd.phoneNumber}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Uploader:</strong> {selectedAd.uploaderName || 'Unknown'}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Status:</strong> <span className={`px-2 py-1 rounded ${getStatusBadgeColor(selectedAd.status)}`}>{selectedAd.status}</span></p>
                <p className="text-gray-900"><strong className="text-gray-700">Ad Type:</strong> {selectedAd.adType || 'image'}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Priority:</strong> {selectedAd.priority || 1}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Start Date:</strong> {new Date(selectedAd.startDate).toLocaleString()}</p>
                <p className="text-gray-900"><strong className="text-gray-700">End Date:</strong> {new Date(selectedAd.endDate).toLocaleString()}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Created:</strong> {new Date(selectedAd.createdAt).toLocaleString()}</p>
                {selectedAd.approvedBy && <p className="text-gray-900"><strong className="text-gray-700">Approved By:</strong> {selectedAd.approvedBy}</p>}
                {selectedAd.rejectionReason && <p className="col-span-2 text-gray-900"><strong className="text-gray-700">Rejection Reason:</strong> {selectedAd.rejectionReason}</p>}
              </div>
              <hr className="my-4" />
              {/* Media */}
              {selectedAd.adType === 'video' ? (
                <div className="space-y-4">
                  {(selectedAd.bottomVideoS3Url || selectedAd.bottomVideoId) && (
                    <div>
                      <h6 className="font-medium mb-2 text-gray-900">Bottom Banner Video:</h6>
                      <video controls className="max-w-full">
                        <source src={selectedAd.bottomVideoS3Url || (selectedAd.bottomVideoId ? `${API_BASE}/api/channel-partner/ads/image/${selectedAd.bottomVideoId}` : "")} type="video/mp4" />
                      </video>
                    </div>
                  )}
                  {(selectedAd.fullscreenVideoS3Url || selectedAd.fullscreenVideoId) && (
                    <div>
                      <h6 className="font-medium mb-2 text-gray-900">Fullscreen Video:</h6>
                      <video controls className="max-w-full">
                        <source src={selectedAd.fullscreenVideoS3Url || (selectedAd.fullscreenVideoId ? `${API_BASE}/api/channel-partner/ads/image/${selectedAd.fullscreenVideoId}` : "")} type="video/mp4" />
                      </video>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {(selectedAd.bottomImageS3Url || selectedAd.hasBottomImage) && (
                    <div>
                      <h6 className="font-medium mb-2 text-gray-900">Bottom Banner Image:</h6>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedAd.bottomImageS3Url || (selectedAd.bottomImageId ? `${API_BASE}/api/channel-partner/ads/image/${selectedAd.bottomImageId}` : "")} alt="Bottom Banner" className="max-w-full" />
                    </div>
                  )}
                  {(selectedAd.fullscreenImageS3Url || selectedAd.hasFullscreenImage) && (
                    <div>
                      <h6 className="font-medium mb-2 text-gray-900">Fullscreen Image:</h6>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedAd.fullscreenImageS3Url || (selectedAd.fullscreenImageId ? `${API_BASE}/api/channel-partner/ads/image/${selectedAd.fullscreenImageId}` : "")} alt="Fullscreen" className="max-w-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end bg-gray-50">
              <button onClick={() => setShowAdDetailsModal(false)} className="px-6 py-2.5 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 shadow-md transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Design Preview Modal */}
      {showDesignPreviewModal && selectedDesign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-indigo-600 text-white rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileImage className="w-5 h-5" /> Design Preview
              </h2>
              <button
                onClick={() => setShowDesignPreviewModal(false)}
                className="text-white bg-gray-800 hover:bg-red-600 border-2 border-white p-2 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg"
                aria-label="Close"
              >
                <X className="w-6 h-6 font-bold" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <p className="text-gray-900"><strong className="text-gray-700">Designer:</strong> {selectedDesign.designerName}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Status:</strong> <span className={`px-2 py-1 rounded ${getDesignStatusColor(selectedDesign.status)}`}>{selectedDesign.status.replace(/-/g, ' ')}</span></p>
                <p className="text-gray-900"><strong className="text-gray-700">For User:</strong> {selectedDesign.uploaderName}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Phone:</strong> {selectedDesign.uploaderPhone}</p>
                {selectedDesign.businessName && <p className="text-gray-900"><strong className="text-gray-700">Business:</strong> {selectedDesign.businessName}</p>}
                <p className="text-gray-900"><strong className="text-gray-700">Ad Type:</strong> {selectedDesign.adType}</p>
                <p className="text-gray-900"><strong className="text-gray-700">Uploaded:</strong> {new Date(selectedDesign.uploadedAt).toLocaleString()}</p>
                {selectedDesign.sentToUserAt && <p className="text-gray-900"><strong className="text-gray-700">Sent to user:</strong> {new Date(selectedDesign.sentToUserAt).toLocaleString()}</p>}
              </div>
              {selectedDesign.designerNotes && (
                <div className="p-3 bg-blue-50 rounded text-blue-700">
                  <strong>Designer Notes:</strong> {selectedDesign.designerNotes}
                </div>
              )}
              {selectedDesign.adminFeedback && (
                <div className="p-3 bg-purple-50 rounded text-purple-700">
                  <strong>Admin Feedback:</strong> {selectedDesign.adminFeedback}
                </div>
              )}
              {selectedDesign.userFeedback && (
                <div className="p-3 bg-orange-50 rounded text-orange-700">
                  <strong>User Feedback:</strong> {selectedDesign.userFeedback}
                </div>
              )}
              {/* Design Files */}
              {selectedDesign.designFiles.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-gray-700" /> Design Files ({selectedDesign.designFiles.length}):
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {selectedDesign.designFiles.map((file, index) => (
                      <div key={index} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                        {file.type === 'image' ? (
                          <div
                            onClick={() => { setMediaUrl(file.url); setShowImageModal(true); }}
                            className="w-48 h-48 cursor-pointer hover:opacity-80 transition"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div
                            onClick={() => { setMediaUrl(file.url); setShowVideoModal(true); }}
                            className="w-48 h-48 bg-gray-800 flex items-center justify-center cursor-pointer hover:opacity-80 transition relative"
                          >
                            <Play className="w-12 h-12 text-white" />
                            <span className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">Video</span>
                          </div>
                        )}
                        <p className="p-2 text-xs text-gray-600 text-center truncate">{file.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
              {(selectedDesign.status === 'new' || selectedDesign.status === 'reviewed' || selectedDesign.status === 'changes-requested') && (
                <button
                  onClick={() => { setShowDesignPreviewModal(false); setSendToUserMessage(''); setShowSendToUserModal(true); }}
                  className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 shadow-md transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send to User
                </button>
              )}
              <button onClick={() => setShowDesignPreviewModal(false)} className="px-6 py-2.5 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 shadow-md transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Design to User Modal */}
      {showSendToUserModal && selectedDesign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 border-b bg-green-600 text-white rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Send className="w-5 h-5" /> Send Design to User
              </h2>
              <button
                onClick={() => setShowSendToUserModal(false)}
                className="text-white bg-gray-800 hover:bg-red-600 border-2 border-white p-2 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg"
                aria-label="Close"
              >
                <X className="w-6 h-6 font-bold" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-blue-50 rounded text-blue-700 text-sm">
                ℹ️ This will send the design to <strong>{selectedDesign.uploaderName}</strong> ({selectedDesign.uploaderPhone}) for their approval. They can approve or request changes from the mobile app.
              </div>
              <div className="p-3 bg-gray-50 rounded text-gray-900">
                <p><strong className="text-gray-700">Designer:</strong> {selectedDesign.designerName}</p>
                <p><strong className="text-gray-700">Design Files:</strong> {selectedDesign.designFiles.length} file(s)</p>
                <p><strong className="text-gray-700">Ad Type:</strong> {selectedDesign.adType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message to User (Optional)</label>
                <textarea
                  value={sendToUserMessage}
                  onChange={(e) => setSendToUserMessage(e.target.value)}
                  placeholder="Add a message for the user about this design..."
                  className="w-full border rounded-lg px-3 py-2 h-24 text-gray-900"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setShowSendToUserModal(false)} className="px-6 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 shadow-md transition-colors">Cancel</button>
              <button onClick={sendDesignToUser} className="px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 shadow-md transition-colors flex items-center gap-2">
                <Send className="w-4 h-4" /> Send for Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DesignRequestPage() {
  return (
    <AuthGuard>
      <DesignRequestContent />
    </AuthGuard>
  );
}
