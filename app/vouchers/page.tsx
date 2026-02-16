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
  _id: string;
  voucherNumber: string;
  companyName: string;
  companyLogo?: string;
  phoneNumber?: string;
  address?: string;
  amount: number;
  discountPercentage?: number;
  validity?: string;
  voucherImage?: string;
  description?: string;
  isPublished: boolean;
  publishedAt?: string;
  expiryDate?: string;
  createdAt: string;
}

function VouchersContent() {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "unpublished">(
    "all",
  );
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchVouchers();
  }, [filter]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === "published") params.isPublished = true;
      if (filter === "unpublished") params.isPublished = false;

      const data = await api.get("/api/admin/vouchers", { params });
      setVouchers(data.vouchers || []);
    } catch (error: any) {
      console.error("Error fetching vouchers:", error);
      alert(error.message || "Failed to fetch vouchers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (voucherId: string, voucherName: string) => {
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

  const handlePublish = async (voucherId: string, currentStatus: boolean) => {
    const action = currentStatus ? "unpublish" : "publish";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this voucher?\n\n${
        currentStatus
          ? "Users will no longer see this voucher in their app."
          : "This voucher will be visible to all users in their app."
      }`,
    );

    if (!confirmed) return;

    setPublishLoading(voucherId);
    try {
      if (currentStatus) {
        // Unpublish by updating isPublished to false
        await api.put(`/api/admin/vouchers/${voucherId}`, {
          isPublished: false,
        });
        alert("Voucher unpublished successfully!");
      } else {
        // Publish
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

  const publishedCount = vouchers.filter((v) => v.isPublished).length;
  const unpublishedCount = vouchers.filter((v) => !v.isPublished).length;

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
                key={voucher._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Voucher Card Preview */}
                <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600 p-6">
                  {/* Discount Badge */}
                  {voucher.discountPercentage && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{voucher.discountPercentage}%
                    </div>
                  )}

                  {/* Company Logo */}
                  {voucher.companyLogo && (
                    <div className="w-16 h-16 bg-white rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      <Image
                        src={voucher.companyLogo}
                        alt={voucher.companyName}
                        width={64}
                        height={64}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}

                  {/* Company Info */}
                  <div className="text-white">
                    <h3 className="text-xl font-bold mb-1">
                      {voucher.companyName}
                    </h3>
                    {voucher.phoneNumber && (
                      <p className="text-sm opacity-90 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {voucher.phoneNumber}
                      </p>
                    )}
                    {voucher.address && (
                      <p className="text-sm opacity-90 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {voucher.address}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="absolute bottom-4 right-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <p className="text-xs text-white opacity-80">Value</p>
                    <p className="text-2xl font-bold text-white">
                      ₹{voucher.amount}
                    </p>
                  </div>
                </div>

                {/* Voucher Details */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {voucher.voucherNumber}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        voucher.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {voucher.isPublished ? "Published" : "Draft"}
                    </span>
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
                        router.push(`/vouchers/${voucher._id}/edit`)
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handlePublish(voucher._id, voucher.isPublished)
                      }
                      disabled={publishLoading === voucher._id}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                        voucher.isPublished
                          ? "bg-orange-600 text-white hover:bg-orange-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {publishLoading === voucher._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : voucher.isPublished ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {voucher.isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(voucher._id, voucher.companyName)
                      }
                      disabled={deleteLoading === voucher._id}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading === voucher._id ? (
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
