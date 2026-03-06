"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowLeft,
  User,
  CreditCard,
  Gift,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Phone,
  Package,
  Globe,
  EyeOff,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import { api } from "../lib/api";

interface AdminVoucher {
  _id: string;
  companyName: string;
  amount: number;
  discountPercentage: number;
  minVouchersRequired: number;
  isPublished: boolean;
}

interface UserData {
  _id: string;
  name: string;
  phone: string;
  credits: number;
  voucherBalance: number;
  isVoucherAdmin?: boolean;
}

interface VoucherStats {
  availableCredits: number;
  distributedCredits: number;
  totalSlots: number;
  availableSlots: number;
  usedSlots: number;
  networkUsers: number;
  voucherBalance: number;
  generalCredits: number;
  isVoucherAdmin: boolean;
}

type Tab = "search" | "self";

function UserManagementContent() {
  const router = useRouter();

  // ── Voucher selection ─────────────────────────────────────────────────
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState<AdminVoucher | null>(
    null,
  );

  // ── Tab ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("search");

  // ── Search tab state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newCredits, setNewCredits] = useState("");
  const [newVouchers, setNewVouchers] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [voucherReason, setVoucherReason] = useState("");
  const [savingCredits, setSavingCredits] = useState(false);
  const [savingVouchers, setSavingVouchers] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Self-credit tab state ─────────────────────────────────────────────
  const [selfPhone, setSelfPhone] = useState("");
  const [selfUser, setSelfUser] = useState<UserData | null>(null);
  const [findingSelf, setFindingSelf] = useState(false);
  const [selfCredits, setSelfCredits] = useState("");
  const [selfVouchers, setSelfVouchers] = useState("");
  const [selfCreditsReason, setSelfCreditsReason] = useState("");
  const [selfVouchersReason, setSelfVouchersReason] = useState("");
  const [savingSelf, setSavingSelf] = useState(false);
  const [selfMessage, setSelfMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [voucherStats, setVoucherStats] = useState<VoucherStats | null>(null);
  const [loadingVoucherStats, setLoadingVoucherStats] = useState(false);

  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoadingVouchers(true);
    try {
      const res = await api.get("/api/admin/vouchers");
      if (res.success) setVouchers(res.vouchers || []);
    } catch {
    } finally {
      setLoadingVouchers(false);
    }
  };

  const handleTogglePublish = async (
    e: React.MouseEvent,
    voucherId: string,
    isCurrentlyPublished: boolean,
  ) => {
    e.stopPropagation();
    setPublishingId(voucherId);
    try {
      const endpoint = isCurrentlyPublished
        ? `/api/admin/vouchers/${voucherId}/unpublish`
        : `/api/admin/vouchers/${voucherId}/publish`;
      const res = await api.post(endpoint, {});
      if (res.success) {
        setVouchers((prev) =>
          prev.map((v) =>
            v._id === voucherId
              ? { ...v, isPublished: !isCurrentlyPublished }
              : v,
          ),
        );
        setSelectedVoucher((prev) =>
          prev?._id === voucherId
            ? { ...prev, isPublished: !isCurrentlyPublished }
            : prev,
        );
      }
    } catch {
    } finally {
      setPublishingId(null);
    }
  };

  const selectVoucher = (v: AdminVoucher) => {
    setSelectedVoucher(v);
    // Reset state when switching voucher
    setSelectedUser(null);
    setSelfUser(null);
    setSearchResults([]);
    setMessage(null);
    setSelfMessage(null);
    setVoucherStats(null);
    setActiveTab("search");
  };

  // ── Search tab handlers ───────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setMessage(null);
    setSelectedUser(null);
    try {
      const res = await api.get("/api/admin/users", {
        params: { page: 1, limit: 50, search: searchQuery },
      });
      if (res.users && res.users.length > 0) {
        setSearchResults(res.users);
      } else {
        setSearchResults([]);
        setMessage({ type: "error", text: "No users found" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Search failed" });
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const fetchVoucherStats = async (
    userId: string,
    voucherId?: string,
    applyToInputs?: "search" | "self",
  ) => {
    setLoadingVoucherStats(true);
    try {
      const url = voucherId
        ? `/api/admin/users/${userId}/voucher-stats?voucherId=${voucherId}`
        : `/api/admin/users/${userId}/voucher-stats`;
      const res = await api.get(url);
      if (res.success) {
        const stats = res.stats as VoucherStats;
        setVoucherStats(stats);
        if (applyToInputs === "search") {
          setNewCredits((stats.availableCredits / 1e7).toFixed(2));
          setNewVouchers(String(stats.voucherBalance));
        } else if (applyToInputs === "self") {
          setSelfCredits((stats.availableCredits / 1e7).toFixed(2));
          setSelfVouchers(String(stats.voucherBalance));
        }
      }
    } catch {
      setVoucherStats(null);
    } finally {
      setLoadingVoucherStats(false);
    }
  };

  const selectUser = (u: any) => {
    setSelectedUser({
      _id: u._id,
      name: u.name,
      phone: u.phone,
      credits: u.credits || 0,
      voucherBalance: u.voucherBalance || 0,
      isVoucherAdmin: u.isVoucherAdmin || false,
    });
    setNewCredits(String(u.credits || 0));
    setNewVouchers("0"); // will be overwritten by fetchVoucherStats with per-voucher balance
    setMessage(null);
    setCreditReason("");
    setVoucherReason("");
    setSearchResults([]);
    setVoucherStats(null);
    fetchVoucherStats(u._id, selectedVoucher?._id, "search");
  };

  const handleUpdateCredits = async () => {
    if (!selectedUser) return;
    setSavingCredits(true);
    setMessage(null);
    try {
      const res = await api.put(
        `/api/admin/users/${selectedUser._id}/update-credits`,
        {
          credits: Math.round(parseFloat(newCredits) * 1e7),
          reason: creditReason,
        },
      );
      if (res.success) {
        setSelectedUser({
          ...selectedUser,
          credits: Math.round(parseFloat(newCredits) * 1e7),
        });
        setMessage({
          type: "success",
          text: res.message || "Credits updated successfully",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to update credits",
      });
    } finally {
      setSavingCredits(false);
    }
  };

  const handleUpdateVouchers = async () => {
    if (!selectedUser) return;
    setSavingVouchers(true);
    setMessage(null);
    try {
      const res = await api.put(
        `/api/admin/users/${selectedUser._id}/update-vouchers`,
        {
          voucherBalance: parseInt(newVouchers),
          reason: voucherReason,
          voucherId: selectedVoucher?._id,
        },
      );
      if (res.success) {
        setSelectedUser({
          ...selectedUser,
          voucherBalance: parseInt(newVouchers),
        });
        setMessage({
          type: "success",
          text: res.message || "Voucher balance updated successfully",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to update voucher balance",
      });
    } finally {
      setSavingVouchers(false);
    }
  };

  // ── Self-credit tab handlers ──────────────────────────────────────────
  const handleFindSelf = async () => {
    if (!selfPhone.trim()) return;
    setFindingSelf(true);
    setSelfMessage(null);
    setSelfUser(null);
    try {
      const encoded = encodeURIComponent(selfPhone.trim());
      const res = await api.get(`/api/admin/users/by-phone/${encoded}`);
      if (res.success && res.user) {
        setSelfUser(res.user);
        setSelfCredits(String(res.user.credits || 0));
        setSelfVouchers("0"); // will be overwritten by fetchVoucherStats with per-voucher balance
        fetchVoucherStats(res.user._id, selectedVoucher?._id, "self");
      } else {
        setSelfMessage({
          type: "error",
          text: "User not found with that phone number",
        });
      }
    } catch (err: any) {
      setSelfMessage({
        type: "error",
        text: err.message || "Failed to find user",
      });
    } finally {
      setFindingSelf(false);
    }
  };

  const handleSaveSelfCredits = async () => {
    if (!selfUser) return;
    setSavingSelf(true);
    setSelfMessage(null);
    try {
      await Promise.all([
        Math.round(parseFloat(selfCredits) * 1e7) !== selfUser.credits
          ? api.put(`/api/admin/users/${selfUser._id}/update-credits`, {
              credits: Math.round(parseFloat(selfCredits) * 1e7),
              reason: selfCreditsReason || "Admin self-update",
            })
          : Promise.resolve({ success: true }),
        parseInt(selfVouchers) !== selfUser.voucherBalance
          ? api.put(`/api/admin/users/${selfUser._id}/update-vouchers`, {
              voucherBalance: parseInt(selfVouchers),
              reason: selfVouchersReason || "Admin self-update",
              voucherId: selectedVoucher?._id,
            })
          : Promise.resolve({ success: true }),
      ]);
      setSelfUser({
        ...selfUser,
        credits: Math.round(parseFloat(selfCredits) * 1e7),
        voucherBalance: parseInt(selfVouchers),
      });
      setSelfMessage({
        type: "success",
        text: "Account updated successfully!",
      });
    } catch (err: any) {
      setSelfMessage({ type: "error", text: err.message || "Update failed" });
    } finally {
      setSavingSelf(false);
    }
  };

  // Quick-add buttons based on voucher minVouchersRequired
  const voucherQuickAdds = selectedVoucher
    ? [
        1,
        5,
        Math.ceil(selectedVoucher.minVouchersRequired / 4),
        Math.ceil(selectedVoucher.minVouchersRequired / 2),
        selectedVoucher.minVouchersRequired,
      ]
        .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
        .slice(0, 5)
    : [5, 10, 25, 50, 120];

  const creditQuickAdds = selectedVoucher
    ? [
        100,
        500,
        selectedVoucher.amount,
        selectedVoucher.amount * 2,
        selectedVoucher.amount * 5,
      ]
        .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
        .slice(0, 5)
    : [100, 300, 500, 1000, 5000];

  const voucherLabel = selectedVoucher
    ? `${selectedVoucher.companyName} Vouchers`
    : "Vouchers";
  const creditLabel = selectedVoucher
    ? `${selectedVoucher.companyName} Credits`
    : "Credits";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">
              {selectedVoucher
                ? `Managing ${selectedVoucher.companyName} — credits & vouchers`
                : "Select a voucher to manage users"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* ── STEP 1: VOUCHER SELECTOR ── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Package size={16} className="text-blue-500" />
            Step 1 — Select Voucher
          </h2>

          {loadingVouchers ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-400" />
            </div>
          ) : vouchers.length === 0 ? (
            <div className="bg-white rounded-xl border p-6 text-center text-sm text-gray-500">
              No vouchers found.{" "}
              <button
                onClick={() => router.push("/vouchers/new")}
                className="text-blue-600 underline"
              >
                Create one first
              </button>
              .
            </div>
          ) : (
            <div className="grid gap-3">
              {vouchers.map((v) => (
                <div
                  key={v._id}
                  onClick={() => selectVoucher(v)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && selectVoucher(v)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    selectedVoucher?._id === v._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Gift size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {v.companyName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ₹{v.amount} &middot; {v.discountPercentage}% off &middot;
                      Min {v.minVouchersRequired ?? 5} vouchers required
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) =>
                        handleTogglePublish(e, v._id, v.isPublished)
                      }
                      disabled={publishingId === v._id}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        v.isPublished
                          ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                          : "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                      }`}
                    >
                      {publishingId === v._id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : v.isPublished ? (
                        <>
                          <Globe size={10} /> Published
                        </>
                      ) : (
                        <>
                          <EyeOff size={10} /> Draft
                        </>
                      )}
                    </button>
                    {selectedVoucher?._id === v._id && (
                      <CheckCircle size={18} className="text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── STEP 2: MANAGE USERS (only when voucher selected) ── */}
        {selectedVoucher && (
          <>
            {/* Selected voucher banner */}
            <div className="bg-white rounded-xl border border-blue-200 px-4 py-3 flex items-center gap-3">
              <Gift size={18} className="text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {selectedVoucher.companyName}
                </p>
                <p className="text-xs text-gray-400">
                  ₹{selectedVoucher.amount} voucher &middot; Requires{" "}
                  {selectedVoucher.minVouchersRequired} to unlock credits
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedVoucher(null);
                  setSelectedUser(null);
                  setSelfUser(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Change
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {(["search", "self"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setMessage(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab === "self" ? "Admin Self-Credit" : "Search User"}
                </button>
              ))}
            </div>

            {/* ── SEARCH TAB ── */}
            {activeTab === "search" && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Search size={18} className="text-blue-500" />
                    Find User
                  </h2>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Search by name or phone number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching}
                      className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      {searching ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Search size={16} />
                      )}
                      Search
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
                      {searchResults.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => selectUser(u)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                              <User size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900">
                                {u.name}
                              </p>
                              <p className="text-xs text-gray-500">{u.phone}</p>
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-500 flex flex-col items-end gap-1">
                            {u.isVoucherAdmin && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium border border-yellow-200">
                                Voucher Admin
                              </span>
                            )}
                            <p>{(u.credits || 0).toLocaleString()} credits</p>
                            <p>{u.voucherBalance || 0} vouchers</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedUser && (
                  <div className="space-y-4">
                    {/* User info card */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                            <User size={22} className="text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">
                              {selectedUser.name}
                            </p>
                            <p className="text-blue-100 text-sm">
                              {selectedUser.phone}
                            </p>
                            {selectedUser.isVoucherAdmin && (
                              <span className="mt-1 inline-block px-2 py-0.5 bg-yellow-400/30 text-yellow-200 text-xs rounded-full">
                                Voucher Admin
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedUser(null);
                            setMessage(null);
                          }}
                          className="text-white/70 hover:text-white text-2xl leading-none"
                        >
                          ×
                        </button>
                      </div>
                      {/* Voucher MLM Stats */}
                      {loadingVoucherStats ? (
                        <div className="mt-3 flex items-center gap-2 text-blue-200 text-xs">
                          <Loader2 size={12} className="animate-spin" />
                          Loading MLM stats…
                        </div>
                      ) : voucherStats ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="bg-white/10 rounded-lg p-2 text-center">
                            <p className="text-blue-100 text-xs">
                              Available Credits
                            </p>
                            <p className="font-bold text-sm">
                              {(voucherStats.availableCredits / 1e7).toFixed(2)}
                              Cr
                            </p>
                          </div>
                          <div className="bg-white/10 rounded-lg p-2 text-center">
                            <p className="text-blue-100 text-xs">Distributed</p>
                            <p className="font-bold text-sm">
                              {(voucherStats.distributedCredits / 1e7).toFixed(
                                2,
                              )}
                              Cr
                            </p>
                          </div>
                          <div className="bg-white/10 rounded-lg p-2 text-center">
                            <p className="text-blue-100 text-xs">
                              Available Vouchers
                            </p>
                            <p className="font-bold text-sm">
                              {voucherStats.voucherBalance.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-white/10 rounded-lg p-2 text-center">
                            <p className="text-blue-100 text-xs">
                              Network Users
                            </p>
                            <p className="font-bold text-sm">
                              {voucherStats.networkUsers}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Update Credits */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <CreditCard size={17} className="text-green-600" />
                        Update Available Credits
                      </h3>
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newCredits}
                            onChange={(e) => setNewCredits(e.target.value)}
                            className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="e.g. 79101.55"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                            Cr
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {creditQuickAdds.map((q) => (
                            <button
                              key={q}
                              onClick={() =>
                                setNewCredits(
                                  String(
                                    ((parseFloat(newCredits) || 0) + q).toFixed(
                                      2,
                                    ),
                                  ),
                                )
                              }
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg border border-green-200 transition-colors"
                            >
                              +{q.toLocaleString()}Cr
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={creditReason}
                          onChange={(e) => setCreditReason(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          onClick={handleUpdateCredits}
                          disabled={savingCredits || !newCredits}
                          className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                          {savingCredits ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <RefreshCw size={16} />
                          )}
                          Update Credits
                        </button>
                      </div>
                    </div>

                    {/* Update Vouchers */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Gift size={17} className="text-orange-500" />
                        Update Available Vouchers
                        <span className="ml-auto text-xs text-gray-400 font-normal">
                          Min required: {selectedVoucher.minVouchersRequired}
                        </span>
                      </h3>
                      <div className="space-y-3">
                        <input
                          type="number"
                          min="0"
                          value={newVouchers}
                          onChange={(e) => setNewVouchers(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                          placeholder="Enter voucher count"
                        />
                        <div className="flex gap-2 flex-wrap">
                          {voucherQuickAdds.map((q) => (
                            <button
                              key={q}
                              onClick={() =>
                                setNewVouchers(
                                  String(
                                    (selectedUser.voucherBalance || 0) + q,
                                  ),
                                )
                              }
                              className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium rounded-lg border border-orange-200 transition-colors"
                            >
                              +{q}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={voucherReason}
                          onChange={(e) => setVoucherReason(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <button
                          onClick={handleUpdateVouchers}
                          disabled={savingVouchers || !newVouchers}
                          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                        >
                          {savingVouchers ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Gift size={16} />
                          )}
                          Update Vouchers
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {message && (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-xl border ${message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle size={18} className="shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{message.text}</p>
                  </div>
                )}
              </>
            )}

            {/* ── SELF-CREDIT TAB ── */}
            {activeTab === "self" && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700 font-medium">
                    Add <strong>{creditLabel}</strong> or{" "}
                    <strong>{voucherLabel}</strong> to your own admin account.
                    The {selectedVoucher.companyName} voucher requires{" "}
                    <strong>
                      {selectedVoucher.minVouchersRequired} vouchers
                    </strong>{" "}
                    to unlock credits.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Phone size={18} className="text-blue-500" />
                    Find Your Account
                  </h2>
                  <div className="flex gap-3">
                    <input
                      type="tel"
                      placeholder="Your registered phone number"
                      value={selfPhone}
                      onChange={(e) => setSelfPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleFindSelf()}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleFindSelf}
                      disabled={findingSelf}
                      className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      {findingSelf ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Search size={16} />
                      )}
                      Find
                    </button>
                  </div>
                </div>

                {selfUser && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-5 text-white shadow-md">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                          <User size={22} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{selfUser.name}</p>
                          <p className="text-purple-100 text-sm">
                            {selfUser.phone}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 rounded-lg p-3">
                          <p className="text-purple-100 text-xs mb-1">
                            Available Credits
                          </p>
                          <p className="font-bold text-xl">
                            {voucherStats
                              ? `${(voucherStats.availableCredits / 1e7).toFixed(2)}Cr`
                              : `${(selfUser.credits / 1e7).toFixed(2)}Cr`}
                          </p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                          <p className="text-purple-100 text-xs mb-1">
                            Available Vouchers
                          </p>
                          <p className="font-bold text-xl">
                            {(voucherStats?.voucherBalance ?? 0).toLocaleString()}
                          </p>
                          <p className="text-purple-200 text-xs mt-0.5">
                            Min: {selectedVoucher.minVouchersRequired}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                      <h3 className="font-semibold text-gray-800">
                        Update Your Account — {selectedVoucher.companyName}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 font-medium block mb-1.5">
                            Available Credits
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={selfCredits}
                              onChange={(e) => setSelfCredits(e.target.value)}
                              className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
                              Cr
                            </span>
                          </div>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {creditQuickAdds.slice(0, 3).map((q) => (
                              <button
                                key={q}
                                onClick={() =>
                                  setSelfCredits(
                                    String(
                                      (
                                        (parseFloat(selfCredits) || 0) + q
                                      ).toFixed(2),
                                    ),
                                  )
                                }
                                className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200 hover:bg-green-100"
                              >
                                +{q.toLocaleString()}Cr
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={selfCreditsReason}
                            onChange={(e) =>
                              setSelfCreditsReason(e.target.value)
                            }
                            className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium block mb-1.5">
                            Available Vouchers
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={selfVouchers}
                            onChange={(e) => setSelfVouchers(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400"
                          />
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {voucherQuickAdds.slice(0, 3).map((q) => (
                              <button
                                key={q}
                                onClick={() =>
                                  setSelfVouchers(
                                    String((selfUser.voucherBalance || 0) + q),
                                  )
                                }
                                className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded border border-orange-200 hover:bg-orange-100"
                              >
                                +{q}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={selfVouchersReason}
                            onChange={(e) =>
                              setSelfVouchersReason(e.target.value)
                            }
                            className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleSaveSelfCredits}
                        disabled={savingSelf}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                      >
                        {savingSelf ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {selfMessage && (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-xl border ${selfMessage.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
                  >
                    {selfMessage.type === "success" ? (
                      <CheckCircle size={18} className="shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{selfMessage.text}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <AuthGuard>
      <UserManagementContent />
    </AuthGuard>
  );
}
