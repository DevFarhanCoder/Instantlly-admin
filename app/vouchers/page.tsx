"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Ticket,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Phone,
  MapPin,
  TrendingUp,
  Eye,
  Loader2,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import { api } from "../lib/api";
import Image from "next/image";

interface Voucher {
  id: number;
  voucher_number?: string;
  business_name: string;
  title: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  mrp?: number;
  amount?: number;
  max_claims?: number;
  claimed_count: number;
  expires_at?: string;
  expiry_date?: string;
  status: string;       // "active" | "inactive"
  is_published?: boolean;
  company_name?: string;
  company_logo?: string;
  phone_number?: string;
  address?: string;
  discount_percentage?: number;
  validity?: string;
  voucher_image?: string;
  voucher_images?: string[];
  created_at: string;
}

function VouchersContent() {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "unpublished">(
    "all",
  );
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [publishLoading, setPublishLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchVouchers();
  }, [filter]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === "published") params.status = "active";
      if (filter === "unpublished") params.status = "inactive";

      const data = await api.get("/api/admin/vouchers", { params });
      // listVouchers returns raw array
      const list: Voucher[] = Array.isArray(data) ? data : (data.vouchers || []);
      setVouchers(list);
    } catch (error: any) {
      console.error("Error fetching vouchers:", error);
      alert(error.message || "Failed to fetch vouchers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (voucherId: number, voucherName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the voucher "${voucherName}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeleteLoading(voucherId);
    try {
      await api.delete(`/api/admin/vouchers/${voucherId}`);
      alert("Voucher deleted successfully!");
      fetchVouchers();
    } catch (error: any) {
      console.error("Error deleting voucher:", error);
      alert(error.message || "Failed to delete voucher");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handlePublish = async (voucherId: number, isActive: boolean) => {
    const action = isActive ? "unpublish" : "publish";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this voucher?\n\n${
        isActive
          ? "Users will no longer see this voucher in their app."
          : "This voucher will be visible to all users in their app."
      }`,
    );

    if (!confirmed) return;

    setPublishLoading(voucherId);
    try {
      if (isActive) {
        await api.post(`/api/admin/vouchers/${voucherId}/unpublish`, {});
        alert("Voucher unpublished successfully!");
      } else {
        await api.post(`/api/admin/vouchers/${voucherId}/publish`, {});
        alert("Voucher published successfully!");
      }
      fetchVouchers();
    } catch (error: any) {
      console.error(`Error ${action}ing voucher:`, error);
      alert(error.message || `Failed to ${action} voucher`);
    } finally {
      setPublishLoading(null);
    }
  };

  const filteredVouchers = vouchers;

  const publishedCount = vouchers.filter((v) => v.status === "active").length;
  const unpublishedCount = vouchers.filter((v) => v.status !== "active").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Ticket className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Voucher Management
                  </h1>
                  <p className="text-sm text-gray-600">
                    Create and manage vouchers for the mobile app
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push("/vouchers/new")}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Voucher
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Vouchers
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {vouchers.length}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Ticket className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {publishedCount}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unpublished</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {unpublishedCount}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <XCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({vouchers.length})
            </button>
            <button
              onClick={() => setFilter("published")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "published"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setFilter("unpublished")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "unpublished"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Unpublished ({unpublishedCount})
            </button>
          </div>
        </div>

        {/* Vouchers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No vouchers found
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === "all"
                ? "Get started by creating your first voucher"
                : `No ${filter} vouchers yet`}
            </p>
            {filter === "all" && (
              <button
                onClick={() => router.push("/vouchers/new")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-5 h-5" />
                Create Your First Voucher
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVouchers.map((voucher) => (
              <div
                key={voucher.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Voucher Card Preview */}
                <div className="relative h-48 bg-gradient-to-br from-gray-50 to-slate-100 p-5 overflow-hidden">
                  {/* Decorative circles */}
                  <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-indigo-100 opacity-40" />
                  <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-purple-100 opacity-30" />

                  {/* Discount Badge */}
                  {voucher.discount_percentage && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md z-10">
                      -{voucher.discount_percentage}%
                    </div>
                  )}

                  {/* Company Logo */}
                  {voucher.company_logo ? (
                    <div className="w-14 h-14 bg-white rounded-xl mb-3 flex items-center justify-center overflow-hidden shadow-sm border border-gray-100">
                      <Image
                        src={voucher.company_logo}
                        alt={voucher.company_name || voucher.business_name}
                        width={56}
                        height={56}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-indigo-100 rounded-xl mb-3 flex items-center justify-center shadow-sm">
                      <Ticket className="w-7 h-7 text-indigo-500" />
                    </div>
                  )}

                  {/* Company Info */}
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-gray-900 mb-0.5 leading-tight">
                      {voucher.company_name || voucher.business_name}
                    </h3>
                    <p className="text-xs text-gray-600 font-medium">{voucher.title}</p>
                    {voucher.phone_number && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {voucher.phone_number}
                      </p>
                    )}
                    {voucher.address && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {voucher.address}
                      </p>
                    )}
                  </div>

                  {/* Value */}
                  <div className="absolute bottom-4 right-4 bg-indigo-600 rounded-xl px-4 py-2 shadow-md z-10">
                    <p className="text-xs text-indigo-200 leading-none mb-0.5">
                      {voucher.discount_type === "percentage" ? "Discount" : "Value"}
                    </p>
                    <p className="text-2xl font-extrabold text-white leading-none">
                      {voucher.discount_type === "percentage"
                        ? `${voucher.discount_value}%`
                        : `₹${voucher.amount ?? voucher.discount_value}`}
                    </p>
                  </div>
                </div>

                {/* Voucher Details */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {voucher.voucher_number || `#${voucher.id}`}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        voucher.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {voucher.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex gap-3 text-xs text-gray-500 mb-2">
                    <span>Claims: <strong>{voucher.claimed_count}</strong>{voucher.max_claims ? `/${voucher.max_claims}` : ""}</span>
                    {(voucher.expires_at || voucher.expiry_date) && (
                      <span>Exp: <strong>{new Date(voucher.expires_at || voucher.expiry_date!).toLocaleDateString()}</strong></span>
                    )}
                  </div>

                  {voucher.validity && (
                    <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {voucher.validity}
                    </p>
                  )}

                  {voucher.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {voucher.description}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        router.push(`/vouchers/${voucher.id}/edit`)
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handlePublish(voucher.id, voucher.status === "active")
                      }
                      disabled={publishLoading === voucher.id}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                        voucher.status === "active"
                          ? "bg-orange-600 text-white hover:bg-orange-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {publishLoading === voucher.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : voucher.status === "active" ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {voucher.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(voucher.id, voucher.company_name || voucher.business_name)
                      }
                      disabled={deleteLoading === voucher.id}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading === voucher.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VouchersPage() {
  return (
    <AuthGuard>
      <VouchersContent />
    </AuthGuard>
  );
}
