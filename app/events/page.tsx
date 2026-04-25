"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Star,
  StarOff,
  Calendar,
  MapPin,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  RefreshCw,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import { api, API_BASE, ADMIN_KEY } from "../lib/api";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExcelRow {
  srNo: number | null;
  eventName: string;
  startDate: string;
  endDate: string;
  days: number | null;
  city: string;
  state: string;
  category: string;
  eventType: string;
  venue: string;
  sourceWebsite: string;
  price: number | null;
}

interface LiveEvent {
  id: number;
  title: string;
  venue: string | null;
  location: string | null;
  date: string;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  event_type: string | null;
  source_website: string | null;
  is_free: boolean;
  price: number;
  is_featured: boolean;
  uploaded_by_admin: boolean;
  sr_no: number | null;
  days: number | null;
  created_at: string;
}

interface Registration {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  registered_at: string;
  payment_status: string;
  amount_paid: number | null;
  user?: { name: string | null; email: string | null; phone: string };
}

// ─── Excel Column Mapping ─────────────────────────────────────────────────────

const EXCEL_COLUMNS: Record<string, keyof ExcelRow> = {
  "sr no": "srNo",
  "sr. no": "srNo",
  "sr.no": "srNo",
  "s.no": "srNo",
  "serial no": "srNo",
  sr: "srNo",
  no: "srNo",
  "#": "srNo",
  "event name": "eventName",
  event: "eventName",
  name: "eventName",
  title: "eventName",
  "start date": "startDate",
  start_date: "startDate",
  startdate: "startDate",
  "from date": "startDate",
  "end date": "endDate",
  end_date: "endDate",
  enddate: "endDate",
  "to date": "endDate",
  days: "days",
  "no. of days": "days",
  duration: "days",
  city: "city",
  state: "state",
  category: "category",
  "event type": "eventType",
  type: "eventType",
  event_type: "eventType",
  "venue / area": "venue",
  "venue/area": "venue",
  "venue / area ": "venue",
  venue: "venue",
  area: "venue",
  location: "venue",
  "source / website": "sourceWebsite",
  "source/website": "sourceWebsite",
  "source/ website": "sourceWebsite",
  website: "sourceWebsite",
  source: "sourceWebsite",
  url: "sourceWebsite",
  price: "price",
};

function parseExcelDate(val: unknown): string {
  if (!val) return "";
  // Excel serial date number
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const d = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      return d;
    }
  }
  // String date — try to parse
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return "";
    // Support DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;
    }
    const isoDate = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
    if (isoDate) return isoDate[0];
    // Try JS Date parse as fallback
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return String(val);
}

