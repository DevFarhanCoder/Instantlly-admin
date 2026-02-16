"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Building2,
  Phone,
  MapPin,
  DollarSign,
  Percent,
  Calendar,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import AuthGuard from "../../../components/AuthGuard";
import { api } from "../../../lib/api";

interface FormData {
  companyName: string;
  companyLogo: string;
  phoneNumber: string;
  address: string;
  amount: string;
  discountPercentage: string;
  validity: string;
  voucherImage: string;
  description: string;
  expiryDate: string;
  isPublished: boolean;
}

function EditVoucherContent() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    companyLogo: "",
    phoneNumber: "",
    address: "",
    amount: "",
    discountPercentage: "",
    validity: "",
    voucherImage: "",
    description: "",
    expiryDate: "",
    isPublished: false,
  });

  useEffect(() => {
    if (voucherId) {
      fetchVoucher();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherId]);

  const fetchVoucher = async () => {
    setFetchLoading(true);
    try {
      const response = await api.get("/api/admin/vouchers");
      const vouchers = response.vouchers || [];
      const voucher = vouchers.find((v: any) => v._id === voucherId);

      if (!voucher) {
        alert("Voucher not found");
        router.push("/vouchers");
        return;
      }

      // Populate form with existing data
      setFormData({
        companyName: voucher.companyName || "",
        companyLogo: voucher.companyLogo || "",
        phoneNumber: voucher.phoneNumber || "",
        address: voucher.address || "",
        amount: voucher.amount?.toString() || "",
        discountPercentage: voucher.discountPercentage?.toString() || "",
        validity: voucher.validity || "",
        voucherImage: voucher.voucherImage || "",
        description: voucher.description || "",
        expiryDate: voucher.expiryDate
          ? new Date(voucher.expiryDate).toISOString().split("T")[0]
          : "",
        isPublished: voucher.isPublished || false,
      });
    } catch (error: any) {
      console.error("Error fetching voucher:", error);
      alert(error.message || "Failed to fetch voucher");
      router.push("/vouchers");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.companyName.trim()) {
      alert("Please enter company name");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        companyName: formData.companyName.trim(),
        companyLogo: formData.companyLogo.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        address: formData.address.trim() || undefined,
        amount: parseFloat(formData.amount),
        discountPercentage: formData.discountPercentage
          ? parseFloat(formData.discountPercentage)
          : undefined,
        validity: formData.validity.trim() || undefined,
        voucherImage: formData.voucherImage.trim() || undefined,
        description: formData.description.trim() || undefined,
        expiryDate: formData.expiryDate
          ? new Date(formData.expiryDate).toISOString()
          : undefined,
        isPublished: formData.isPublished,
      };

      const response = await api.put(
        `/api/admin/vouchers/${voucherId}`,
        payload,
      );

      if (response.success) {
        alert("Voucher updated successfully!");
        router.push("/vouchers");
      } else {
        alert(response.message || "Failed to update voucher");
      }
    } catch (error: any) {
      console.error("Error updating voucher:", error);
      alert(error.message || "Failed to update voucher");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading voucher...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/vouchers")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Voucher</h1>
              <p className="text-sm text-gray-600">Update voucher details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g., Instantlly"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Logo URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    name="companyLogo"
                    value={formData.companyLogo}
                    onChange={handleChange}
                    placeholder="https://example.com/logo.png"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <ImageIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter a direct URL to the company logo image (e.g., from
                  Imgur, Cloudinary, or your CDN)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+91 9820329571"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Phone className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Jogeshwari, Mumbai"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Voucher Details Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Voucher Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="1200"
                    min="0"
                    step="0.01"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <DollarSign className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="discountPercentage"
                    value={formData.discountPercentage}
                    onChange={handleChange}
                    placeholder="40"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Percent className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validity Text
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="validity"
                    value={formData.validity}
                    onChange={handleChange}
                    placeholder="Valid till August 30th, 2026"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voucher Detail Image URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  name="voucherImage"
                  value={formData.voucherImage}
                  onChange={handleChange}
                  placeholder="https://example.com/voucher-detail.jpg"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <Upload className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This image will be shown on the voucher detail screen in the
                mobile app
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <div className="relative">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Premium voucher with exclusive benefits..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Publishing Options */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Publishing Options
            </h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isPublished"
                checked={formData.isPublished}
                onChange={handleChange}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Published
                </span>
                <p className="text-xs text-gray-500">
                  If enabled, this voucher will be visible to all users in the
                  mobile app
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push("/vouchers")}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Update Voucher
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditVoucherPage() {
  return (
    <AuthGuard>
      <EditVoucherContent />
    </AuthGuard>
  );
}
