"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  RefreshCw,
  Loader2,
  Tag,
  Layers,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Database,
  Inbox,
  Upload,
  FileText,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  FolderPlus,
  Building2,
  LayoutGrid,
  List,
  Sparkles,
  Link2,
  Zap,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import { api } from "../lib/api";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface CategoryNode {
  _id: string;
  name: string;
  icon: string;
  level: number;
  order: number;
  isActive: boolean;
  parent_id?: string | null;
  subcategories?: string[]; // legacy flat list (root nodes)
  children: CategoryNode[];
}

interface FlatCategory {
  _id: string;
  name: string;
  icon: string;
  subcategories: string[];
  isActive: boolean;
  order: number;
  level?: number;
  parent_id?: string | null;
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

// Breadcrumb entry: { id, name, icon }
interface BreadcrumbEntry {
  id: string;
  name: string;
  icon: string;
}

// ─────────────────────────────────────────────────────────────
// Bulk Import Types
// ─────────────────────────────────────────────────────────────
interface BulkRow { businessName: string; area: string; phone: string; city: string; }
// N-level recursive node — each node can have its own businesses + sub-nodes
interface BulkCatNode { emoji: string; rows: BulkRow[]; children: Record<string, BulkCatNode>; }
interface BulkImportData {
  tree: Record<string, BulkCatNode>;   // root cat name → node (N-level recursive)
  totalBiz: number;
  maxDepth: number;       // 1 = root only, 2 = has sub-cats, 3 = sub-sub-cats…
  totalCatCount: number;  // total unique nodes across all levels
  mainCatCount: number;   // root count (legacy)
  subCatCount: number;    // level-2 count (legacy)
}

// ─────────────────────────────────────────────────────────────
// Toast helper
// ─────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const show = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

// ─────────────────────────────────────────────────────────────
// Duplicate detection types (mirrors backend)
// ─────────────────────────────────────────────────────────────
interface DuplicateMatch {
  _id: string;
  name: string;
  icon: string;
  level: number;
  matchType: "exact" | "case-insensitive" | "normalized-exact" | "similar";
  similarity: number;
  normalizedName: string;
}

interface DuplicateCheckResult {
  normalizedInput: string;
  previewName: string;
  isDuplicate: boolean;
  hasSimilar: boolean;
  hasWarning: boolean;
  exactMatch: DuplicateMatch | null;
  similarMatches: DuplicateMatch[];
}

// ─────────────────────────────────────────────────────────────
// useDuplicateCheck – debounced live duplicate detection hook
// ─────────────────────────────────────────────────────────────
function useDuplicateCheck(parentId: string | null) {
  const [name, setName]         = useState("");
  const [result, setResult]     = useState<DuplicateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(
    (inputName: string) => {
      setName(inputName);
      setResult(null);
      if (!inputName.trim() || inputName.trim().length < 2) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setChecking(true);
        try {
          const res = await api.post("/api/categories/admin/check-duplicate", {
            name: inputName.trim(),
            parent_id: parentId || null,
          });
          setResult(res as DuplicateCheckResult);
        } catch {
          // silently ignore check errors
        } finally {
          setChecking(false);
        }
      }, 400);
    },
    [parentId]
  );

  const reset = useCallback(() => {
    setName("");
    setResult(null);
    setChecking(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { name, result, checking, check, reset };
}

// ─────────────────────────────────────────────────────────────
// DuplicateWarningPanel – shown inside Add modals
// ─────────────────────────────────────────────────────────────
function DuplicateWarningPanel({
  result,
  checking,
  force,
  onForce,
  onUseExisting,
}: {
  result: DuplicateCheckResult | null;
  checking: boolean;
  force: boolean;
  onForce: () => void;
  onUseExisting: (match: DuplicateMatch) => void;
}) {
  if (checking) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking for duplicates…
      </div>
    );
  }
  if (!result) return null;

  // ── Normalized preview badge (always shown when result available) ─────────
  const preview = result.previewName;
  const isReduced = preview && preview.toLowerCase() !== result.normalizedInput &&
    result.normalizedInput !== "";

  return (
    <div className="space-y-2">
      {/* Normalized name preview */}
      {preview && (
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="text-gray-500">Normalized preview:</span>
          <span className="font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
            {preview}
          </span>
          {isReduced && (
            <span className="text-gray-400 italic">← stripped filler words</span>
          )}
        </div>
      )}

      {/* Exact duplicate warning */}
      {result.isDuplicate && result.exactMatch && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-sm font-bold text-red-700">Duplicate detected</span>
          </div>
          <p className="text-xs text-red-600 mb-2">
            <strong>&ldquo;{result.exactMatch.name}&rdquo;</strong> already exists (case-insensitive match).
          </p>
          <button
            onClick={() => onUseExisting(result.exactMatch!)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
          >
            <Link2 className="w-3 h-3" />
            Use existing category instead
          </button>
        </div>
      )}

      {/* Similar categories warning */}
      {!result.isDuplicate && result.hasSimilar && (
        <div className={`border rounded-xl p-3 ${
          force ? "bg-amber-50 border-amber-300" : "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm font-bold text-amber-700">
                Similar {result.similarMatches.length} categor{result.similarMatches.length === 1 ? "y" : "ies"} found
              </span>
            </div>
            {!force ? (
              <button
                onClick={onForce}
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-semibold"
              >
                <Zap className="w-3 h-3" /> Create anyway
              </button>
            ) : (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Will create new</span>
            )}
          </div>
          <div className="space-y-1.5">
            {result.similarMatches.map((m) => (
              <div key={m._id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                <span className="text-base shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-800 truncate block">{m.name}</span>
                  <span className="text-[10px] text-gray-400">
                    {m.matchType === "normalized-exact" ? "Same core keyword" :
                     m.matchType === "similar" ? `${Math.round(m.similarity * 100)}% similar` :
                     m.matchType}
                  </span>
                </div>
                <button
                  onClick={() => onUseExisting(m)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors font-medium shrink-0"
                >
                  <Link2 className="w-3 h-3" /> Use this
                </button>
              </div>
            ))}
          </div>
          {!force && (
            <p className="text-[10px] text-amber-600 mt-2">
              Click &ldquo;Create anyway&rdquo; above to create a new category despite the similarity.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CSV parser helper
// ─────────────────────────────────────────────────────────────
function parseCSVText(text: string): { headers: string[]; rows: Record<string, string>[] } {
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
}

// ─────────────────────────────────────────────────────────────
// Emoji map for known main categories
// ─────────────────────────────────────────────────────────────
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  "ac & appliances": "❄️",
  "agriculture": "🌾",
  "apprael & fashion": "👗",
  "apparel & fashion": "👗",
  "astrology & spiritual": "🔮",
  "automotive": "🚗",
  "baby care & products": "🍼",
  "baby care": "🍼",
  "beauty & wellness": "💄",
  "business services": "💼",
  "chemical & industrial supplies": "⚗️",
  "cinemas & entertainment": "🎬",
  "education": "🎓",
  "electronics": "📱",
  "food & dining": "🍕",
  "food & restaurant": "🍕",
  "restaurants": "🍽️",
  "health & medical": "🏥",
  "home services": "🏠",
  "home & decor": "🛋️",
  "hotels & travel": "✈️",
  "travel": "✈️",
  "legal services": "⚖️",
  "real estate": "🏗️",
  "sports & fitness": "💪",
  "transport": "🚌",
  "finance": "💰",
  "insurance": "🛡️",
  "construction": "🔨",
  "cleaning services": "🧹",
  "pet care": "🐾",
  "events": "🎉",
  "photography": "📷",
  "plumbing": "🔧",
  "electrical": "⚡",
  "painting": "🎨",
  "catering": "🍽️",
  "wedding": "💍",
  "florist": "🌸",
  "grocery": "🛒",
  "pharmacy": "💊",
  "hospital": "🏥",
  "dentist": "🦷",
  "gym": "🏋️",
  "yoga": "🧘",
  "spa": "💆",
  "hair salon": "💈",
  "tailoring": "🧵",
  "shoes": "👟",
  "jewelry": "💎",
  "furniture": "🛋️",
  "books": "📚",
  "music": "🎵",
  "gaming": "🎮",
  "packers & movers": "📦",
  "courier": "📬",
  "it services": "💻",
  "software": "💻",
  "security": "🔒",
};

// ─────────────────────────────────────────────────────────────
// Fuzzy category-name matching helpers
// ─────────────────────────────────────────────────────────────
/** Lowercase + strip punctuation → spaces + collapse whitespace */
function normalizeCatName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&/\\|\-_.,;:!?()'"+@#%*[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CAT_STOP_WORDS = new Set(["and", "or", "the", "a", "an", "of", "in", "at", "for", "to", "with", "by"]);
function catNameWords(name: string): Set<string> {
  return new Set(
    normalizeCatName(name)
      .split(" ")
      .filter((w) => w.length > 1 && !CAT_STOP_WORDS.has(w))
  );
}

/**
 * Returns true when two category names have the same meaning:
 *   1. Identical after normalization
 *   2. One is a substring of the other ("Hotels" ⊂ "Hotels & Restaurants")
 *   3. Jaccard word-set similarity ≥ 0.55 ("Auto Repair" vs "Auto Repairs")
 */
function fuzzyMatchCatNames(a: string, b: string): boolean {
  const na = normalizeCatName(a);
  const nb = normalizeCatName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = catNameWords(a);
  const wb = catNameWords(b);
  if (wa.size === 0 || wb.size === 0) return false;
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return intersection / union >= 0.55;
}

/**
 * Search a name→id map using fuzzy matching.
 * Returns the matched ID, or null if nothing matches.
 */
function fuzzyFindInMap(map: Record<string, string>, name: string): string | null {
  // 1. Exact key first (fast path)
  const exact = map[normalizeCatName(name)];
  if (exact) return exact;
  // 2. Fuzzy scan
  for (const [key, id] of Object.entries(map)) {
    if (fuzzyMatchCatNames(key, name)) return id;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Bulk CSV Parser – N-level hierarchy support
//   Required columns : Name, Main Category
//   Optional columns : Sub Category, Sub Sub Category, Sub Sub Sub Category, …
//                      (any column containing both "sub" and "cat" after Main Category)
//   Optional columns : locatcity/address, Mobile no, City
// ─────────────────────────────────────────────────────────────
function parseBulkCSV(text: string): BulkImportData | null {
  const lines = text.split("\n");

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result.map(c => c.replace(/^"|"$/g, "").trim());
  };

  // Find the header row (must contain both "name" and "main category")
  let headerIdx = -1;
  let headerCols: string[] = [];
  for (let i = 0; i < Math.min(25, lines.length); i++) {
    const cols = splitLine(lines[i]);
    if (
      cols.some(c => c.toLowerCase() === "name") &&
      cols.some(c => c.toLowerCase().includes("main category"))
    ) {
      headerIdx = i;
      headerCols = cols;
      break;
    }
  }
  if (headerIdx === -1) return null;

  const nameIdx    = headerCols.findIndex(c => c.toLowerCase() === "name");
  const addressIdx = headerCols.findIndex(c => c.toLowerCase().includes("locat"));
  const mainCatIdx = headerCols.findIndex(c => c.toLowerCase().includes("main category"));
  const phoneIdx   = headerCols.findIndex(c => c.toLowerCase().includes("mobile"));
  const cityIdx    = headerCols.findIndex(c => c.toLowerCase() === "city");

  // Detect ALL sub-category level columns (must contain "sub" AND "cat"), left-to-right after mainCatIdx
  // e.g. "Sub Category", "Sub Sub Category", "Sub Sub Sub Category", "Sub Category 2", etc.
  const subCatIdxs: number[] = headerCols
    .map((col, idx) => ({ col: col.toLowerCase(), idx }))
    .filter(({ col, idx }) => idx > mainCatIdx && col.includes("sub") && col.includes("cat"))
    .sort((a, b) => a.idx - b.idx)
    .map(({ idx }) => idx);

  const tree: Record<string, BulkCatNode> = {};
  let totalBiz = 0;
  let maxDepth = 1;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitLine(line);
    const mainCat = mainCatIdx >= 0 ? cols[mainCatIdx] : "";
    const name    = nameIdx >= 0 ? cols[nameIdx] : "";
    if (!mainCat || !name) continue;

    // Build sub-level path: read each sub-cat column, stop at first empty one
    const subLevels: string[] = [];
    for (const idx of subCatIdxs) {
      const val = (cols[idx] || "").trim();
      if (!val) break;          // stop when a level is empty — don't create gaps
      subLevels.push(val);
    }

    // Full path depth: 1 (main only) + number of filled sub-levels
    const depth = 1 + subLevels.length;
    if (depth > maxDepth) maxDepth = depth;

    const address = addressIdx >= 0 ? cols[addressIdx] : "";
    const phone   = phoneIdx >= 0 ? cols[phoneIdx] : "";
    const city    = cityIdx >= 0 ? cols[cityIdx] : "";
    const row: BulkRow = { businessName: name, area: address, phone, city };

    // ── Navigate / create nodes in the tree ──────────────────────────────
    if (!tree[mainCat]) {
      tree[mainCat] = { emoji: CATEGORY_EMOJI_MAP[mainCat.toLowerCase()] || "📁", rows: [], children: {} };
    }
    let node: BulkCatNode = tree[mainCat];

    for (const seg of subLevels) {
      if (!node.children[seg]) {
        node.children[seg] = { emoji: "📌", rows: [], children: {} };
      }
      node = node.children[seg];
    }

    // Attach business to the deepest node of this row
    node.rows.push(row);
    totalBiz++;
  }

  // Count all nodes recursively
  const countNodes = (nodes: Record<string, BulkCatNode>): number => {
    let c = Object.keys(nodes).length;
    for (const n of Object.values(nodes)) c += countNodes(n.children);
    return c;
  };
  const mainCatCount = Object.keys(tree).length;
  const totalCatCount = countNodes(tree);
  // Legacy: count direct level-2 children
  const subCatCount = Object.values(tree).reduce((acc, n) => acc + Object.keys(n.children).length, 0);

  return { tree, totalBiz, maxDepth, totalCatCount, mainCatCount, subCatCount };
}

// ─────────────────────────────────────────────────────────────
// Build flat list from tree (for legacy api calls + dropdown)
// ─────────────────────────────────────────────────────────────
function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  function walk(list: CategoryNode[]) {
    for (const n of list) { result.push(n); walk(n.children); }
  }
  walk(nodes);
  return result;
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function CategoriesContent() {
  const router = useRouter();
  const { toast, show: showToast } = useToast();

  const [tab, setTab] = useState<Tab>("categories");
  const [tree, setTree] = useState<CategoryNode[]>([]);
  // Legacy flat list for custom-service dropdown
  const [flatCategories, setFlatCategories] = useState<FlatCategory[]>([]);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [loading, setLoading] = useState(true);
  const [csLoading, setCsLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // ── Navigation state ──
  // breadcrumb = stack of ancestors from root to current view
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([]);
  // currentNodes = children shown in the left panel
  const [currentNodes, setCurrentNodes] = useState<CategoryNode[]>([]);
  // selected node in left panel
  const [selectedNode, setSelectedNode] = useState<CategoryNode | null>(null);

  // ── Add node modal ──
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeIcon, setNewNodeIcon] = useState("📁");
  const [addingNode, setAddingNode] = useState(false);

  // ── Edit node modal ──
  const [editNode, setEditNode] = useState<CategoryNode | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // ── CSV upload state ──
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  // csvTargetNodeId = node id to upload CSV to
  const [csvTargetNodeId, setCsvTargetNodeId] = useState<string | null>(null);

  // ── Action panel: "add-sub" | "upload-csv" | null ──
  const [actionPanel, setActionPanel] = useState<"add-sub" | "upload-csv" | null>(null);

  // ── Custom service approve ──
  const [approveCs, setApproveCs] = useState<CustomService | null>(null);
  const [approveAs, setApproveAs] = useState<"category" | "subcategory">("subcategory");
  const [approveCatId, setApproveCatId] = useState("");
  const [approvingCs, setApprovingCs] = useState(false);
  const [rejectingCs, setRejectingCs] = useState<string | null>(null);

  // ── search ──
  const [searchQuery, setSearchQuery] = useState("");

  // ── Add-Node duplicate check ──
  const [addNodeForce, setAddNodeForce]   = useState(false);
  const dupCheckRoot = useDuplicateCheck(null);

  // ── Bulk Import state ──
  const [showBulkImport, setShowBulkImport]           = useState(false);
  const [bulkParsed, setBulkParsed]                   = useState<BulkImportData | null>(null);
  const [bulkFileName, setBulkFileName]               = useState("");
  const [bulkImporting, setBulkImporting]             = useState(false);
  const [bulkProgress, setBulkProgress]               = useState({ done: 0, total: 0, current: "" });
  const [bulkUploadBusinesses, setBulkUploadBusinesses] = useState(true);
  const [bulkEmojiOverrides, setBulkEmojiOverrides]   = useState<Record<string, string>>({});
  const [bulkResults, setBulkResults]                 = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  // ─────────────────────────────────────────────────────────
  // Fetch
  // ─────────────────────────────────────────────────────────
  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/categories/tree/admin");
      const nodes: CategoryNode[] = res.data || [];
      setTree(nodes);
      setCurrentNodes(nodes); // start at root
    } catch (err: any) {
      // Fallback: try legacy endpoint
      try {
        const res2 = await api.get("/api/categories/admin/all");
        const legacy: FlatCategory[] = res2.data || [];
        // Convert flat list to tree-compatible format
        const fakeTree: CategoryNode[] = legacy.map((c) => ({
          _id: c._id,
          name: c.name,
          icon: c.icon,
          level: 0,
          order: c.order,
          isActive: c.isActive,
          subcategories: c.subcategories,
          children: (c.subcategories || []).map((sub, idx) => ({
            _id: `${c._id}-sub-${idx}`,
            name: sub,
            icon: "📌",
            level: 1,
            order: idx,
            isActive: true,
            children: [],
          })),
        }));
        setTree(fakeTree);
        setCurrentNodes(fakeTree);
      } catch {
        showToast("Failed to load categories", "error");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFlatCategories = useCallback(async () => {
    try {
      const res = await api.get("/api/categories/admin/all");
      setFlatCategories(res.data || []);
    } catch { /* silently ignore */ }
  }, []);

  const fetchCustomServices = useCallback(async () => {
    setCsLoading(true);
    try {
      const res = await api.get("/api/categories/admin/custom-services", {
        params: { status: "all", limit: 100 },
      });
      setCustomServices(res.data || []);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Failed to fetch requests", "error");
    } finally {
      setCsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
    fetchFlatCategories();
    fetchCustomServices();
  }, [fetchTree, fetchFlatCategories, fetchCustomServices]);

  // ─────────────────────────────────────────────────────────
  // Navigation helpers
  // ─────────────────────────────────────────────────────────
  const navigateInto = (node: CategoryNode) => {
    setBreadcrumb((prev) => [...prev, { id: node._id, name: node.name, icon: node.icon }]);
    setCurrentNodes(node.children);
    setSelectedNode(null);
    setActionPanel(null);
    clearCsv();
    setSearchQuery("");
  };

  const navigateTo = (idx: number) => {
    // idx -1 = root
    if (idx < 0) {
      setBreadcrumb([]);
      setCurrentNodes(tree);
      setSelectedNode(null);
      setActionPanel(null);
      clearCsv();
      return;
    }
    const crumb = breadcrumb[idx];
    const newCrumb = breadcrumb.slice(0, idx + 1);
    setBreadcrumb(newCrumb);
    // Rebuild currentNodes by traversing tree
    let nodes = tree;
    for (let i = 0; i <= idx; i++) {
      const found = nodes.find((n) => n._id === breadcrumb[i].id);
      if (!found) break;
      if (i === idx) { setCurrentNodes(found.children); break; }
      nodes = found.children;
    }
    setSelectedNode(null);
    setActionPanel(null);
    clearCsv();
  };

  // After any mutation, re-fetch and restore breadcrumb position
  const refreshAndRestore = async () => {
    await fetchTree();
    // Breadcrumb stays as-is; currentNodes will be rebuilt on next render
  };

  // Sync currentNodes when tree changes (after refresh)
  useEffect(() => {
    if (tree.length === 0) return;
    if (breadcrumb.length === 0) {
      setCurrentNodes(tree);
      return;
    }
    // Traverse tree by breadcrumb
    let nodes = tree;
    for (let i = 0; i < breadcrumb.length; i++) {
      const found = nodes.find((n) => n._id === breadcrumb[i].id);
      if (!found) { setCurrentNodes(tree); setBreadcrumb([]); return; }
      if (i === breadcrumb.length - 1) { setCurrentNodes(found.children); return; }
      nodes = found.children;
    }
  }, [tree]);

  // ─────────────────────────────────────────────────────────
  // CSV helpers
  // ─────────────────────────────────────────────────────────
  const clearCsv = () => { setCsvRows([]); setCsvFileName(""); };

  const handleCsvFile = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows } = parseCSVText(e.target?.result as string);
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  // ─────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────
  const handleSeed = async () => {
    if (!window.confirm("Seed 11 default categories? Existing categories will be updated.")) return;
    setSeeding(true);
    try {
      const res = await api.post("/api/categories/admin/seed", {});
      showToast(res.message || "Categories seeded");
      await fetchTree();
      await fetchFlatCategories();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Seed failed", "error");
    } finally {
      setSeeding(false);
    }
  };

  const parentIdForNewNode =
    breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : null;

  const handleAddNode = async () => {
    if (!newNodeName.trim()) return;
    // Block exact duplicates
    if (dupCheckRoot.result?.isDuplicate && !addNodeForce) {
      showToast("A duplicate category already exists. Use existing or rename.", "error");
      return;
    }
    setAddingNode(true);
    try {
      await api.post("/api/categories/admin/node", {
        name: newNodeName.trim(),
        icon: newNodeIcon || "📁",
        parent_id: parentIdForNewNode,
        force: addNodeForce,
      });
      showToast(`"${newNodeName}" created`);
      setNewNodeName("");
      setNewNodeIcon("📁");
      setAddNodeForce(false);
      dupCheckRoot.reset();
      setShowAddNode(false);
      await refreshAndRestore();
    } catch (err: any) {
      const errData = err?.response?.data;
      // If backend returns similar-match warning and force was not set, surface suggestions
      if (errData?.hasSimilar && !addNodeForce) {
        showToast("Similar categories found. Review below or click 'Create anyway'.", "error");
      } else {
        showToast(errData?.error || "Failed to create", "error");
      }
    } finally {
      setAddingNode(false);
    }
  };

  const handleAddChildNode = async (parentNode: CategoryNode, childName: string, childIcon: string, force?: boolean) => {
    try {
      await api.post("/api/categories/admin/node", {
        name: childName.trim(),
        icon: childIcon || "📁",
        parent_id: parentNode._id,
        force: force ?? false,
      });
      showToast(`"${childName}" added under "${parentNode.name}"`);
      await refreshAndRestore();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Failed to add sub category", "error");
    }
  };

  const openEdit = (node: CategoryNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditNode(node);
    setEditName(node.name);
    setEditIcon(node.icon);
  };

  const handleSaveEdit = async () => {
    if (!editNode) return;
    setSavingEdit(true);
    try {
      await api.put(`/api/categories/admin/node/${editNode._id}`, {
        name: editName.trim() || editNode.name,
        icon: editIcon || editNode.icon,
      });
      showToast("Updated");
      setEditNode(null);
      await refreshAndRestore();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Update failed", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (node: CategoryNode, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/api/categories/admin/node/${node._id}`, { isActive: !node.isActive });
      showToast(`"${node.name}" ${node.isActive ? "disabled" : "enabled"}`);
      await refreshAndRestore();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Toggle failed", "error");
    }
  };

  const handleDeleteNode = async (node: CategoryNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const childCount = flattenTree(node.children).length;
    const msg = childCount > 0
      ? `Delete "${node.name}" and all ${childCount} nested sub-categories?\nThis cannot be undone.`
      : `Delete "${node.name}"?\nThis cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/api/categories/admin/node/${node._id}`);
      showToast(`"${node.name}" deleted`);
      if (selectedNode?._id === node._id) { setSelectedNode(null); setActionPanel(null); }
      await refreshAndRestore();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Delete failed", "error");
    }
  };

  const handleCsvUpload = async () => {
    const targetId = csvTargetNodeId || selectedNode?._id;
    if (!targetId || csvRows.length === 0) return;
    setUploadingCsv(true);
    try {
      const res = await api.post(`/api/categories/admin/node/${targetId}/upload-csv`, { rows: csvRows });
      showToast(res.message || `Uploaded ${res.created} listings`);
      clearCsv();
      setActionPanel(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleApproveCustom = async () => {
    if (!approveCs) return;
    if (approveAs === "subcategory" && !approveCatId) { showToast("Select a parent category", "error"); return; }
    setApprovingCs(true);
    try {
      const body: any = { approveAs };
      if (approveAs === "subcategory") body.categoryId = approveCatId;
      await api.put(`/api/categories/admin/approve-custom/${approveCs._id}`, body);
      showToast(`"${approveCs.serviceName}" approved`);
      setApproveCs(null);
      setApproveCatId("");
      await fetchTree();
      await fetchCustomServices();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Approve failed", "error");
    } finally {
      setApprovingCs(false);
    }
  };

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
  // Bulk Import handler – N-level recursive
  // ─────────────────────────────────────────────────────────
  const handleBulkImport = async () => {
    if (!bulkParsed) return;
    setBulkImporting(true);
    setBulkResults(null);

    const { tree } = bulkParsed;
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    // Helper: run promises in parallel batches
    const batchRun = async <T,>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) => {
      for (let i = 0; i < items.length; i += concurrency) {
        await Promise.all(items.slice(i, i + concurrency).map(fn));
      }
    };

    // ── Step 1: Fetch existing root categories for fast fuzzy-lookup ─────────
    setBulkProgress({ done: 0, total: 1, current: "Fetching existing categories…" });
    let freshAll: FlatCategory[] = [];
    try {
      const res = await api.get("/api/categories/admin/all");
      freshAll = res.data || [];
    } catch { /* proceed */ }

    // idCache: "root" | parentId  →  { normalizedName → _id }
    const idCache: Record<string, Record<string, string>> = { root: {} };
    for (const c of freshAll) {
      if (!c.parent_id) idCache["root"][normalizeCatName(c.name.trim())] = c._id;
    }

    // ── Count total steps (nodes + optional upload steps) ───────────────────
    const countSteps = (nodes: Record<string, BulkCatNode>): number => {
      let n = Object.keys(nodes).length;
      for (const node of Object.values(nodes)) {
        n += countSteps(node.children);
        if (bulkUploadBusinesses && node.rows.length > 0) n++;
      }
      return n;
    };
    const totalSteps = countSteps(tree);
    let done = 0;
    setBulkProgress({ done: 0, total: totalSteps, current: "Starting…" });

    // ── Ensure a node exists (find existing or create), return its DB id ────
    const ensureNode = async (
      name: string,
      parentId: string | null,
      emoji: string,
      label: string,
    ): Promise<string | null> => {
      const cacheKey = parentId ?? "root";

      // Lazy-load children of this parent if not already cached
      if (!idCache[cacheKey]) {
        idCache[cacheKey] = {};
        try {
          const r = parentId
            ? await api.get(`/api/categories/${parentId}/children`)
            : await api.get("/api/categories/admin/all");
          const children: any[] = parentId
            ? (r.data || [])
            : (r.data || []).filter((c: any) => !c.parent_id);
          for (const child of children) {
            idCache[cacheKey][normalizeCatName(child.name.trim())] = child._id;
          }
        } catch { /* proceed */ }
      }

      // Check fuzzy match against already-known children
      const existing = fuzzyFindInMap(idCache[cacheKey], name);
      if (existing) { results.skipped++; return existing; }

      // Create new node
      try {
        const res: any = await api.post("/api/categories/admin/node", {
          name, icon: emoji, parent_id: parentId,
        });
        const newId = (res?.data ?? res?.category ?? res)?._id ?? null;
        if (newId) idCache[cacheKey][normalizeCatName(name)] = newId;
        if (res?.wasExisting) { results.skipped++; } else { results.created++; }
        return newId;
      } catch (err: any) {
        if (err?.response?.status === 409) {
          results.skipped++;
          // Recover existing id via re-fetch
          try {
            const re = parentId
              ? await api.get(`/api/categories/${parentId}/children`)
              : await api.get("/api/categories/admin/all");
            const children: any[] = parentId
              ? (re.data || [])
              : (re.data || []).filter((c: any) => !c.parent_id);
            for (const child of children) {
              if (fuzzyMatchCatNames(child.name.trim(), name)) {
                idCache[cacheKey][normalizeCatName(child.name.trim())] = child._id;
                return child._id;
              }
            }
          } catch { /* ignore */ }
        } else {
          results.errors.push(`"${label}": ${err?.response?.data?.error ?? err.message}`);
        }
        return null;
      }
    };

    // ── Recursively process a node: create it, recurse into children, upload biz ──
    const processNode = async (
      name: string,
      node: BulkCatNode,
      parentId: string | null,
      depth: number,
      pathLabel: string,
    ): Promise<void> => {
      const emoji = depth === 0 ? (bulkEmojiOverrides[name] ?? node.emoji) : node.emoji;
      setBulkProgress({ done, total: totalSteps, current: `Resolving: ${pathLabel}` });

      const nodeId = await ensureNode(name, parentId, emoji, pathLabel);
      done++;
      setBulkProgress({ done, total: totalSteps, current: `✓ ${pathLabel}` });
      if (!nodeId) return;

      // Recurse into children in parallel batches
      const childNames = Object.keys(node.children);
      await batchRun(childNames, 6, async (childName) => {
        await processNode(
          childName,
          node.children[childName],
          nodeId,
          depth + 1,
          `${pathLabel} › ${childName}`,
        );
      });

      // Upload businesses attached to this node (any level)
      if (bulkUploadBusinesses && node.rows.length > 0) {
        setBulkProgress({ done, total: totalSteps, current: `Uploading: ${pathLabel}` });
        try {
          const uploadRes: any = await api.post(
            `/api/categories/admin/node/${nodeId}/upload-csv`,
            { rows: node.rows },
          );
          results.created += uploadRes?.created ?? node.rows.length;
        } catch (err: any) {
          results.errors.push(`Upload "${pathLabel}": ${err?.response?.data?.error ?? err.message}`);
        }
        done++;
        setBulkProgress({ done, total: totalSteps, current: `✓ Uploaded: ${pathLabel}` });
      }
    };

    // ── Process all root categories sequentially ─────────────────────────────
    for (const rootName of Object.keys(tree)) {
      await processNode(rootName, tree[rootName], null, 0, rootName);
    }

    setBulkImporting(false);
    setBulkResults(results);
    await fetchTree();
    await fetchFlatCategories();
  };

  // ─────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────
  const allFlat = flattenTree(tree);
  const totalNodes = allFlat.length;
  const pendingCount = customServices.filter((cs) => cs.status === "pending").length;

  const filteredNodes = currentNodes.filter((n) =>
    !searchQuery || n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Level badge colours
  const levelColors = [
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
  ];
  const getLevelColor = (level: number) => levelColors[level % levelColors.length];

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  const currentLevel = breadcrumb.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="bg-violet-100 p-2 rounded-xl">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Category Manager</h1>
              <p className="text-xs text-gray-400 mt-0.5">N-level hierarchy · CSV upload · Business listings</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchTree(); fetchFlatCategories(); fetchCustomServices(); dupCheckRoot.reset(); }} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={handleSeed} disabled={seeding} className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium disabled:opacity-50 transition-colors">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Seed Defaults
          </button>
          <button
            onClick={() => { setShowBulkImport(true); setBulkParsed(null); setBulkFileName(""); setBulkResults(null); setBulkEmojiOverrides({}); }}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Import CSV
          </button>
          <button onClick={() => setShowAddNode(true)} className="flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />
            {breadcrumb.length === 0 ? "Add Main Category" : "Add Sub Category"}
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Categories", value: totalNodes, sub: `${allFlat.filter(n => n.isActive).length} active`, icon: <Layers className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50", border: "border-violet-100" },
            { label: "Root Categories", value: tree.length, sub: "top-level", icon: <Folder className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50", border: "border-blue-100" },
            { label: "Custom Requests", value: pendingCount, sub: "pending review", icon: <Inbox className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50", border: "border-amber-100", highlight: pendingCount > 0 },
            { label: "Current Level", value: currentLevel === 0 ? "Root" : `Level ${currentLevel}`, sub: breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : "All categories", icon: <Tag className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50", border: "border-emerald-100" },
          ].map((s, i) => (
            <div key={i} className={`bg-white rounded-2xl border ${(s as any).highlight ? "border-amber-300 ring-2 ring-amber-200" : s.border} p-4 flex items-center gap-4`}>
              <div className={`${s.bg} p-3 rounded-xl shrink-0`}>{s.icon}</div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm font-semibold text-gray-700">{s.label}</p>
                <p className="text-xs text-gray-400 truncate">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-200 p-1 rounded-xl w-fit mb-5">
          {([
            { key: "categories", label: "Category Tree", icon: <LayoutGrid className="w-4 h-4" /> },
            { key: "custom-services", label: `Custom Requests${pendingCount > 0 ? ` (${pendingCount})` : ""}`, icon: <List className="w-4 h-4" /> },
          ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-white text-violet-700 shadow-sm" : "text-gray-600 hover:text-gray-800"}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            TAB: CATEGORY TREE
        ══════════════════════════════════════════════════ */}
        {tab === "categories" && (
          <div className="grid grid-cols-12 gap-4">

            {/* ── LEFT: Navigator Panel ── */}
            <div className="col-span-5 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col min-h-[580px]">

              {/* Panel header with breadcrumb */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-white">
                {/* Breadcrumb navigation */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => navigateTo(-1)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${breadcrumb.length === 0 ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-gray-100"}`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    All
                  </button>
                  {breadcrumb.map((crumb, idx) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-gray-300" />
                      <button
                        onClick={() => navigateTo(idx)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors truncate max-w-[100px] ${idx === breadcrumb.length - 1 ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-gray-100"}`}
                      >
                        {crumb.icon} {crumb.name}
                      </button>
                    </span>
                  ))}
                </div>
                {/* Level badge */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getLevelColor(currentLevel)}`}>
                      {currentLevel === 0 ? "ROOT" : `LEVEL ${currentLevel}`}
                    </span>
                    <span className="text-xs text-gray-400">{filteredNodes.length} item{filteredNodes.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>

              {/* Search inside current level */}
              <div className="px-3 pt-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search in current level..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-300 bg-gray-50"
                  />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3 h-3" /></button>}
                </div>
              </div>

              {/* Node list */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-violet-400" /></div>
                ) : filteredNodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <FolderOpen className="w-10 h-10 text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">
                      {searchQuery ? "No matches found" : breadcrumb.length === 0 ? "No categories yet" : "No sub-categories yet"}
                    </p>
                    {!searchQuery && (
                      <button onClick={() => setShowAddNode(true)} className="mt-2 text-xs text-violet-600 hover:underline">
                        + {breadcrumb.length === 0 ? "Add one" : "Add sub category"}
                      </button>
                    )}
                  </div>
                ) : (
                  filteredNodes.map((node) => (
                    <div
                      key={node._id}
                      onClick={() => {
                        setSelectedNode(selectedNode?._id === node._id ? null : node);
                        setActionPanel(null);
                        clearCsv();
                      }}
                      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-gray-50 last:border-0 ${
                        selectedNode?._id === node._id
                          ? "bg-violet-50 border-l-4 border-l-violet-500"
                          : "hover:bg-gray-50 border-l-4 border-l-transparent"
                      } ${!node.isActive ? "opacity-50" : ""}`}
                    >
                      <span className="text-xl shrink-0 w-8 text-center">{node.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold truncate ${selectedNode?._id === node._id ? "text-violet-700" : "text-gray-800"}`}>{node.name}</span>
                          {!node.isActive && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full shrink-0">OFF</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {node.children.length > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <FolderOpen className="w-3 h-3" />{node.children.length} sub
                            </span>
                          )}
                          {(node.subcategories?.length ?? 0) > 0 && node.children.length === 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Tag className="w-3 h-3" />{node.subcategories!.length} sub
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Row actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
                        <span onClick={(e) => openEdit(node, e)} className="p-1.5 hover:bg-violet-100 rounded-md text-gray-400 hover:text-violet-600 cursor-pointer" title="Edit"><Edit2 className="w-3.5 h-3.5" /></span>
                        <span onClick={(e) => handleToggleActive(node, e)} className={`p-1.5 rounded-md cursor-pointer transition-colors ${node.isActive ? "hover:bg-green-50 text-green-500" : "hover:bg-gray-100 text-gray-300"}`} title={node.isActive ? "Disable" : "Enable"}>
                          {node.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </span>
                        <span onClick={(e) => handleDeleteNode(node, e)} className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500 cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></span>
                      </div>
                      {selectedNode?._id === node._id && <ChevronRight className="w-4 h-4 text-violet-400 shrink-0" />}
                    </div>
                  ))
                )}
              </div>

              {/* Footer: Add node */}
              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={() => setShowAddNode(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-violet-200 text-violet-500 hover:border-violet-400 hover:bg-violet-50 text-sm font-medium transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {breadcrumb.length === 0 ? "New Main Category" : "New Sub Category"}
                </button>
              </div>
            </div>

            {/* ── RIGHT: Action Panel ── */}
            <div className="col-span-7 flex flex-col gap-4">
              {!selectedNode ? (
                /* Empty state with how-to guide */
                <div className="bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center py-16 px-6 text-center flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                    <FolderOpen className="w-8 h-8 text-violet-300" />
                  </div>
                  <p className="text-base font-semibold text-gray-700">Select a category to manage it</p>
                  <p className="text-sm text-gray-400 mt-1 mb-8">Add sub-categories or upload business data via CSV</p>
                  {/* Flow diagram */}
                  <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-5 text-left space-y-3">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Category Hierarchy</p>
                    {[
                      { step: "01", color: "bg-violet-500", label: "Main Category", desc: "Top-level (e.g. Health, Travel)" },
                      { step: "02", color: "bg-blue-500", label: "Sub Category", desc: "Level 1 (e.g. Dentists, Hotels)" },
                      { step: "03", color: "bg-emerald-500", label: "Sub-Sub Category", desc: "Level 2+ (unlimited nesting)" },
                      { step: "04", color: "bg-amber-500", label: "Upload CSV", desc: "Attach business listings to any level" },
                    ].map(({ step, color, label, desc }) => (
                      <div key={step} className="flex items-start gap-3">
                        <span className={`${color} text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5`}>{step}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{label}</p>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Node detail card */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">{selectedNode.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-900">{selectedNode.name}</h2>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getLevelColor(selectedNode.level)}`}>
                              {selectedNode.level === 0 ? "ROOT" : `L${selectedNode.level}`}
                            </span>
                            {!selectedNode.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                          </div>
                          {/* Full path breadcrumb */}
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {breadcrumb.map((b, i) => (
                              <span key={b.id} className="flex items-center gap-1 text-xs text-gray-400">
                                {i > 0 && <ChevronRight className="w-3 h-3" />}
                                {b.icon} {b.name}
                              </span>
                            ))}
                            {breadcrumb.length > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                            <span className="text-xs font-semibold text-violet-600">{selectedNode.icon} {selectedNode.name}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{selectedNode.children.length} direct sub-categories</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={(e) => openEdit(selectedNode, e)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />Edit
                        </button>
                        {selectedNode.children.length > 0 && (
                          <button onClick={() => navigateInto(selectedNode)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-200 transition-colors">
                            <FolderOpen className="w-3.5 h-3.5" />Browse Sub-categories
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setActionPanel(actionPanel === "add-sub" ? null : "add-sub"); clearCsv(); }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${actionPanel === "add-sub" ? "border-violet-500 bg-violet-50" : "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50"}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${actionPanel === "add-sub" ? "bg-violet-500" : "bg-violet-100"}`}>
                        <FolderPlus className={`w-5 h-5 ${actionPanel === "add-sub" ? "text-white" : "text-violet-600"}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${actionPanel === "add-sub" ? "text-violet-700" : "text-gray-800"}`}>Add Sub Category</p>
                        <p className="text-xs text-gray-400">Create nested category under this one</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setActionPanel(actionPanel === "upload-csv" ? null : "upload-csv"); setCsvTargetNodeId(selectedNode._id); }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${actionPanel === "upload-csv" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50"}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${actionPanel === "upload-csv" ? "bg-emerald-500" : "bg-emerald-100"}`}>
                        <Upload className={`w-5 h-5 ${actionPanel === "upload-csv" ? "text-white" : "text-emerald-600"}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${actionPanel === "upload-csv" ? "text-emerald-700" : "text-gray-800"}`}>Upload CSV</p>
                        <p className="text-xs text-gray-400">Attach business listings to this category</p>
                      </div>
                    </button>
                  </div>

                  {/* ── Inline: Add Sub Category ── */}
                  {actionPanel === "add-sub" && (
                    <AddSubCategoryPanel
                      parentNode={selectedNode}
                      onAdd={async (name, icon, force) => {
                        await handleAddChildNode(selectedNode, name, icon, force);
                        setActionPanel(null);
                      }}
                      onCancel={() => setActionPanel(null)}
                    />
                  )}

                  {/* ── Inline: CSV Upload ── */}
                  {actionPanel === "upload-csv" && (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white flex items-center gap-2">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-700">Upload Business Listings CSV</span>
                        <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{selectedNode.icon} {selectedNode.name}</span>
                      </div>
                      <div className="p-5 space-y-4">
                        {/* CSV format hint */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Required CSV Columns</p>
                          <div className="flex flex-wrap gap-1">
                            {["businessName*", "phone*", "ownerName", "description", "whatsapp", "email", "website", "area", "city", "state", "pincode", "listingType"].map((col) => (
                              <span key={col} className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${col.endsWith("*") ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{col}</span>
                            ))}
                          </div>
                          <p className="text-[10px] text-amber-600 mt-1.5">* Required &nbsp;·&nbsp; listingType: <code>free</code> or <code>promoted</code></p>
                        </div>

                        {/* Drop zone */}
                        <label
                          className={`flex flex-col items-center justify-center gap-3 w-full py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${dragActive ? "border-emerald-400 bg-emerald-50" : csvFileName ? "border-emerald-300 bg-emerald-50" : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"}`}
                          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                          onDragLeave={() => setDragActive(false)}
                          onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleCsvFile(f); }}
                        >
                          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
                          {csvFileName ? (
                            <>
                              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-emerald-600" /></div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-emerald-700">{csvFileName}</p>
                                <p className="text-xs text-emerald-500 mt-0.5">{csvRows.length} rows ready</p>
                              </div>
                              <button onClick={(e) => { e.preventDefault(); clearCsv(); }} className="text-xs text-red-400 hover:text-red-600">Remove file</button>
                            </>
                          ) : (
                            <>
                              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"><Upload className="w-5 h-5 text-gray-400" /></div>
                              <div className="text-center">
                                <p className="text-sm font-medium text-gray-600">Drop CSV here or click to browse</p>
                                <p className="text-xs text-gray-400 mt-0.5">Supports drag & drop</p>
                              </div>
                            </>
                          )}
                        </label>

                        {/* Preview */}
                        {csvRows.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-2">Preview — {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} {csvRows.length > 5 ? "(showing first 5)" : ""}</p>
                            <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-36">
                              <table className="text-xs min-w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>{["businessName", "phone", "city", "listingType"].map((h) => <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">{h}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {csvRows.slice(0, 5).map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                      {["businessName", "phone", "city", "listingType"].map((h) => (
                                        <td key={h} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{row[h] || <span className="text-gray-300">—</span>}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleCsvUpload}
                          disabled={uploadingCsv || csvRows.length === 0}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {uploadingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploadingCsv ? "Uploading..." : csvRows.length > 0 ? `Upload ${csvRows.length} Business Listings` : "Select a CSV file first"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sub-category children preview */}
                  {selectedNode.children.length > 0 && actionPanel === null && (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-700">Sub-categories ({selectedNode.children.length})</span>
                        <button onClick={() => navigateInto(selectedNode)} className="text-xs text-violet-600 hover:underline font-medium flex items-center gap-1">Browse all <ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {selectedNode.children.slice(0, 6).map((child) => (
                          <div key={child._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
                            <span className="text-base w-6 text-center">{child.icon}</span>
                            <span className="text-sm font-medium text-gray-700 flex-1 truncate">{child.name}</span>
                            <span className="text-xs text-gray-400">{child.children.length > 0 ? `${child.children.length} sub` : "no sub"}</span>
                          </div>
                        ))}
                        {selectedNode.children.length > 6 && (
                          <div className="px-4 py-2 text-xs text-gray-400 text-center">+{selectedNode.children.length - 6} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: CUSTOM SERVICE REQUESTS
        ══════════════════════════════════════════════════ */}
        {tab === "custom-services" && (
          <div>
            {csLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
            ) : customServices.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">No custom service requests</p>
                <p className="text-sm text-gray-400 mt-1">User-submitted service requests appear here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Service Name", "Submitted By", "Parent Category", "Status", "Date", "Actions"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customServices.map((cs) => (
                      <tr key={cs._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{cs.serviceName}</td>
                        <td className="px-5 py-3.5 text-gray-500">{cs.userName || "—"}</td>
                        <td className="px-5 py-3.5">
                          {cs.parentCategory ? (
                            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md text-xs font-medium">{cs.parentCategory}</span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={cs.status} /></td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{new Date(cs.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5">
                          {cs.status === "pending" ? (
                            <div className="flex gap-2">
                              <button onClick={() => { setApproveCs(cs); setApproveAs("subcategory"); setApproveCatId(""); }} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors">
                                <Check className="w-3 h-3" />Approve
                              </button>
                              <button onClick={() => handleRejectCustom(cs)} disabled={rejectingCs === cs._id} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50">
                                {rejectingCs === cs._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}Reject
                              </button>
                            </div>
                          ) : <span className="text-xs text-gray-300">No actions</span>}
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
          MODAL: Add Category/Sub-Category
      ══════════════════════════════════════════════════ */}
      {showAddNode && (
        <Modal
          title={breadcrumb.length === 0 ? "Add New Main Category" : `Add Sub Category under "${breadcrumb[breadcrumb.length - 1].name}"`}
          onClose={() => {
            setShowAddNode(false);
            setNewNodeName("");
            setNewNodeIcon("📁");
            setAddNodeForce(false);
            dupCheckRoot.reset();
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Healthcare"
                value={newNodeName}
                onChange={(e) => {
                  setNewNodeName(e.target.value);
                  setAddNodeForce(false);
                  dupCheckRoot.check(e.target.value);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAddNode()}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-sm ${
                  dupCheckRoot.result?.isDuplicate
                    ? "border-red-300 focus:ring-red-300"
                    : dupCheckRoot.result?.hasSimilar && !addNodeForce
                    ? "border-amber-300 focus:ring-amber-300"
                    : "border-gray-300 focus:ring-violet-400"
                }`}
                autoFocus
              />
            </div>

            {/* Real-time duplicate/similar warning */}
            <DuplicateWarningPanel
              result={dupCheckRoot.result}
              checking={dupCheckRoot.checking}
              force={addNodeForce}
              onForce={() => setAddNodeForce(true)}
              onUseExisting={(match) => {
                showToast(`Using existing category "${match.name}"`);
                setShowAddNode(false);
                setNewNodeName("");
                setAddNodeForce(false);
                dupCheckRoot.reset();
                // Scroll to / select the existing node
                const found = currentNodes.find((n) => n._id === match._id);
                if (found) setSelectedNode(found);
              }}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon (emoji)</label>
              <input type="text" placeholder="📁" value={newNodeIcon} onChange={(e) => setNewNodeIcon(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Quick Pick</p>
              <div className="flex flex-wrap gap-2">
                {["✈️","💻","🛒","🔑","💄","⚕️","🎓","🔨","🚗","🔧","💼","🏥","🍕","🌿","🎨","🏠","📌","🔖","⚡","🎯"].map((e) => (
                  <button key={e} onClick={() => setNewNodeIcon(e)} className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${newNodeIcon === e ? "bg-violet-100 ring-2 ring-violet-400" : "bg-gray-100 hover:bg-gray-200"}`}>{e}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAddNode(false);
                  setNewNodeName("");
                  setNewNodeIcon("📁");
                  setAddNodeForce(false);
                  dupCheckRoot.reset();
                }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNode}
                disabled={
                  addingNode ||
                  !newNodeName.trim() ||
                  (dupCheckRoot.result?.isDuplicate ?? false)
                }
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {addingNode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addNodeForce ? "Create Anyway" : breadcrumb.length === 0 ? "Add Category" : "Add Sub Category"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Edit Node
      ══════════════════════════════════════════════════ */}
      {editNode && (
        <Modal title={`Edit — ${editNode.name}`} onClose={() => setEditNode(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon (emoji)</label>
              <input type="text" value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditNode(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Approve Custom Service
      ══════════════════════════════════════════════════ */}
      {approveCs && (
        <Modal title={`Approve — ${approveCs.serviceName}`} onClose={() => setApproveCs(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">How would you like to add <span className="font-semibold text-gray-800">&ldquo;{approveCs.serviceName}&rdquo;</span>?</p>
            <div className="grid grid-cols-2 gap-3">
              {(["subcategory", "category"] as const).map((opt) => (
                <button key={opt} onClick={() => setApproveAs(opt)} className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${approveAs === opt ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {opt === "category" ? "🆕 New Main Category" : "📌 Sub Category of…"}
                </button>
              ))}
            </div>
            {approveAs === "subcategory" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Parent Category <span className="text-red-500">*</span></label>
                <select value={approveCatId} onChange={(e) => setApproveCatId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value="">— Select a category —</option>
                  {flatCategories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setApproveCs(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleApproveCustom} disabled={approvingCs || (approveAs === "subcategory" && !approveCatId)} className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
                {approvingCs ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Approve
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: Bulk Import CSV
      ══════════════════════════════════════════════════ */}
      {showBulkImport && (
        <BulkImportModal
          onClose={() => { if (!bulkImporting) setShowBulkImport(false); }}
          bulkParsed={bulkParsed}
          bulkFileName={bulkFileName}
          bulkImporting={bulkImporting}
          bulkProgress={bulkProgress}
          bulkUploadBusinesses={bulkUploadBusinesses}
          setBulkUploadBusinesses={setBulkUploadBusinesses}
          bulkEmojiOverrides={bulkEmojiOverrides}
          setBulkEmojiOverrides={setBulkEmojiOverrides}
          bulkResults={bulkResults}
          onFileSelect={(file: File) => {
            setBulkFileName(file.name);
            setBulkResults(null);
            setBulkEmojiOverrides({});
            const reader = new FileReader();
            reader.onload = (e) => {
              const parsed = parseBulkCSV(e.target?.result as string);
              setBulkParsed(parsed);
            };
            reader.readAsText(file);
          }}
          onImport={handleBulkImport}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

/** Inline panel to add a child node under `parentNode` */
function AddSubCategoryPanel({
  parentNode,
  onAdd,
  onCancel,
}: {
  parentNode: CategoryNode;
  onAdd: (name: string, icon: string, force?: boolean) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName]   = useState("");
  const [icon, setIcon]   = useState("📁");
  const [adding, setAdding]     = useState(false);
  const [force, setForce]       = useState(false);
  const EMOJIS = ["📌","✈️","💻","🛒","🔑","💄","⚕️","🎓","🔨","🚗","🔧","💼","🏥","🍕","🌿","🎨","🏠","🔖","⚡","🎯"];

  const dupCheck = useDuplicateCheck(parentNode._id);

  const handleAdd = async () => {
    if (!name.trim()) return;
    if (dupCheck.result?.isDuplicate && !force) return;
    setAdding(true);
    try {
      await onAdd(name.trim(), icon, force);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-violet-200 ring-2 ring-violet-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white flex items-center gap-2">
        <FolderPlus className="w-4 h-4 text-violet-600" />
        <span className="text-sm font-bold text-violet-700">
          Add Sub Category under &ldquo;{parentNode.icon} {parentNode.name}&rdquo;
        </span>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. Dentists"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setForce(false);
                dupCheck.check(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                dupCheck.result?.isDuplicate
                  ? "border-red-300 focus:ring-red-300"
                  : dupCheck.result?.hasSimilar && !force
                  ? "border-amber-300 focus:ring-amber-300"
                  : "border-gray-200 focus:ring-violet-300"
              }`}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Icon</label>
            <input
              type="text"
              placeholder="📁"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        </div>

        {/* Duplicate warning */}
        <DuplicateWarningPanel
          result={dupCheck.result}
          checking={dupCheck.checking}
          force={force}
          onForce={() => setForce(true)}
          onUseExisting={(_match) => {
            // Just close the panel — the parent already exists
            onCancel();
          }}
        />

        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setIcon(e)} className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${icon === e ? "bg-violet-100 ring-2 ring-violet-400" : "bg-gray-100 hover:bg-gray-200"}`}>{e}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAdd}
            disabled={adding || !name.trim() || (dupCheck.result?.isDuplicate ?? false)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {force ? "Create Anyway" : "Add Sub Category"}
          </button>
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BulkImportModal – full bulk CSV import with progress & results
// ─────────────────────────────────────────────────────────────
function BulkImportModal({
  onClose,
  bulkParsed,
  bulkFileName,
  bulkImporting,
  bulkProgress,
  bulkUploadBusinesses,
  setBulkUploadBusinesses,
  bulkEmojiOverrides,
  setBulkEmojiOverrides,
  bulkResults,
  onFileSelect,
  onImport,
}: {
  onClose: () => void;
  bulkParsed: BulkImportData | null;
  bulkFileName: string;
  bulkImporting: boolean;
  bulkProgress: { done: number; total: number; current: string };
  bulkUploadBusinesses: boolean;
  setBulkUploadBusinesses: (v: boolean) => void;
  bulkEmojiOverrides: Record<string, string>;
  setBulkEmojiOverrides: (v: Record<string, string>) => void;
  bulkResults: { created: number; skipped: number; errors: string[] } | null;
  onFileSelect: (file: File) => void;
  onImport: () => void;
}) {
  const pct = bulkProgress.total > 0 ? Math.round((bulkProgress.done / bulkProgress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2.5 rounded-xl">
              <Upload className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Bulk Import CSV</h3>
              <p className="text-xs text-gray-400">Auto-creates main categories, sub-categories & uploads business listings</p>
            </div>
          </div>
          <button onClick={onClose} disabled={bulkImporting} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Results panel */}
          {bulkResults && !bulkImporting && (
            <div className={`rounded-xl p-4 border ${bulkResults.errors.length === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                {bulkResults.errors.length === 0
                  ? <CheckCircle className="w-5 h-5 text-green-600" />
                  : <AlertCircle className="w-5 h-5 text-amber-600" />}
                <span className="font-bold text-sm text-gray-900">
                  {bulkResults.errors.length === 0 ? "Import complete!" : "Import complete with warnings"}
                </span>
              </div>
              <div className="flex gap-5 text-sm mb-2">
                <span className="text-green-700 font-medium">✓ {bulkResults.created.toLocaleString()} items created</span>
                <span className="text-gray-500">↷ {bulkResults.skipped} already existed</span>
              </div>
              {bulkResults.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto border border-amber-200 rounded-lg bg-white p-2">
                  {bulkResults.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600 py-0.5">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress panel */}
          {bulkImporting && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span className="text-sm font-bold text-indigo-700">Importing…</span>
                </div>
                <span className="text-sm font-bold text-indigo-700">{pct}%</span>
              </div>
              <div className="w-full bg-indigo-100 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs font-medium text-indigo-700 truncate">{bulkProgress.current}</p>
              <p className="text-xs text-indigo-400 mt-0.5">{bulkProgress.done} / {bulkProgress.total} steps done</p>
            </div>
          )}

          {/* File upload + config (hidden while importing or after results) */}
          {!bulkImporting && !bulkResults && (
            <>
              {/* Step 1 – File */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  <p className="text-sm font-semibold text-gray-700">Select your CSV file</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Expected column format (N-level)
                  </p>
                  <p className="text-xs text-amber-700 font-mono">Name, locatcity, Main Category, Sub Category, [Sub Sub Category, Sub Sub Sub Category, …], Mobile no, City</p>
                  <p className="text-xs text-amber-600 mt-1">Add as many <strong>Sub Category</strong> columns as needed for deeper levels. The header is auto-detected — blank/numeric leading rows are skipped.</p>
                </div>
                <label className={`flex flex-col items-center justify-center gap-3 w-full py-7 border-2 border-dashed rounded-xl cursor-pointer transition-all ${bulkFileName ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"}`}>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }} />
                  {bulkFileName ? (
                    <>
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-indigo-700">{bulkFileName}</p>
                        {bulkParsed ? (
                          <p className="text-xs text-indigo-500 mt-0.5">
                            {bulkParsed.mainCatCount} main categories · {bulkParsed.subCatCount} sub-categories · {bulkParsed.totalBiz.toLocaleString()} businesses
                          </p>
                        ) : (
                          <p className="text-xs text-red-500 mt-0.5">Could not parse. Ensure the file matches the expected format.</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 underline cursor-pointer">Replace file</span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Upload className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">Drop CSV or click to browse</p>
                    </>
                  )}
                </label>
              </div>

              {bulkParsed && (
                <>
                  {/* Step 2 – Options */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                      <p className="text-sm font-semibold text-gray-700">Configure import options</p>
                    </div>
                    <label className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={bulkUploadBusinesses}
                        onChange={(e) => setBulkUploadBusinesses(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">Upload business listings</p>
                        <p className="text-xs text-emerald-600">
                          Attach {bulkParsed.totalBiz.toLocaleString()} businesses to their sub-categories (name, address, phone, city)
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Step 3 – Preview */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                      <p className="text-sm font-semibold text-gray-700">
                        Preview — {bulkParsed.mainCatCount} root categories · {bulkParsed.maxDepth} level{bulkParsed.maxDepth !== 1 ? "s" : ""} deep &nbsp;
                        <span className="text-gray-400 font-normal">(edit emoji if needed)</span>
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      {Object.entries(bulkParsed.tree).map(([catName, node], i) => {
                        const emoji = bulkEmojiOverrides[catName] ?? node.emoji;
                        // Count all descendant nodes recursively
                        const countDesc = (n: BulkCatNode): number =>
                          Object.values(n.children).reduce((acc, c) => acc + 1 + countDesc(c), 0);
                        const subCount = countDesc(node);
                        // Count all businesses recursively
                        const countBiz = (n: BulkCatNode): number =>
                          n.rows.length + Object.values(n.children).reduce((acc, c) => acc + countBiz(c), 0);
                        const bizCount = countBiz(node);
                        // Compute normalized preview for display
                        const normalizedPreviewStr = catName
                          .toLowerCase()
                          .replace(/[&/\\|\-_.,;:!?()'"+@#%*[\]{}<>]+/g, " ")
                          .split(" ")
                          .map((w) => w.trim())
                          .filter((w) => w.length > 1 && !new Set([
                            "best","top","great","good","cheap","affordable","premium",
                            "trusted","famous","popular","leading","certified",
                            "near","me","nearby","around","local","online","in","at",
                            "city","town","india","services","service","solutions",
                            "solution","providers","provider","experts","expert",
                            "professionals","professional","agents","agent","dealers",
                            "dealer","shops","shop","stores","store","centres","centre",
                            "centers","center","specialists","specialist","and","or","the",
                            "a","an","of","with","by","for","to",
                          ]).has(w))
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ");
                        const isReduced = normalizedPreviewStr && normalizedPreviewStr.toLowerCase() !== catName.toLowerCase();
                        return (
                          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 group">
                            {/* Editable emoji */}
                            <input
                              type="text"
                              value={emoji}
                              onChange={(e) => setBulkEmojiOverrides({ ...bulkEmojiOverrides, [catName]: e.target.value })}
                              className="w-10 h-10 text-center text-xl border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 shrink-0 bg-white"
                              title="Edit emoji"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-800 truncate">{catName}</p>
                                {isReduced && normalizedPreviewStr && (
                                  <span className="flex items-center gap-1 text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {normalizedPreviewStr}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">
                                {subCount} sub-categories · {bizCount.toLocaleString()} businesses
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              emoji === node.emoji
                                ? "bg-indigo-50 text-indigo-600"
                                : "bg-amber-50 text-amber-600"
                            }`}>
                              {emoji === node.emoji ? "auto" : "custom"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary banner */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Root Categories", value: bulkParsed.mainCatCount, color: "bg-violet-50 border-violet-100 text-violet-700" },
                      { label: "Total Nodes", value: bulkParsed.totalCatCount, color: "bg-blue-50 border-blue-100 text-blue-700" },
                      { label: "Max Depth", value: `${bulkParsed.maxDepth} level${bulkParsed.maxDepth !== 1 ? "s" : ""}`, color: "bg-amber-50 border-amber-100 text-amber-700" },
                      { label: "Business Listings", value: bulkUploadBusinesses ? bulkParsed.totalBiz.toLocaleString() : "—", color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
                    ].map((s) => (
                      <div key={s.label} className={`${s.color} border rounded-xl p-3 text-center`}>
                        <p className="text-xl font-bold">{s.value}</p>
                        <p className="text-xs font-medium mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!bulkImporting && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
            <div className="text-xs text-gray-400 space-y-0.5">
              {bulkResults ? (
                <p>Refresh the category tree to see your new categories.</p>
              ) : (
                <>
                  <p className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                    Names are <strong>normalized</strong> (filler words removed) before duplicate check.
                  </p>
                  <p>Existing categories with the same core name are <strong>reused</strong> automatically.</p>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
                {bulkResults ? "Close" : "Cancel"}
              </button>
              {!bulkResults && bulkParsed && (
                <button
                  onClick={onImport}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Start Import
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    pending:  { cls: "bg-amber-100 text-amber-700",  icon: <AlertCircle className="w-3 h-3" />,  label: "Pending"  },
    approved: { cls: "bg-green-100 text-green-700",  icon: <CheckCircle className="w-3 h-3" />,  label: "Approved" },
    rejected: { cls: "bg-red-100 text-red-700",      icon: <XCircle className="w-3 h-3" />,      label: "Rejected" },
  };
  const cfg = map[status] || map["pending"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Export with AuthGuard
// ─────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  return (
    <>
      <Head>
        <title>Category Manager | Instantlly Admin</title>
      </Head>
      <AuthGuard>
        <CategoriesContent />
      </AuthGuard>
    </>
  );
}

