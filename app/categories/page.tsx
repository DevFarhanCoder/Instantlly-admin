"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Search,
  RefreshCw,
  Loader2,
  Tag,
  Layers,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Database,
  Inbox,
  Upload,
  FileText,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import { api } from "../lib/api";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Category {
  _id: string;
  name: string;
  icon: string;
  subcategories: string[];
  isActive: boolean;
  order: number;
  createdAt: string;
}

interface CustomService {
  _id: string;
  serviceName: string;
  userName?: string;
  parentCategory?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

type Tab = "categories" | "custom-services";

// ─────────────────────────────────────────────────────────────
// Toast helper
// ─────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const show = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  return { toast, show };
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function CategoriesContent() {
  const router = useRouter();
  const { toast, show: showToast } = useToast();

  // ── state ──
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [loading, setLoading] = useState(true);
  const [csLoading, setCsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Add Category modal ──
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📁");
  const [addingCategory, setAddingCategory] = useState(false);

  // ── Edit Category modal ──
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Add Subcategory inline ──
  const [addSubFor, setAddSubFor] = useState<string | null>(null); // categoryId
  const [newSubName, setNewSubName] = useState("");
  const [addingSub, setAddingSub] = useState(false);

  // ── Seed ──
  const [seeding, setSeeding] = useState(false);

  // ── Custom service approve modal ──
  const [approveCs, setApproveCs] = useState<CustomService | null>(null);
  const [approveAs, setApproveAs] = useState<"category" | "subcategory">("subcategory");
  const [approveCatId, setApproveCatId] = useState("");
  const [approvingCs, setApprovingCs] = useState(false);
  const [rejectingCs, setRejectingCs] = useState<string | null>(null);

  // ── CSV Upload ──
  const [csvUploadFor, setCsvUploadFor] = useState<{
    catId: string;
    catName: string;
    subcategory: string;
  } | null>(null);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [uploadingCsv, setUploadingCsv] = useState(false);

  // ─────────────────────────────────────────────────────────
  // Fetch data
  // ─────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/categories/admin/all");
      setCategories(data.data || []);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Failed to fetch categories", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomServices = useCallback(async () => {
    setCsLoading(true);
    try {
      const data = await api.get("/api/categories/admin/custom-services", {
        params: { status: "all", limit: 100 },
      });
      setCustomServices(data.data || []);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Failed to fetch custom services", "error");
    } finally {
      setCsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchCustomServices();
  }, [fetchCategories, fetchCustomServices]);

  // ─────────────────────────────────────────────────────────
  // CSV helpers
  // ─────────────────────────────────────────────────────────
  const parseCSVText = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return { headers: [], rows: [] };

    const splitRow = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = splitRow(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
    const rows = lines.slice(1).map((line) => {
      const vals = splitRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (vals[i] || "").replace(/^"|"$/g, "").trim(); });
      return row;
    });
    return { headers, rows };
  };

  const handleCsvFile = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSVText(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (!csvUploadFor || csvRows.length === 0) return;
    setUploadingCsv(true);
    try {
      const res = await api.post("/api/categories/admin/upload-companies", {
        subcategory: csvUploadFor.subcategory,
        category: csvUploadFor.catName,
        rows: csvRows,
      });
      showToast(res.message || `Uploaded ${res.created} companies`);
      if (res.errors?.length) {
        console.warn("Upload skips:", res.errors);
      }
      setCsvUploadFor(null);
      setCsvRows([]);
      setCsvHeaders([]);
      setCsvFileName("");
    } catch (err: any) {
      showToast(
        err?.response?.data?.error || "CSV upload failed. Please check the backend is deployed.",
        "error"
      );
    } finally {
      setUploadingCsv(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Derived counts
  // ─────────────────────────────────────────────────────────
  const totalSubs = categories.reduce(
    (acc, c) => acc + (c.subcategories?.length || 0),
    0
  );
  const pendingCount = customServices.filter((cs) => cs.status === "pending").length;
  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.subcategories || []).some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // ─────────────────────────────────────────────────────────
  // Seed categories
  // ─────────────────────────────────────────────────────────
  const handleSeed = async () => {
    if (
      !window.confirm(
        "This will seed 11 default categories from the hardcoded list.\nExisting categories will be updated (new subcategories merged).\n\nProceed?"
      )
    )
      return;
    setSeeding(true);
    try {
      const res = await api.post("/api/categories/admin/seed", {});
      showToast(res.message || "Categories seeded successfully");
      fetchCategories();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Seed failed", "error");
    } finally {
      setSeeding(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Add category
  // ─────────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCategory(true);
    try {
      await api.post("/api/categories/admin/add-category", {
        name: newCatName.trim(),
        icon: newCatIcon || "📁",
      });
      showToast(`Category "${newCatName}" added`);
      setNewCatName("");
      setNewCatIcon("📁");
      setShowAddCategory(false);
      fetchCategories();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Failed to add category", "error");
    } finally {
      setAddingCategory(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Edit / toggle active
  // ─────────────────────────────────────────────────────────
  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setEditName(cat.name);
    setEditIcon(cat.icon);
  };

  const handleSaveEdit = async () => {
    if (!editCat) return;
    setSavingEdit(true);
    try {
      await api.put(`/api/categories/admin/category/${editCat._id}`, {
        name: editName.trim() || editCat.name,
        icon: editIcon || editCat.icon,
      });
      showToast(`Category updated`);
      setEditCat(null);
      fetchCategories();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Update failed", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await api.put(`/api/categories/admin/category/${cat._id}`, {
        isActive: !cat.isActive,
      });
      showToast(`"${cat.name}" ${cat.isActive ? "disabled" : "enabled"}`);
      fetchCategories();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Toggle failed", "error");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Delete category
  // ─────────────────────────────────────────────────────────
  const handleDeleteCategory = async (cat: Category) => {
    if (
      !window.confirm(
        `Delete category "${cat.name}" and its ${cat.subcategories?.length || 0} subcategories?\n\nThis cannot be undone.`
      )
    )
      return;
    try {
      await api.delete(`/api/categories/admin/category/${cat._id}`);
      showToast(`Category "${cat.name}" deleted`);
      fetchCategories();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Delete failed", "error");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Add subcategory
  // ─────────────────────────────────────────────────────────
  const handleAddSub = async (categoryId: string) => {
    if (!newSubName.trim()) return;
    setAddingSub(true);
    try {
      await api.post("/api/categories/admin/add-subcategory", {
        categoryId,
        subcategoryName: newSubName.trim(),
      });
      showToast(`Subcategory "${newSubName}" added`);
      setNewSubName("");
      setAddSubFor(null);
      fetchCategories();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Failed to add subcategory", "error");
    } finally {
      setAddingSub(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Remove subcategory
  // ─────────────────────────────────────────────────────────
  const handleRemoveSub = async (cat: Category, subName: string) => {
    if (!window.confirm(`Remove subcategory "${subName}" from "${cat.name}"?`)) return;
    try {
      await api.delete(
        `/api/categories/admin/category/${cat._id}/subcategory/${encodeURIComponent(subName)}`
      );
      showToast(`"${subName}" removed`);
      fetchCategories();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Remove failed", "error");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Approve custom service
  // ─────────────────────────────────────────────────────────
  const handleApproveCustom = async () => {
    if (!approveCs) return;
    if (approveAs === "subcategory" && !approveCatId) {
      showToast("Please select a parent category", "error");
      return;
    }
    setApprovingCs(true);
    try {
      const body: any = { approveAs };
      if (approveAs === "subcategory") body.categoryId = approveCatId;
      await api.put(`/api/categories/admin/approve-custom/${approveCs._id}`, body);
      showToast(`"${approveCs.serviceName}" approved as ${approveAs}`);
      setApproveCs(null);
      setApproveCatId("");
      fetchCategories();
      fetchCustomServices();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Approve failed", "error");
    } finally {
      setApprovingCs(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Reject custom service
  // ─────────────────────────────────────────────────────────
  const handleRejectCustom = async (cs: CustomService) => {
    if (!window.confirm(`Reject "${cs.serviceName}"?`)) return;
    setRejectingCs(cs._id);
    try {
      await api.put(`/api/categories/admin/reject-custom/${cs._id}`, {});
      showToast(`"${cs.serviceName}" rejected`);
      fetchCustomServices();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Reject failed", "error");
    } finally {
      setRejectingCs(null);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-violet-600" />
              Category Manager
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage categories, subcategories, and user-submitted service requests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchCategories();
              fetchCustomServices();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {seeding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            Seed Default Categories
          </button>
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard
            icon={<Layers className="w-6 h-6 text-violet-600" />}
            bg="bg-violet-50"
            label="Total Categories"
            value={categories.length}
            sub={`${categories.filter((c) => c.isActive).length} active`}
          />
          <StatCard
            icon={<Tag className="w-6 h-6 text-blue-600" />}
            bg="bg-blue-50"
            label="Total Subcategories"
            value={totalSubs}
            sub="across all categories"
          />
          <StatCard
            icon={<Inbox className="w-6 h-6 text-amber-600" />}
            bg="bg-amber-50"
            label="Custom Service Requests"
            value={pendingCount}
            sub="pending review"
            highlight={pendingCount > 0}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-200 p-1 rounded-xl w-fit mb-6">
          {(
            [
              { key: "categories", label: "Categories" },
              {
                key: "custom-services",
                label: `Custom Service Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}`,
              },
            ] as { key: Tab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            TAB: CATEGORIES
        ══════════════════════════════════════════════════ */}
        {tab === "categories" && (
          <div>
            {/* Search */}
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories or subcategories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : filteredCategories.length === 0 ? (
              <EmptyState
                title="No categories found"
                desc={
                  searchQuery
                    ? "Try a different search"
                    : "Click 'Seed Default Categories' to populate or 'Add Category' to create one."
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredCategories.map((cat) => (
                  <CategoryCard
                    key={cat._id}
                    cat={cat}
                    expanded={expandedId === cat._id}
                    onToggleExpand={() =>
                      setExpandedId(expandedId === cat._id ? null : cat._id)
                    }
                    onEdit={() => openEdit(cat)}
                    onToggleActive={() => handleToggleActive(cat)}
                    onDelete={() => handleDeleteCategory(cat)}
                    onRemoveSub={(sub) => handleRemoveSub(cat, sub)}
                    onUploadCsv={(sub) =>
                      setCsvUploadFor({ catId: cat._id, catName: cat.name, subcategory: sub })
                    }
                    addSubFor={addSubFor}
                    newSubName={newSubName}
                    addingSub={addingSub}
                    onOpenAddSub={() => {
                      setAddSubFor(cat._id);
                      setNewSubName("");
                    }}
                    onSubNameChange={setNewSubName}
                    onAddSub={() => handleAddSub(cat._id)}
                    onCancelAddSub={() => {
                      setAddSubFor(null);
                      setNewSubName("");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: CUSTOM SERVICES
        ══════════════════════════════════════════════════ */}
        {tab === "custom-services" && (
          <div>
            {csLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : customServices.length === 0 ? (
              <EmptyState
                title="No custom service requests"
                desc="User-submitted service requests will appear here."
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Service Name", "Submitted By", "Parent Category", "Status", "Date", "Actions"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {customServices.map((cs) => (
                      <tr key={cs._id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">{cs.serviceName}</td>
                        <td className="px-5 py-3 text-gray-600">{cs.userName || "—"}</td>
                        <td className="px-5 py-3 text-gray-600">{cs.parentCategory || "—"}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={cs.status} />
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {new Date(cs.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3">
                          {cs.status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setApproveCs(cs);
                                  setApproveAs("subcategory");
                                  setApproveCatId("");
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors font-medium"
                              >
                                <Check className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectCustom(cs)}
                                disabled={rejectingCs === cs._id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                              >
                                {rejectingCs === cs._id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No actions</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL: Add Category
      ══════════════════════════════════════════════════ */}
      {showAddCategory && (
        <Modal title="Add New Category" onClose={() => setShowAddCategory(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Healthcare"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon (emoji)
              </label>
              <input
                type="text"
                placeholder="📁"
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Paste any emoji — e.g. 🏥 🚗 💼 🎓 🛒 ✈️ 🔨 💻
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddCategory(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={addingCategory || !newCatName.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {addingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Category
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Edit Category
      ══════════════════════════════════════════════════ */}
      {editCat && (
        <Modal title={`Edit — ${editCat.name}`} onClose={() => setEditCat(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon (emoji)
              </label>
              <input
                type="text"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditCat(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Approve Custom Service
      ══════════════════════════════════════════════════ */}
      {approveCs && (
        <Modal
          title={`Approve — "${approveCs.serviceName}"`}
          onClose={() => setApproveCs(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              How would you like to add{" "}
              <span className="font-semibold text-gray-800">"{approveCs.serviceName}"</span>?
            </p>

            <div className="grid grid-cols-2 gap-3">
              {(["subcategory", "category"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setApproveAs(opt)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    approveAs === opt
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt === "category" ? "🆕 New Category" : "📌 Subcategory of…"}
                </button>
              ))}
            </div>

            {approveAs === "subcategory" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={approveCatId}
                  onChange={(e) => setApproveCatId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">— Select a category —</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setApproveCs(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveCustom}
                disabled={approvingCs || (approveAs === "subcategory" && !approveCatId)}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {approvingCs ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: CSV Upload Companies
      ══════════════════════════════════════════════════ */}
      {csvUploadFor && (
        <Modal
          title={`Upload Companies — ${csvUploadFor.subcategory}`}
          onClose={() => {
            setCsvUploadFor(null);
            setCsvRows([]);
            setCsvHeaders([]);
            setCsvFileName("");
          }}
        >
          <div className="space-y-4">
            {/* Context badges */}
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full font-medium">
                {csvUploadFor.catName}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                {csvUploadFor.subcategory}
              </span>
            </div>

            {/* CSV format hint */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Required CSV Headers
              </p>
              <code className="text-xs text-amber-900 break-all leading-relaxed">
                businessName, ownerName, description, phone, whatsapp, email, website, area, city, state, pincode, listingType
              </code>
              <p className="text-xs text-amber-700 mt-1.5">
                ✦ <strong>businessName</strong> &amp; <strong>phone</strong> required per row &nbsp;·&nbsp;
                listingType: <em>free</em> or <em>promoted</em> (default: free)
              </p>
            </div>

            {/* File picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Choose CSV File</label>
              <label className="flex flex-col items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCsvFile(f);
                  }}
                />
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {csvFileName ? (
                    <span className="text-violet-700 font-medium">{csvFileName}</span>
                  ) : "Click to upload CSV"}
                </span>
              </label>
            </div>

            {/* Preview table */}
            {csvRows.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Preview — {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} detected
                </p>
                <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-44">
                  <table className="text-xs min-w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {["businessName", "phone", "city", "listingType"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {["businessName", "phone", "city", "listingType"].map((h) => (
                            <td key={h} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">
                              {row[h] || <span className="text-gray-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvRows.length > 5 && (
                  <p className="text-xs text-gray-400 mt-1">&hellip;and {csvRows.length - 5} more rows</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => {
                  setCsvUploadFor(null);
                  setCsvRows([]);
                  setCsvHeaders([]);
                  setCsvFileName("");
                }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCsvUpload}
                disabled={uploadingCsv || csvRows.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {uploadingCsv ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {csvRows.length > 0 ? `Upload ${csvRows.length} Companies` : "Upload"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function StatCard({
  icon,
  bg,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border ${
        highlight ? "border-amber-300" : "border-gray-200"
      } p-5 flex items-center gap-4`}
    >
      <div className={`${bg} p-3 rounded-xl`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

function CategoryCard({
  cat,
  expanded,
  onToggleExpand,
  onEdit,
  onToggleActive,
  onDelete,
  onRemoveSub,
  onUploadCsv,
  addSubFor,
  newSubName,
  addingSub,
  onOpenAddSub,
  onSubNameChange,
  onAddSub,
  onCancelAddSub,
}: {
  cat: Category;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onRemoveSub: (sub: string) => void;
  onUploadCsv: (sub: string) => void;
  addSubFor: string | null;
  newSubName: string;
  addingSub: boolean;
  onOpenAddSub: () => void;
  onSubNameChange: (v: string) => void;
  onAddSub: () => void;
  onCancelAddSub: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        cat.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
      }`}
    >
      {/* Category header row */}
      <div className="flex items-center px-5 py-4 gap-3">
        {/* Emoji + name */}
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <span className="text-2xl w-9 text-center shrink-0">{cat.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-base">{cat.name}</span>
              {!cat.isActive && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {cat.subcategories?.length || 0} subcategories
            </span>
          </div>
          <span className="ml-2 text-gray-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-violet-600 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleActive}
            className={`p-2 rounded-lg transition-colors ${
              cat.isActive
                ? "text-green-600 hover:bg-green-50"
                : "text-gray-400 hover:bg-gray-100"
            }`}
            title={cat.isActive ? "Disable" : "Enable"}
          >
            {cat.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded: subcategories */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          {/* Subcategory tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(cat.subcategories || []).length === 0 ? (
              <span className="text-sm text-gray-400 italic">No subcategories yet</span>
            ) : (
              (cat.subcategories || []).map((sub) => (
                <span
                  key={sub}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium group"
                >
                  {sub}
                  <button
                    onClick={() => onUploadCsv(sub)}
                    className="text-gray-400 hover:text-violet-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Upload companies via CSV"
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemoveSub(sub)}
                    className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove subcategory"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Add subcategory inline */}
          {addSubFor === cat._id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New subcategory name..."
                value={newSubName}
                onChange={(e) => onSubNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAddSub();
                  if (e.key === "Escape") onCancelAddSub();
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                autoFocus
              />
              <button
                onClick={onAddSub}
                disabled={addingSub || !newSubName.trim()}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {addingSub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Add
              </button>
              <button
                onClick={onCancelAddSub}
                className="px-3 py-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAddSub}
              className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Subcategory
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    pending: {
      cls: "bg-amber-100 text-amber-700",
      icon: <AlertCircle className="w-3 h-3" />,
      label: "Pending",
    },
    approved: {
      cls: "bg-green-100 text-green-700",
      icon: <CheckCircle className="w-3 h-3" />,
      label: "Approved",
    },
    rejected: {
      cls: "bg-red-100 text-red-700",
      icon: <XCircle className="w-3 h-3" />,
      label: "Rejected",
    },
  };
  const cfg = map[status] || map["pending"];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
      <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-700 font-medium">{title}</p>
      <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Export with AuthGuard
// ─────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  return (
    <AuthGuard>
      <CategoriesContent />
    </AuthGuard>
  );
}
