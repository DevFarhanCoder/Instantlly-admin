"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Users,
  Clock,
  Gift,
  Star,
  ChevronDown,
  ChevronUp,
  Network,
  Plus,
  Package,
  Globe,
  EyeOff,
  Trash2,
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

interface Slot {
  slotNumber: number;
  status: "available" | "sent" | "expired";
  creditAmount: number;
  recipientName?: string | null;
  recipientPhone?: string | null;
  sentAt?: string | null;
  expiresAt?: string | null;
  isAvailable: boolean;
}

interface SlotSummary {
  totalSlots: number;
  availableSlots: number;
  usedSlots: number;
  creditPerSlot: number;
}

interface PendingCredit {
  id: string;
  sender: { name: string; phone: string };
  receiver: { name: string; phone: string };
  quantity: number;
  paymentConfirmedAt: string;
}

function MLMCreditsContent() {
  const router = useRouter();
  const [tab, setTab] = useState<"slots" | "pending">("slots");

  //  Voucher selection
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState<AdminVoucher | null>(
    null,
  );

  //  Slots state
  const [slots, setSlots] = useState<Slot[]>([]);
  const [summary, setSummary] = useState<SlotSummary | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);

  //  Initialize slots
  const [adminPhone, setAdminPhone] = useState("");
  const [initSlotCount, setInitSlotCount] = useState("5");
  const [initCreditAmount, setInitCreditAmount] = useState("");
  const [initLoading, setInitLoading] = useState(false);
  const [initMessage, setInitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  //  Increase slots
  const [increaseCount, setIncreaseCount] = useState("5");
  const [increaseCreditAmount, setIncreaseCreditAmount] = useState("");
  const [increaseLoading, setIncreaseLoading] = useState(false);
  const [increaseMsg, setIncreaseMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  //  Delete slots
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(
    new Set(),
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  //  Publish toggle
  const [publishingId, setPublishingId] = useState<string | null>(null);

  //  Pending approvals
  const [pendingCredits, setPendingCredits] = useState<PendingCredit[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvalMsg, setApprovalMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  //
  useEffect(() => {
    fetchVouchers();
  }, []);

  useEffect(() => {
    if (selectedVoucher && tab === "slots") fetchSlots();
    if (tab === "pending") fetchPending();
    setDeleteMode(false);
    setSelectedForDelete(new Set());
    setDeleteMsg(null);
  }, [tab, selectedVoucher]);

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
        // Update selectedVoucher too if it's the same one
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

  const fetchSlots = useCallback(async () => {
    if (!selectedVoucher) return;
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const res = await api.get(
        `/api/admin/mlm/slots?voucherId=${selectedVoucher._id}`,
      );
      if (res.success) {
        setSlots(res.slots || []);
        setSummary(res.summary || null);
      }
    } catch (err: any) {
      setSlotsError(err.message || "Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedVoucher]);

  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await api.get("/api/mlm/admin/credits/pending-approval");
      if (res.success) setPendingCredits(res.credits || []);
    } catch {
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const handleInitAdmin = async () => {
    if (!adminPhone.trim() || !selectedVoucher) return;
    setInitLoading(true);
    setInitMessage(null);
    try {
      const encoded = encodeURIComponent(adminPhone.trim());
      const userRes = await api.get(`/api/admin/users/by-phone/${encoded}`);
      if (!userRes.success || !userRes.user) {
        setInitMessage({
          type: "error",
          text: "User not found with that phone number",
        });
        return;
      }
      const res = await api.post("/api/admin/mlm/slots/initialize", {
        adminUserId: userRes.user._id,
        voucherId: selectedVoucher._id,
        slotCount: parseInt(initSlotCount) || 5,
        ...(initCreditAmount && Number(initCreditAmount) > 0
          ? { creditAmount: Number(initCreditAmount) }
          : {}),
      });
      if (res.success) {
        setInitMessage({
          type: "success",
          text: res.message || `${initSlotCount} slots initialized!`,
        });
        fetchSlots();
      }
    } catch (err: any) {
      setInitMessage({
        type: "error",
        text: err.message || "Initialization failed",
      });
    } finally {
      setInitLoading(false);
    }
  };

  const handleIncreaseSlots = async () => {
    if (!selectedVoucher) return;
    const n = parseInt(increaseCount);
    if (isNaN(n) || n < 1) {
      setIncreaseMsg({ type: "error", text: "Enter a valid number" });
      return;
    }
    setIncreaseLoading(true);
    setIncreaseMsg(null);
    try {
      const res = await api.post("/api/admin/mlm/slots/increase", {
        voucherId: selectedVoucher._id,
        count: n,
        ...(increaseCreditAmount && Number(increaseCreditAmount) > 0
          ? { creditAmount: Number(increaseCreditAmount) }
          : {}),
      });
      if (res.success) {
        setIncreaseMsg({
          type: "success",
          text: res.message || `${n} slots added!`,
        });
        fetchSlots();
      }
    } catch (err: any) {
      setIncreaseMsg({
        type: "error",
        text: err.message || "Failed to add slots",
      });
    } finally {
      setIncreaseLoading(false);
    }
  };

  const handleDeleteSlots = async (deleteAll = false) => {
    if (!selectedVoucher) return;
    if (!deleteAll && selectedForDelete.size === 0) {
      setDeleteMsg({
        type: "error",
        text: "Select at least one slot to delete",
      });
      return;
    }
    const confirmMsg = deleteAll
      ? `Permanently delete ALL ${slots.length} slots for ${selectedVoucher.companyName}? This cannot be undone.`
      : `Permanently delete ${selectedForDelete.size} selected slot(s)? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setDeleteLoading(true);
    setDeleteMsg(null);
    try {
      const body: any = { voucherId: selectedVoucher._id };
      if (deleteAll) {
        body.deleteAll = true;
      } else {
        body.slotNumbers = Array.from(selectedForDelete);
      }
      const res = await api.delete("/api/admin/mlm/slots", { data: body });
      if (res.success) {
        setDeleteMsg({ type: "success", text: res.message || "Slots deleted" });
        setSelectedForDelete(new Set());
        setDeleteMode(false);
        fetchSlots();
      }
    } catch (err: any) {
      setDeleteMsg({
        type: "error",
        text: err.message || "Failed to delete slots",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleApprove = async (creditId: string) => {
    setProcessingId(creditId);
    setApprovalMsg(null);
    try {
      const res = await api.post(
        `/api/mlm/admin/credits/${creditId}/approve-payment`,
        {},
      );
      if (res.success) {
        setApprovalMsg({
          type: "success",
          text: "Payment approved & vouchers generated!",
        });
        setPendingCredits((prev) => prev.filter((c) => c.id !== creditId));
      }
    } catch (err: any) {
      setApprovalMsg({ type: "error", text: err.message || "Approval failed" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (creditId: string) => {
    const note = window.prompt("Rejection reason:");
    if (note === null) return;
    setProcessingId(creditId);
    try {
      const res = await api.post(
        `/api/mlm/admin/credits/${creditId}/reject-payment`,
        { note },
      );
      if (res.success) {
        setApprovalMsg({
          type: "success",
          text: "Payment rejected & credit refunded.",
        });
        setPendingCredits((prev) => prev.filter((c) => c.id !== creditId));
      }
    } catch (err: any) {
      setApprovalMsg({
        type: "error",
        text: err.message || "Rejection failed",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const slotColor = (s: Slot) => {
    if (s.status === "sent") return "bg-green-50 border-green-300";
    if (s.status === "expired") return "bg-red-50 border-red-200";
    return "bg-white border-gray-200";
  };

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
            <h1 className="text-xl font-bold text-gray-900">
              MLM Credits Management
            </h1>
            <p className="text-sm text-gray-500">
              Select a voucher to manage its MLM slot system
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/*  STEP 1: VOUCHER SELECTOR  */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Package size={16} className="text-indigo-500" />
            Step 1 — Select Voucher
          </h2>

          {loadingVouchers ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : vouchers.length === 0 ? (
            <div className="bg-white rounded-xl border p-6 text-center text-sm text-gray-500">
              No vouchers found.{" "}
              <button
                onClick={() => router.push("/vouchers/new")}
                className="text-indigo-600 underline"
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
                  onClick={() => {
                    setSelectedVoucher(v);
                    setSlots([]);
                    setSummary(null);
                    setSlotsError(null);
                    setInitMessage(null);
                    setIncreaseMsg(null);
                    setTab("slots");
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && e.currentTarget.click()
                  }
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    selectedVoucher?._id === v._id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Gift size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {v.companyName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Amount: ₹{v.amount} &middot; {v.discountPercentage}% off
                      &middot; Min {v.minVouchersRequired ?? 5} vouchers
                      required
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
                      <CheckCircle size={18} className="text-indigo-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/*  STEP 2: TABS (only visible when a voucher is selected)  */}
        {selectedVoucher && (
          <>
            {/* Selected voucher banner */}
            <div className="bg-white rounded-xl border border-indigo-200 px-4 py-3 flex items-center gap-3">
              <Gift size={18} className="text-indigo-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {selectedVoucher.companyName}
                </p>
                <p className="text-xs text-gray-400">
                  Managing MLM slots for this voucher
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedVoucher(null);
                  setSlots([]);
                  setSummary(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Change
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1">
              {(["slots", "pending"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t === "slots"
                    ? "Slot Management"
                    : `Pending Approvals${pendingCredits.length > 0 ? ` (${pendingCredits.length})` : ""}`}
                </button>
              ))}
            </div>

            {/*  SLOT MANAGEMENT TAB  */}
            {tab === "slots" && (
              <>
                {/* Summary cards */}
                {summary && summary.totalSlots > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      {
                        label: "Total Slots",
                        value: summary.totalSlots,
                        color: "text-gray-700",
                      },
                      {
                        label: "Available",
                        value: summary.availableSlots,
                        color: "text-green-600",
                      },
                      {
                        label: "Used",
                        value: summary.usedSlots,
                        color: "text-blue-600",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm"
                      >
                        <p className={`text-2xl font-bold ${s.color}`}>
                          {s.value}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Slot list header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <Network size={18} className="text-indigo-500" />
                    Slot Status
                  </h2>
                  <button
                    onClick={fetchSlots}
                    disabled={loadingSlots}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <RefreshCw
                      size={16}
                      className={loadingSlots ? "animate-spin" : ""}
                    />
                  </button>
                </div>

                {loadingSlots && (
                  <div className="flex justify-center py-12">
                    <Loader2
                      size={28}
                      className="animate-spin text-indigo-400"
                    />
                  </div>
                )}

                {slotsError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {slotsError}
                  </div>
                )}

                {/* No slots — initialize */}
                {!loadingSlots && slots.length === 0 && !slotsError && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                    <p className="text-sm text-gray-600">
                      No MLM slots yet for{" "}
                      <strong>{selectedVoucher.companyName}</strong>. Enter your
                      admin phone number and the number of slots to initialize.
                    </p>
                    <input
                      type="tel"
                      placeholder="Your registered phone number"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Number of slots (required)"
                      value={initSlotCount}
                      onChange={(e) => setInitSlotCount(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Credits per slot (optional, default: 29,296,872,000)"
                      value={initCreditAmount}
                      onChange={(e) => setInitCreditAmount(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleInitAdmin}
                      disabled={
                        initLoading || !adminPhone.trim() || !initSlotCount
                      }
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {initLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Star size={16} />
                      )}
                      Initialize {initSlotCount || "N"} Admin Slots
                    </button>
                    {initMessage && (
                      <p
                        className={`text-sm ${initMessage.type === "success" ? "text-green-700" : "text-red-600"}`}
                      >
                        {initMessage.text}
                      </p>
                    )}
                  </div>
                )}

                {/* Slots exist */}
                {!loadingSlots && slots.length > 0 && (
                  <>
                    {/* Increase slots section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Plus size={16} className="text-indigo-500" />
                        Increase Admin Slots
                      </h3>
                      <p className="text-xs text-gray-500">
                        Current total:{" "}
                        <strong>{summary?.totalSlots ?? slots.length}</strong>{" "}
                        slots. Add more to allow sending credits to more users
                        for this voucher. Admin sends credits directly from the
                        mobile app.
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={increaseCount}
                          onChange={(e) => setIncreaseCount(e.target.value)}
                          className="w-28 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Count"
                        />
                        <input
                          type="number"
                          min="1"
                          value={increaseCreditAmount}
                          onChange={(e) =>
                            setIncreaseCreditAmount(e.target.value)
                          }
                          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Credits per slot (optional)"
                        />
                        <button
                          onClick={handleIncreaseSlots}
                          disabled={increaseLoading}
                          className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                        >
                          {increaseLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Plus size={16} />
                          )}
                          Add {increaseCount || "N"} Slots
                        </button>
                      </div>
                      {increaseMsg && (
                        <div
                          className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${increaseMsg.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
                        >
                          {increaseMsg.type === "success" ? (
                            <CheckCircle
                              size={15}
                              className="mt-0.5 shrink-0"
                            />
                          ) : (
                            <AlertCircle
                              size={15}
                              className="mt-0.5 shrink-0"
                            />
                          )}
                          {increaseMsg.text}
                        </div>
                      )}
                    </div>

                    {/* Delete slots section */}
                    <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                          <Trash2 size={16} className="text-red-500" />
                          Delete Slots
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setDeleteMode(!deleteMode);
                              setSelectedForDelete(new Set());
                              setDeleteMsg(null);
                            }}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${deleteMode ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                          >
                            {deleteMode ? "Cancel" : "Select Slots"}
                          </button>
                          <button
                            onClick={() => handleDeleteSlots(true)}
                            disabled={deleteLoading}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                          >
                            {deleteLoading ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            Delete All
                          </button>
                        </div>
                      </div>

                      {deleteMode && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">
                            Select slots to permanently remove from the
                            database.
                            {selectedForDelete.size > 0 && (
                              <span className="ml-1 font-medium text-red-600">
                                {selectedForDelete.size} selected
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {slots.map((slot) => (
                              <button
                                key={slot.slotNumber}
                                onClick={() => {
                                  setSelectedForDelete((prev) => {
                                    const next = new Set(prev);
                                    next.has(slot.slotNumber)
                                      ? next.delete(slot.slotNumber)
                                      : next.add(slot.slotNumber);
                                    return next;
                                  });
                                }}
                                className={`w-10 h-10 rounded-lg text-sm font-medium border-2 transition-colors ${
                                  selectedForDelete.has(slot.slotNumber)
                                    ? "bg-red-600 text-white border-red-600"
                                    : slot.status === "sent"
                                      ? "bg-green-50 text-green-700 border-green-300 hover:border-red-400"
                                      : "bg-gray-50 text-gray-700 border-gray-200 hover:border-red-400"
                                }`}
                              >
                                {slot.slotNumber}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => handleDeleteSlots(false)}
                            disabled={
                              deleteLoading || selectedForDelete.size === 0
                            }
                            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                          >
                            {deleteLoading ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            Delete {selectedForDelete.size} Selected Slot
                            {selectedForDelete.size !== 1 ? "s" : ""}
                          </button>
                        </div>
                      )}

                      {deleteMsg && (
                        <div
                          className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${deleteMsg.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
                        >
                          {deleteMsg.type === "success" ? (
                            <CheckCircle
                              size={15}
                              className="mt-0.5 shrink-0"
                            />
                          ) : (
                            <AlertCircle
                              size={15}
                              className="mt-0.5 shrink-0"
                            />
                          )}
                          {deleteMsg.text}
                        </div>
                      )}
                    </div>

                    {/* Slot list */}
                    <div className="grid gap-3">
                      {slots.map((slot) => (
                        <div
                          key={slot.slotNumber}
                          className={`rounded-xl border ${slotColor(slot)} shadow-sm overflow-hidden`}
                        >
                          <button
                            className="w-full flex items-center justify-between px-4 py-3"
                            onClick={() =>
                              setExpandedSlot(
                                expandedSlot === slot.slotNumber
                                  ? null
                                  : slot.slotNumber,
                              )
                            }
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  slot.status === "sent"
                                    ? "bg-green-100 text-green-700"
                                    : slot.status === "expired"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {slot.slotNumber}
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-medium text-gray-900">
                                  Slot #{slot.slotNumber}
                                  <span
                                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                      slot.status === "sent"
                                        ? "bg-green-100 text-green-700"
                                        : slot.status === "expired"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    {slot.status}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500">
                                  {slot.creditAmount?.toLocaleString()} credits
                                  {slot.recipientName
                                    ? `  ${slot.recipientName}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            {expandedSlot === slot.slotNumber ? (
                              <ChevronUp size={16} className="text-gray-400" />
                            ) : (
                              <ChevronDown
                                size={16}
                                className="text-gray-400"
                              />
                            )}
                          </button>

                          {expandedSlot === slot.slotNumber && (
                            <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50 text-sm space-y-1.5">
                              <p className="text-gray-600">
                                <span className="font-medium">Credits:</span>{" "}
                                {slot.creditAmount?.toLocaleString()}
                              </p>
                              {slot.recipientName && (
                                <p className="text-gray-600">
                                  <span className="font-medium">
                                    Recipient:
                                  </span>{" "}
                                  {slot.recipientName} ({slot.recipientPhone})
                                </p>
                              )}
                              {slot.sentAt && (
                                <p className="text-gray-600">
                                  <span className="font-medium">Sent at:</span>{" "}
                                  {new Date(slot.sentAt).toLocaleString()}
                                </p>
                              )}
                              {slot.expiresAt && (
                                <p className="text-gray-600">
                                  <span className="font-medium">
                                    Expires at:
                                  </span>{" "}
                                  {new Date(slot.expiresAt).toLocaleString()}
                                </p>
                              )}
                              {slot.isAvailable && (
                                <p className="text-xs text-indigo-500 mt-2 italic flex items-center gap-1">
                                  Send credits from this slot via the mobile app
                                  using your admin account.
                                </p>
                              )}
                              <button
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      `Permanently delete Slot #${slot.slotNumber}? This cannot be undone.`,
                                    )
                                  )
                                    return;
                                  setDeleteLoading(true);
                                  setDeleteMsg(null);
                                  try {
                                    const res = await api.delete(
                                      "/api/admin/mlm/slots",
                                      {
                                        data: {
                                          voucherId: selectedVoucher!._id,
                                          slotNumbers: [slot.slotNumber],
                                        },
                                      },
                                    );
                                    if (res.success) {
                                      setDeleteMsg({
                                        type: "success",
                                        text: res.message || "Slot deleted",
                                      });
                                      setExpandedSlot(null);
                                      fetchSlots();
                                    }
                                  } catch (err: any) {
                                    setDeleteMsg({
                                      type: "error",
                                      text: err.message || "Failed to delete",
                                    });
                                  } finally {
                                    setDeleteLoading(false);
                                  }
                                }}
                                disabled={deleteLoading}
                                className="mt-2 flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                              >
                                {deleteLoading ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                                Delete this slot
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/*  PENDING APPROVALS TAB  */}
            {tab === "pending" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <Clock size={18} className="text-orange-500" />
                    Pending Payment Approvals
                  </h2>
                  <button
                    onClick={fetchPending}
                    disabled={loadingPending}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    <RefreshCw
                      size={16}
                      className={loadingPending ? "animate-spin" : ""}
                    />
                  </button>
                </div>

                {approvalMsg && (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-xl border ${approvalMsg.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
                  >
                    {approvalMsg.type === "success" ? (
                      <CheckCircle size={18} className="shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{approvalMsg.text}</p>
                  </div>
                )}

                {loadingPending && (
                  <div className="flex justify-center py-12">
                    <Loader2
                      size={28}
                      className="animate-spin text-orange-400"
                    />
                  </div>
                )}

                {!loadingPending && pendingCredits.length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm">
                    <CheckCircle
                      size={40}
                      className="mx-auto text-green-400 mb-3"
                    />
                    <p className="font-medium text-gray-700">
                      No pending approvals
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      All MLM credit payments have been processed.
                    </p>
                  </div>
                )}

                {pendingCredits.map((credit) => (
                  <div
                    key={credit.id}
                    className="bg-white rounded-xl border border-orange-200 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {credit.sender?.name}{" "}
                          <span className="text-gray-400 font-normal"></span>{" "}
                          {credit.receiver?.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {credit.sender?.phone} {credit.receiver?.phone}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                        Qty: {credit.quantity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">
                      Confirmed at:{" "}
                      {new Date(credit.paymentConfirmedAt).toLocaleString()}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(credit.id)}
                        disabled={processingId === credit.id}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        {processingId === credit.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle size={15} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(credit.id)}
                        disabled={processingId === credit.id}
                        className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        <AlertCircle size={15} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MLMCreditsPage() {
  return (
    <AuthGuard>
      <MLMCreditsContent />
    </AuthGuard>
  );
}
