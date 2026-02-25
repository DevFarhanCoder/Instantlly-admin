'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  RefreshCw,
  Loader2,
  Plus,
  Check,
  X,
  FolderPlus,
  Tag,
  Users,
  Clock,
  Filter,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../components/AuthGuard';
import { api } from '../lib/api';

interface CustomService {
  _id: string;
  serviceName: string;
  addedBy: string;
  userName: string;
  cardId: string;
  parentCategory: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAs?: {
    type: string;
    categoryName: string;
  };
  approvedAt?: string;
  createdAt: string;
}

interface Category {
  _id: string;
  name: string;
  icon: string;
  subcategories: string[];
  isActive: boolean;
  order: number;
}

function CustomCategoriesContent() {
  const router = useRouter();
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [total, setTotal] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    service: CustomService | null;
    mode: 'category' | 'subcategory' | null;
  }>({ open: false, service: null, mode: null });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📁');
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-suggest an icon based on category/service name
  const suggestIcon = (name: string): string => {
    const n = name.toLowerCase();
    // Plumbing & pipes
    if (n.includes('plumb') || n.includes('pipe') || n.includes('tap') || n.includes('sanit')) return '🔧';
    // Carpentry & woodwork
    if (n.includes('carpent') || n.includes('wood') || n.includes('furniture') || n.includes('cabinet')) return '🪚';
    // Electrician & wiring
    if (n.includes('electric') || n.includes('wiring') || n.includes('power') || n.includes('solar') || n.includes('energy')) return '⚡';
    // Painting & wall
    if (n.includes('paint') && (n.includes('wall') || n.includes('house') || n.includes('contract'))) return '🖌️';
    // Music & audio
    if (n.includes('music') || n.includes('audio') || n.includes('sing') || n.includes('instrument') || n.includes('band') || n.includes('dj')) return '🎵';
    // School & academy
    if (n.includes('school') || n.includes('academy') || n.includes('institute')) return '🏫';
    // Food & restaurant
    if (n.includes('food') || n.includes('restaurant') || n.includes('cook') || n.includes('kitchen') || n.includes('cafe') || n.includes('bakery') || n.includes('cake') || n.includes('sweet') || n.includes('catering')) return '🍔';
    // Sports & fitness
    if (n.includes('sport') || n.includes('gym') || n.includes('fitness') || n.includes('cricket') || n.includes('football') || n.includes('badminton') || n.includes('tennis') || n.includes('swim')) return '⚽';
    // Art & design
    if (n.includes('art') || n.includes('design') || n.includes('craft') || n.includes('drawing') || n.includes('sketch')) return '🎨';
    // Photography & video
    if (n.includes('photo') || n.includes('camera') || n.includes('video') || n.includes('studio') || n.includes('film')) return '📷';
    // Pets & animals
    if (n.includes('pet') || n.includes('animal') || n.includes('vet') || n.includes('dog') || n.includes('cat ') || n.includes('bird')) return '🐾';
    // Beauty & salon
    if (n.includes('beauty') || n.includes('salon') || n.includes('spa') || n.includes('makeup') || n.includes('parlour') || n.includes('parlor') || n.includes('hair') || n.includes('barber')) return '💇';
    // Legal & law
    if (n.includes('legal') || n.includes('law') || n.includes('advocate') || n.includes('court') || n.includes('notary')) return '⚖️';
    // Finance & banking
    if (n.includes('finance') || n.includes('bank') || n.includes('loan') || n.includes('account') || n.includes('ca ') || n.includes('chartered')) return '🏦';
    // Insurance
    if (n.includes('insurance')) return '🛡️';
    // Real estate & property
    if (n.includes('real estate') || n.includes('property') || n.includes('apartment') || n.includes('flat') || n.includes('plot') || n.includes('broker')) return '🏠';
    // Agriculture & farming
    if (n.includes('farm') || n.includes('agriculture') || n.includes('garden') || n.includes('nursery') || n.includes('plant') || n.includes('seed')) return '🌾';
    // Logistics & transport
    if (n.includes('logistic') || n.includes('transport') || n.includes('delivery') || n.includes('courier') || n.includes('packer') || n.includes('mover') || n.includes('cargo') || n.includes('freight')) return '🚚';
    // Marketing & advertising
    if (n.includes('market') || n.includes('advertis') || n.includes('promo') || n.includes('seo') || n.includes('social media') || n.includes('digital')) return '📢';
    // Consulting
    if (n.includes('consult')) return '🤝';
    // Entertainment & movies
    if (n.includes('entertain') || n.includes('movie') || n.includes('theatre') || n.includes('drama') || n.includes('comedy') || n.includes('magic')) return '🎬';
    // Automotive & vehicles
    if (n.includes('car ') || n.includes('auto') || n.includes('vehicle') || n.includes('motor') || n.includes('bike') || n.includes('mechanic') || n.includes('garage') || n.includes('tyre') || n.includes('tire')) return '🚗';
    // Fashion & tailoring
    if (n.includes('cloth') || n.includes('fashion') || n.includes('textile') || n.includes('tailor') || n.includes('boutique') || n.includes('stitch') || n.includes('embroid')) return '👗';
    // Doctor & medical
    if (n.includes('doctor') || n.includes('hospital') || n.includes('clinic') || n.includes('medic') || n.includes('health') || n.includes('dentist') || n.includes('physio') || n.includes('surgeon') || n.includes('pharma') || n.includes('ayurved') || n.includes('homeo')) return '⚕️';
    // Travel & tourism
    if (n.includes('travel') || n.includes('tour') || n.includes('flight') || n.includes('hotel') || n.includes('resort') || n.includes('hostel') || n.includes('visa') || n.includes('passport')) return '✈️';
    // Technology & IT
    if (n.includes('tech') || n.includes('computer') || n.includes('software') || n.includes('web') || n.includes('app ') || n.includes('mobile') || n.includes('cctv') || n.includes('laptop') || n.includes('repair')) return '💻';
    // Construction & building
    if (n.includes('build') || n.includes('construct') || n.includes('architect') || n.includes('cement') || n.includes('concrete') || n.includes('masonry') || n.includes('brick') || n.includes('civil')) return '🔨';
    // Dance
    if (n.includes('dance') || n.includes('choreograph')) return '💃';
    // Yoga & wellness
    if (n.includes('yoga') || n.includes('meditation') || n.includes('wellness') || n.includes('ayush')) return '🧘';
    // Cleaning & housekeeping
    if (n.includes('clean') || n.includes('laundry') || n.includes('wash') || n.includes('housekeep') || n.includes('pest') || n.includes('dry clean')) return '🧹';
    // Trading & stocks
    if (n.includes('trad') || n.includes('stock') || n.includes('invest') || n.includes('share') || n.includes('mutual fund')) return '📈';
    // Events & weddings
    if (n.includes('event') || n.includes('wedding') || n.includes('party') || n.includes('caterer') || n.includes('decoration') || n.includes('tent') || n.includes('mandap')) return '🎉';
    // Books & education
    if (n.includes('book') || n.includes('library') || n.includes('publish') || n.includes('stationery')) return '📚';
    // Tutoring & coaching
    if (n.includes('tutor') || n.includes('coach') || n.includes('teach') || n.includes('education') || n.includes('class') || n.includes('training') || n.includes('learn')) return '🎓';
    // Childcare
    if (n.includes('child') || n.includes('baby') || n.includes('kid') || n.includes('creche') || n.includes('play group') || n.includes('daycare')) return '🧒';
    // Grocery & daily needs
    if (n.includes('grocer') || n.includes('kirana') || n.includes('supermarket') || n.includes('general store') || n.includes('daily need')) return '🛒';
    // Jewellery & gold
    if (n.includes('jewel') || n.includes('gold') || n.includes('silver') || n.includes('diamond') || n.includes('ornament')) return '💎';
    // Printing & press
    if (n.includes('print') || n.includes('press') || n.includes('banner') || n.includes('flex') || n.includes('signage')) return '🖨️';
    // AC & appliance repair
    if (n.includes('ac ') || n.includes('air condition') || n.includes('hvac') || n.includes('refrig') || n.includes('fridge') || n.includes('appliance')) return '❄️';
    // Security & guards
    if (n.includes('security') || n.includes('guard') || n.includes('safe') || n.includes('cctv') || n.includes('surveillance')) return '🛡️';
    // Religious & spiritual
    if (n.includes('temple') || n.includes('church') || n.includes('mosque') || n.includes('pandit') || n.includes('puja') || n.includes('astrol') || n.includes('relig') || n.includes('spiritual')) return '🙏';
    // Water & tanker
    if (n.includes('water') || n.includes('tanker') || n.includes('borewell') || n.includes('ro ') || n.includes('purif')) return '💧';
    // Home & interior
    if (n.includes('home') || n.includes('house') || n.includes('interior') || n.includes('decor') || n.includes('curtain') || n.includes('modular')) return '🏡';
    // Taxi & cab
    if (n.includes('taxi') || n.includes('cab') || n.includes('uber') || n.includes('ola') || n.includes('ride')) return '🚕';
    // Welding & metal
    if (n.includes('weld') || n.includes('metal') || n.includes('iron') || n.includes('steel') || n.includes('fabricat') || n.includes('gate') || n.includes('grill')) return '⚙️';
    // Tools & repair (general)
    if (n.includes('repair') || n.includes('service') || n.includes('fix') || n.includes('maintenance') || n.includes('tool')) return '🔧';
    return '📁';
  };

  // Open action modal with auto-suggested icon
  const openActionModal = (service: CustomService, mode: 'category' | 'subcategory') => {
    setNewCategoryIcon(suggestIcon(service.serviceName));
    setNewCategoryName('');
    setSelectedCategoryId('');
    setActionModal({ open: true, service, mode });
  };

  // Fetch custom services
  const fetchCustomServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.get(`/api/categories/admin/custom-services?status=${statusFilter}&limit=100`);
      if (result.success) {
        setCustomServices(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (err: any) {
      console.error('Error fetching custom services:', err);
      setError(err.message || 'Failed to fetch custom services');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const result = await api.get('/api/categories/admin/all');
      if (result.success) {
        setCategories(result.data || []);
        if (result.data && result.data.length > 0) {
          setSeeded(true);
        }
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchCustomServices();
    fetchCategories();
  }, [fetchCustomServices, fetchCategories]);

  // Seed initial categories
  const handleSeed = async () => {
    try {
      setSeeding(true);
      const result = await api.post('/api/categories/admin/seed');
      if (result.success) {
        alert(`✅ ${result.message}`);
        setSeeded(true);
        await fetchCategories();
      }
    } catch (err: any) {
      alert(`❌ Failed to seed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  // Approve as category or subcategory
  const handleApprove = async () => {
    if (!actionModal.service || !actionModal.mode) return;

    try {
      setActionLoading(true);
      const body: any = { approveAs: actionModal.mode };

      if (actionModal.mode === 'subcategory') {
        if (!selectedCategoryId) {
          alert('Please select a category');
          setActionLoading(false);
          return;
        }
        body.categoryId = selectedCategoryId;
      } else {
        // Creating as new category
        body.newCategoryName = newCategoryName || actionModal.service.serviceName;
        body.newCategoryIcon = newCategoryIcon;
      }

      const result = await api.put(`/api/categories/admin/approve-custom/${actionModal.service._id}`, body);
      if (result.success) {
        alert(`✅ "${actionModal.service.serviceName}" approved as ${actionModal.mode}!`);
        setActionModal({ open: false, service: null, mode: null });
        setSelectedCategoryId('');
        setNewCategoryName('');
        setNewCategoryIcon('📁');
        await Promise.all([fetchCustomServices(), fetchCategories()]);
      }
    } catch (err: any) {
      alert(`❌ Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject custom service
  const handleReject = async (service: CustomService) => {
    if (!confirm(`Reject "${service.serviceName}"?`)) return;
    try {
      await api.put(`/api/categories/admin/reject-custom/${service._id}`);
      await fetchCustomServices();
    } catch (err: any) {
      alert(`❌ Failed: ${err.message}`);
    }
  };

  // Delete custom service
  const handleDelete = async (service: CustomService) => {
    if (!confirm(`Delete "${service.serviceName}" permanently?`)) return;
    try {
      await api.delete(`/api/categories/admin/custom-service/${service._id}`);
      await fetchCustomServices();
    } catch (err: any) {
      alert(`❌ Failed: ${err.message}`);
    }
  };

  // Delete an entire category
  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Delete category "${category.name}" and all its subcategories? This cannot be undone.`)) return;
    try {
      const result = await api.delete(`/api/categories/admin/category/${category._id}`);
      if (result.success) {
        alert(`✅ Category "${category.name}" deleted`);
        await fetchCategories();
      }
    } catch (err: any) {
      alert(`❌ Failed: ${err.message}`);
    }
  };

  // Delete a subcategory from a category
  const handleDeleteSubcategory = async (category: Category, subcategoryName: string) => {
    if (!confirm(`Remove "${subcategoryName}" from "${category.name}"?`)) return;
    try {
      const result = await api.delete(`/api/categories/admin/category/${category._id}/subcategory/${encodeURIComponent(subcategoryName)}`);
      if (result.success) {
        await fetchCategories();
      }
    } catch (err: any) {
      alert(`❌ Failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Custom Categories</h1>
                <p className="text-sm text-gray-500">Manage custom services added by users</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!seeded && (
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                  Seed Categories
                </button>
              )}
              <button
                onClick={() => { fetchCustomServices(); fetchCategories(); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-sm text-gray-500">Custom Services ({statusFilter})</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FolderPlus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
                <p className="text-sm text-gray-500">Total Categories</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Tag className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {categories.reduce((sum, c) => sum + c.subcategories.length, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Subcategories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading custom services...</span>
          </div>
        ) : customServices.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <FolderPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Custom Services</h3>
            <p className="text-gray-500">
              {statusFilter === 'pending'
                ? 'No pending custom services from users yet.'
                : `No ${statusFilter} custom services found.`}
            </p>
          </div>
        ) : (
          /* Custom Services List */
          <div className="space-y-3">
            {customServices.map((service) => (
              <div
                key={service._id}
                className="bg-white rounded-xl shadow p-5 hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold text-gray-900">
                        {service.serviceName}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          service.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : service.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {service.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {service.userName || service.addedBy}
                      </span>
                      {service.parentCategory && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          From: {service.parentCategory}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(service.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {service.status === 'approved' && service.approvedAs && (
                      <p className="mt-1 text-xs text-green-600">
                        ✅ Added as {service.approvedAs.type}
                        {service.approvedAs.categoryName ? ` → ${service.approvedAs.categoryName}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  {service.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          openActionModal(service, 'category')
                        }
                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
                      >
                        <FolderPlus className="w-4 h-4" />
                        Add as Category
                      </button>
                      <button
                        onClick={() =>
                          openActionModal(service, 'subcategory')
                        }
                        className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition"
                      >
                        <Tag className="w-4 h-4" />
                        Add as Subcategory
                      </button>
                      <button
                        onClick={() => handleReject(service)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {service.status !== 'pending' && (
                    <button
                      onClick={() => handleDelete(service)}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Existing Categories Overview */}
        {categories.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Existing Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <CategoryCard key={cat._id} category={cat} onDeleteCategory={handleDeleteCategory} onDeleteSubcategory={handleDeleteSubcategory} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Action Modal */}
      {actionModal.open && actionModal.service && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {actionModal.mode === 'category'
                    ? 'Add as New Category'
                    : 'Add as Subcategory'}
                </h3>
                <button
                  onClick={() => setActionModal({ open: false, service: null, mode: null })}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  Custom service: <strong>{actionModal.service.serviceName}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Added by: {actionModal.service.userName || actionModal.service.addedBy}
                </p>
              </div>

              {actionModal.mode === 'category' ? (
                /* Add as Category */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={newCategoryName || actionModal.service.serviceName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter category name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Icon
                    </label>
                    <div className="grid grid-cols-6 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                      {[
                        { icon: '🔧', label: 'Plumber' },
                        { icon: '🪚', label: 'Carpenter' },
                        { icon: '⚡', label: 'Electrician' },
                        { icon: '🖌️', label: 'Painter' },
                        { icon: '🎵', label: 'Music' },
                        { icon: '🏫', label: 'School' },
                        { icon: '🍔', label: 'Food' },
                        { icon: '⚽', label: 'Sports' },
                        { icon: '🎨', label: 'Art' },
                        { icon: '📷', label: 'Photo' },
                        { icon: '🐾', label: 'Pets' },
                        { icon: '💇', label: 'Beauty' },
                        { icon: '⚖️', label: 'Legal' },
                        { icon: '🏦', label: 'Finance' },
                        { icon: '🛡️', label: 'Insurance' },
                        { icon: '🏠', label: 'Property' },
                        { icon: '🌾', label: 'Agriculture' },
                        { icon: '🚚', label: 'Logistics' },
                        { icon: '📢', label: 'Marketing' },
                        { icon: '🤝', label: 'Consulting' },
                        { icon: '🎬', label: 'Movies' },
                        { icon: '🚗', label: 'Auto' },
                        { icon: '💼', label: 'Business' },
                        { icon: '🔨', label: 'Building' },
                        { icon: '🎓', label: 'Education' },
                        { icon: '⚕️', label: 'Doctor' },
                        { icon: '💄', label: 'Lifestyle' },
                        { icon: '🔑', label: 'Rentals' },
                        { icon: '🛒', label: 'Shopping' },
                        { icon: '💻', label: 'Tech' },
                        { icon: '✈️', label: 'Travel' },
                        { icon: '👗', label: 'Fashion' },
                        { icon: '🧘', label: 'Yoga' },
                        { icon: '🧹', label: 'Cleaning' },
                        { icon: '📈', label: 'Trading' },
                        { icon: '🏡', label: 'Home' },
                        { icon: '🎉', label: 'Events' },
                        { icon: '📚', label: 'Books' },
                        { icon: '💊', label: 'Pharmacy' },
                        { icon: '🧒', label: 'Childcare' },
                        { icon: '🏋️', label: 'Gym' },
                        { icon: '🍕', label: 'Restaurant' },
                        { icon: '✂️', label: 'Tailoring' },
                        { icon: '🖥️', label: 'IT' },
                        { icon: '💎', label: 'Jewellery' },
                        { icon: '🖨️', label: 'Printing' },
                        { icon: '❄️', label: 'AC/HVAC' },
                        { icon: '💧', label: 'Water' },
                        { icon: '🚕', label: 'Taxi/Cab' },
                        { icon: '⚙️', label: 'Welding' },
                        { icon: '🙏', label: 'Religious' },
                        { icon: '💃', label: 'Dance' },
                        { icon: '🛡️', label: 'Security' },
                        { icon: '🛵', label: 'Bike/Mech' },
                      ].map((item) => (
                        <button
                          key={item.icon + item.label}
                          type="button"
                          onClick={() => setNewCategoryIcon(item.icon)}
                          className={`flex flex-col items-center p-2 rounded-lg transition text-center ${
                            newCategoryIcon === item.icon
                              ? 'bg-blue-100 ring-2 ring-blue-500'
                              : 'hover:bg-gray-100'
                          }`}
                          title={item.label}
                        >
                          <span className="text-2xl">{item.icon}</span>
                          <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-gray-500">Selected:</span>
                      <span className="text-3xl">{newCategoryIcon}</span>
                      <input
                        type="text"
                        value={newCategoryIcon}
                        onChange={(e) => setNewCategoryIcon(e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center text-xl ml-2"
                        title="Or type a custom emoji"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Add as Subcategory — select parent category */
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Select parent category:</p>
                  <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                    {categories.map((cat) => (
                      <button
                        key={cat._id}
                        onClick={() => setSelectedCategoryId(cat._id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                          selectedCategoryId === cat._id
                            ? 'bg-purple-50 border-l-4 border-purple-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{cat.name}</p>
                          <p className="text-xs text-gray-500">
                            {cat.subcategories.length} subcategories
                          </p>
                        </div>
                        {selectedCategoryId === cat._id && (
                          <Check className="w-5 h-5 text-purple-600 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setActionModal({ open: false, service: null, mode: null })}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${
                    actionModal.mode === 'category'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {actionModal.mode === 'category' ? 'Create Category' : 'Add as Subcategory'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Collapsible Category Card component
function CategoryCard({ category, onDeleteCategory, onDeleteSubcategory }: { category: Category; onDeleteCategory: (cat: Category) => void; onDeleteSubcategory: (cat: Category, sub: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  // Default/seeded categories that cannot be deleted
  const PROTECTED_CATEGORIES = [
    'Travel', 'Technology', 'Shopping', 'Rentals', 'Lifestyle',
    'Health', 'Education', 'Construction', 'Automotive', 'Services', 'Business',
  ];
  const isProtected = PROTECTED_CATEGORIES.some(
    (name) => name.toLowerCase() === category.name.toLowerCase()
  );

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            <div className="text-left">
              <p className="font-semibold text-gray-900">{category.name}</p>
              <p className="text-xs text-gray-500">{category.subcategories.length} subcategories</p>
            </div>
          </div>
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {!isProtected && (
          <button
            onClick={() => onDeleteCategory(category)}
            className="ml-3 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title={`Delete ${category.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex flex-wrap gap-2">
            {category.subcategories.map((sub, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full group"
              >
                {sub}
                {!isProtected && (
                  <button
                    onClick={() => onDeleteSubcategory(category, sub)}
                    className="ml-1 text-gray-400 hover:text-red-500 transition"
                    title={`Remove ${sub}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {category.subcategories.length === 0 && (
              <p className="text-xs text-gray-400 italic">No subcategories yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomCategoriesPage() {
  return (
    <AuthGuard>
      <CustomCategoriesContent />
    </AuthGuard>
  );
}