function parseExcelRows(sheet: XLSX.WorkSheet): ExcelRow[] {
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as any[][];
  if (jsonData.length < 2) return [];

  // Find header row — scan up to first 5 rows for the row that contains
  // a known column key (handles Excel files with title rows above the headers)
  const knownKeys = Object.keys(EXCEL_COLUMNS);
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const candidate = jsonData[i].map((h: any) =>
      String(h).toLowerCase().trim(),
    );
    if (candidate.some((h: string) => knownKeys.includes(h))) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = jsonData[headerRowIndex].map((h: any) =>
    String(h).toLowerCase().trim(),
  );

  const rows: ExcelRow[] = [];
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row.every((cell: any) => !cell)) continue; // skip empty rows

    const obj: Partial<ExcelRow> = {
      srNo: null,
      eventName: "",
      startDate: "",
      endDate: "",
      days: null,
      city: "",
      state: "",
      category: "",
      eventType: "",
      venue: "",
      sourceWebsite: "",
      price: null,
    };

    headerRow.forEach((header: string, colIndex: number) => {
      const field = EXCEL_COLUMNS[header];
      if (!field) return;
      const cellVal = row[colIndex];

      if (field === "srNo" || field === "days") {
        obj[field] = cellVal != null && cellVal !== "" ? Number(cellVal) : null;
      } else if (field === "price") {
        obj[field] = cellVal != null && cellVal !== "" ? Number(cellVal) : null;
      } else if (field === "startDate" || field === "endDate") {
        obj[field] = parseExcelDate(cellVal);
      } else {
        (obj as any)[field] = cellVal != null ? String(cellVal).trim() : "";
      }
    });

    if (!obj.eventName) continue; // skip rows without event name
    rows.push(obj as ExcelRow);
  }

  return rows;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PreviewTable({ rows }: { rows: ExcelRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Sr No",
              "Event Name",
              "Start Date",
              "End Date",
              "Days",
              "City",
              "State",
              "Category",
              "Event Type",
              "Venue/Area",
              "Source/Website",
              "Price",
            ].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-3 py-2 whitespace-nowrap">{row.srNo ?? "-"}</td>
              <td className="px-3 py-2 font-medium text-gray-900 max-w-48 truncate">
                {row.eventName}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {row.startDate || "-"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {row.endDate || "-"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{row.days ?? "-"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{row.city || "-"}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {row.state || "-"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {row.category || "-"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {row.eventType || "-"}
              </td>
              <td className="px-3 py-2 max-w-48 truncate">
                {row.venue || "-"}
              </td>
              <td className="px-3 py-2 max-w-40 truncate">
                {row.sourceWebsite || "-"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {row.price != null ? (
                  `₹${row.price}`
                ) : (
                  <span className="text-gray-400">Free</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function EventsContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const PAGE_SIZE = 50;

  const [parsedRows, setParsedRows] = useState<ExcelRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    inserted: number;
    errors: string[];
  } | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [featuringId, setFeaturingId] = useState<number | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  useEffect(() => {
    fetchLiveEvents();
  }, []);

  // ── Fetch live events ──

  const fetchLiveEvents = async (page = currentPage) => {
    setLoadingEvents(true);
    try {
      const data = await api.get(
        `/api/admin/admin-events?page=${page}&limit=${PAGE_SIZE}`,
      );
      setLiveEvents(Array.isArray(data.events) ? data.events : []);
      setTotalPages(data.totalPages ?? 1);
      setTotalEvents(data.total ?? 0);
    } catch (err: any) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    fetchLiveEvents(page);
  };

  // ── Excel parsing ──

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setParsedRows([]);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = parseExcelRows(sheet);
        if (rows.length === 0) {
          setParseError(
            "No valid rows found. Please check your Excel file format.",
          );
        } else {
          setParsedRows(rows);
        }
      } catch (err: any) {
        setParseError(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // ── Upload to backend ──

  const handlePublish = async () => {
    if (parsedRows.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await api.post("/api/admin/admin-events/bulk-upload", {
        events: parsedRows,
      });
      setUploadResult({
        inserted: result.inserted,
        errors: result.errors || [],
      });
      if (result.inserted > 0) {
        setParsedRows([]);
        setFileName("");
        fetchLiveEvents();
      }
    } catch (err: any) {
      setUploadResult({
        inserted: 0,
        errors: [err.message || "Upload failed"],
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Delete event ──

  const handleDelete = async (id: number, title: string) => {
    const confirmed = window.confirm(
      `Delete event "${title}"?\n\nThis will remove it from the live app. This cannot be undone.`,
    );
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/admin-events/${id}`);
      setLiveEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete event");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Toggle featured ──

  const handleToggleFeatured = async (event: LiveEvent) => {
    setFeaturingId(event.id);
    try {
      await api.patch(`/api/admin/admin-events/${event.id}`, {
        is_featured: !event.is_featured,
      });
      setLiveEvents((prev) =>
        prev.map((e) =>
          e.id === event.id ? { ...e, is_featured: !e.is_featured } : e,
        ),
      );
    } catch (err: any) {
      alert(err.message || "Failed to update event");
    } finally {
      setFeaturingId(null);
    }
  };

  // ── View registrations ──

  const handleViewRegistrations = async (id: number) => {
    if (selectedEventId === id) {
      setSelectedEventId(null);
      setRegistrations([]);
      return;
    }
    setSelectedEventId(id);
    setLoadingRegs(true);
    try {
      const data = await api.get(`/api/admin/admin-events/${id}/registrations`);
      setRegistrations(data.registrations || []);
    } catch {
      setRegistrations([]);
    } finally {
      setLoadingRegs(false);
    }
  };

  // ── Template download ──

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "Sr No",
        "Event Name",
        "Start Date",
        "End Date",
        "Days",
        "City",
        "State",
        "Category",
        "Event Type",
        "Venue / Area",
        "Source / Website",
        "Price",
      ],
      [
        1,
        "Sample Event",
        "2026-05-01",
        "2026-05-03",
        3,
        "Mumbai",
        "Maharashtra",
        "Conference",
        "Business",
        "Convention Centre, BKC",
        "https://example.com",
        "",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Events");
    XLSX.writeFile(wb, "events_upload_template.xlsx");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* ── Sidebar ── */}
      <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm shrink-0">
        <div className="px-6 py-6 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
          <p className="text-xs text-gray-400 mt-0.5">Instantlly Dashboard</p>
        </div>
        <div className="px-3 py-4">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 shrink-0" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-8 py-5">
          <h2 className="text-2xl font-bold text-gray-900">
            Events Management
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload events from Excel — they go live in the app immediately
          </p>
        </header>

        <main className="flex-1 px-8 py-8 space-y-8">
          {/* ── Upload Card ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-rose-500" />
                Upload Events from Excel
              </h3>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>

            {/* Expected columns info */}
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 mb-5 text-sm text-rose-700">
              <p className="font-medium mb-1">Expected Excel Columns:</p>
              <p className="font-mono text-xs leading-relaxed">
                Sr No | Event Name | Start Date | End Date | Days | City | State
                | Category | Event Type | Venue / Area | Source / Website |
                Price (optional)
              </p>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-rose-400 rounded-xl p-10 text-center cursor-pointer transition-colors group"
            >
              <Upload className="w-10 h-10 text-gray-300 group-hover:text-rose-400 mx-auto mb-3 transition-colors" />
              <p className="text-gray-600 font-medium">
                {fileName ? (
                  <span className="text-rose-600">{fileName}</span>
                ) : (
                  "Click to choose an Excel file (.xlsx / .xls)"
                )}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Supports .xlsx and .xls
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            {parseError && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                {parseError}
              </div>
            )}

            {/* Preview */}
            {parsedRows.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    Preview — {parsedRows.length} event
                    {parsedRows.length !== 1 ? "s" : ""} found
                  </h4>
                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setFileName("");
                    }}
                    className="text-sm text-gray-400 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
                <PreviewTable rows={parsedRows} />

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handlePublish}
                    disabled={uploading}
                    className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-lg font-semibold transition-colors"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Publish {parsedRows.length} Event
                        {parsedRows.length !== 1 ? "s" : ""} Live
                      </>
                    )}
                  </button>
                  <p className="text-sm text-gray-500">
                    Events will be visible in the app immediately after
                    publishing.
                  </p>
                </div>
              </div>
            )}

            {/* Upload result */}
            {uploadResult && (
              <div
                className={`mt-4 rounded-lg p-4 border ${uploadResult.inserted > 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
              >
                {uploadResult.inserted > 0 && (
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <CheckCircle className="w-5 h-5" />
                    {uploadResult.inserted} event
                    {uploadResult.inserted !== 1 ? "s" : ""} published
                    successfully!
                  </div>
                )}
                {uploadResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-700 mb-1">
                      {uploadResult.errors.length} row
                      {uploadResult.errors.length !== 1 ? "s" : ""} had errors:
                    </p>
                    <ul className="text-xs text-red-600 list-disc list-inside space-y-0.5">
                      {uploadResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Live Events Table ── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-500" />
                Live Events ({totalEvents} total)
              </h3>
              <button
                onClick={() => fetchLiveEvents(currentPage)}
                disabled={loadingEvents}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingEvents ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {loadingEvents ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-400" />
                Loading events...
              </div>
            ) : liveEvents.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                No events yet. Upload an Excel file above to publish events.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "#",
                        "Event Name",
                        "Start Date",
                        "End Date",
                        "City / State",
                        "Category",
                        "Type",
                        "Venue",
                        "Price",
                        "Featured",
                        "Source",
                        "Registrations",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {liveEvents.map((event) => (
                      <>
                        <tr
                          key={event.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {event.sr_no ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-sm max-w-48 truncate">
                              {event.title}
                            </div>
                            {event.uploaded_by_admin && (
                              <span className="text-xs text-rose-500 font-medium">
                                Admin Upload
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {formatDate(event.start_date || event.date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {formatDate(event.end_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {[event.city, event.state]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {event.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {event.event_type || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-40 truncate">
                            {event.venue}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {event.is_free ? (
                              <span className="text-green-600 font-medium">
                                Free
                              </span>
                            ) : (
                              <span className="text-gray-800 font-medium">
                                ₹{event.price}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleFeatured(event)}
                              disabled={featuringId === event.id}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {featuringId === event.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                              ) : event.is_featured ? (
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              ) : (
                                <StarOff className="w-4 h-4 text-gray-300" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm max-w-32 truncate">
                            {event.source_website ? (
                              <a
                                href={event.source_website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                Link
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleViewRegistrations(event.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium transition-colors"
                            >
                              <Users className="w-3.5 h-3.5" />
                              {selectedEventId === event.id ? "Hide" : "View"}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() =>
                                handleDelete(event.id, event.title)
                              }
                              disabled={deletingId === event.id}
                              className="flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {deletingId === event.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Delete
                            </button>
                          </td>
                        </tr>

                        {/* Registrations expandable row */}
                        {selectedEventId === event.id && (
                          <tr key={`${event.id}-regs`}>
                            <td colSpan={13} className="bg-blue-50 px-6 py-4">
                              <p className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Registrations for &quot;{event.title}&quot;
                              </p>
                              {loadingRegs ? (
                                <div className="flex items-center gap-2 text-blue-600 text-sm">
                                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                  Loading...
                                </div>
                              ) : registrations.length === 0 ? (
                                <p className="text-sm text-blue-600">
                                  No registrations yet.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-blue-200">
                                  <table className="min-w-full text-sm bg-white">
                                    <thead className="bg-blue-100">
                                      <tr>
                                        {[
                                          "Name",
                                          "Email",
                                          "Phone",
                                          "Registered At",
                                          "Payment Status",
                                          "Amount Paid",
                                        ].map((h) => (
                                          <th
                                            key={h}
                                            className="px-4 py-2 text-left text-xs font-semibold text-blue-700 whitespace-nowrap"
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-50">
                                      {registrations.map((reg) => (
                                        <tr
                                          key={reg.id}
                                          className="hover:bg-blue-50"
                                        >
                                          <td className="px-4 py-2 font-medium text-gray-900">
                                            {reg.user?.name || reg.full_name}
                                          </td>
                                          <td className="px-4 py-2 text-gray-600">
                                            {reg.user?.email || reg.email}
                                          </td>
                                          <td className="px-4 py-2 text-gray-600">
                                            {reg.user?.phone ||
                                              reg.phone ||
                                              "—"}
                                          </td>
                                          <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                                            {new Date(
                                              reg.registered_at,
                                            ).toLocaleDateString("en-IN")}
                                          </td>
                                          <td className="px-4 py-2">
                                            <span
                                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                reg.payment_status === "paid"
                                                  ? "bg-green-100 text-green-700"
                                                  : "bg-gray-100 text-gray-600"
                                              }`}
                                            >
                                              {reg.payment_status}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-gray-700">
                                            {reg.amount_paid != null
                                              ? `₹${reg.amount_paid}`
                                              : "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages} &nbsp;·&nbsp; {totalEvents}{" "}
                  events total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1 || loadingEvents}
                    className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  >
                    «
                  </button>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || loadingEvents}
                    className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  >
                    ‹ Prev
                  </button>

                  {/* Page number buttons — show up to 5 around current */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 2,
                    )
                    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                        acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "…" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-xs text-gray-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p as number)}
                          disabled={loadingEvents}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            currentPage === p
                              ? "bg-rose-500 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || loadingEvents}
                    className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  >
                    Next ›
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages || loadingEvents}
                    className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <AuthGuard>
      <EventsContent />
    </AuthGuard>
  );
}
