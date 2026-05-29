"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Plus, Search, FileText, Shield, BookOpen, AlertCircle,
  Clock, CheckCircle, Archive, Loader2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ElementType> = {
  POLICY:    Shield,
  PROCEDURE: BookOpen,
  ONE_PAGER: FileText,
};

const TYPE_LABEL: Record<string, string> = {
  POLICY:    "Policy",
  PROCEDURE: "Procedure",
  ONE_PAGER: "One-Pager",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT:        "bg-gray-100 text-gray-600",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED:     "bg-blue-100 text-blue-800",
  PUBLISHED:    "bg-green-100 text-green-700",
  ARCHIVED:     "bg-red-50 text-red-600",
};

const STATUSES = ["", "DRAFT", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"];
const TYPES    = ["", "POLICY", "PROCEDURE", "ONE_PAGER"];

export default function DocumentsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const canCreate = ["SAFETY_OFFICER", "MANAGER", "ADMIN"].includes(user?.role);

  const [docs,    setDocs]    = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [type,    setType]    = useState("");
  const [status,  setStatus]  = useState("");
  const [stats,   setStats]   = useState({ total: 0, published: 0, underReview: 0, draft: 0 });

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (type)   params.set("type",   type);
      if (status) params.set("status", status);
      const res = await fetch(`/api/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [search, type, status]);

  const fetchStats = useCallback(async () => {
    const [all, published, underReview, draft] = await Promise.all([
      fetch("/api/documents?limit=1").then(r => r.json()),
      fetch("/api/documents?status=PUBLISHED&limit=1").then(r => r.json()),
      fetch("/api/documents?status=UNDER_REVIEW&limit=1").then(r => r.json()),
      fetch("/api/documents?status=DRAFT&limit=1").then(r => r.json()),
    ]);
    setStats({
      total:      all.total       ?? 0,
      published:  published.total ?? 0,
      underReview: underReview.total ?? 0,
      draft:      draft.total     ?? 0,
    });
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controlled documents — policies, procedures, and one-pagers</p>
        </div>
        {canCreate && (
          <Link href="/documents/new">
            <Button className="bg-[#1A1A1A] text-white hover:bg-black gap-1.5 shrink-0">
              <Plus className="h-4 w-4" /> New Document
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: stats.total,       icon: FileText,     color: "text-gray-600" },
          { label: "Published",   value: stats.published,   icon: CheckCircle,  color: "text-green-600" },
          { label: "In Review",   value: stats.underReview, icon: Clock,        color: "text-yellow-600" },
          { label: "Drafts",      value: stats.draft,       icon: AlertCircle,  color: "text-gray-400" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <s.icon className={cn("h-5 w-5 shrink-0", s.color)} />
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 text-gray-700"
        >
          <option value="">All Types</option>
          {TYPES.filter(Boolean).map(t => (
            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 text-gray-700"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <FileText className="h-10 w-10 text-gray-200 mb-3" />
            <p className="font-semibold text-gray-700">No documents found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || type || status
                ? "Try adjusting your filters."
                : canCreate
                ? "Create your first document to get started."
                : "No documents have been created yet."}
            </p>
            {canCreate && !search && !type && !status && (
              <Link href="/documents/new" className="mt-4">
                <Button size="sm" className="bg-[#1A1A1A] text-white hover:bg-black gap-1">
                  <Plus className="h-4 w-4" /> New Document
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8"></th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Document</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Version</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Owner</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Updated</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docs.map(doc => {
                  const Icon = TYPE_ICON[doc.type] ?? FileText;
                  const latest = doc.versions?.[0];
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Icon className="h-4 w-4 text-gray-400" />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/documents/${doc.id}`} className="block group">
                          <p className="font-semibold text-gray-900 group-hover:text-black truncate max-w-xs">
                            {doc.title}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {doc.docNumber}
                            {doc.category && <span className="ml-2 font-sans not-italic">{doc.category}</span>}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLOR[doc.status] ?? "bg-gray-100 text-gray-600")}>
                          {doc.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs font-mono text-gray-500">
                          {latest ? `v${latest.versionNumber}` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{doc.owner?.name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-400">{formatDate(doc.updatedAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/documents/${doc.id}`}>
                          <ChevronRight className="h-4 w-4 text-gray-300 hover:text-gray-600 transition-colors" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {total > docs.length && (
              <div className="px-4 py-3 border-t border-gray-100 text-center text-xs text-gray-400">
                Showing {docs.length} of {total} documents
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
