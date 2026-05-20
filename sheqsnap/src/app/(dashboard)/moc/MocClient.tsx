"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  HelpCircle,
  GitPullRequest,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

interface ChangeRequest {
  id: string;
  referenceNo: string;
  title: string;
  changeType: string;
  requestedByName: string;
  proposedDate: string | null;
  status: string;
  createdAt: string;
}

const CHANGE_TYPES = [
  "Process",
  "Equipment / Plant",
  "Document / Procedure",
  "Personnel",
  "Temporary Change",
  "Other",
];

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700">
          Draft
        </span>
      );
    case "pending_approval":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-700">
          Pending Approval
        </span>
      );
    case "approved":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
          Approved
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
          Rejected
        </span>
      );
    case "implemented":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
          Implemented
        </span>
      );
    case "closed":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500">
          Closed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700">
          {status}
        </span>
      );
  }
}

export default function MocClient() {
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [allChanges, setAllChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchChanges = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("changeType", typeFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/moc?${params}`);
      if (res.ok) {
        const data = await res.json();
        setChanges(data);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  useEffect(() => {
    fetch("/api/moc")
      .then((r) => r.json())
      .then((d) => setAllChanges(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [changes]);

  const totalCount = allChanges.length;
  const draftCount = allChanges.filter((c) => c.status === "draft").length;
  const pendingCount = allChanges.filter((c) => c.status === "pending_approval").length;
  const approvedCount = allChanges.filter((c) => c.status === "approved").length;
  const implementedCount = allChanges.filter((c) => c.status === "implemented").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Management of Change</h1>
            <Link href="/help/moc" className="text-gray-400 hover:text-blue-600 transition-colors" title="Help: MOC">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-gray-500 mt-1">Raise, track, and approve changes to processes and equipment</p>
        </div>
        <Link href="/moc/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Change Request
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Total</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Draft</p>
            <p className="text-3xl font-bold text-gray-500 mt-1">{draftCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-yellow-500 mt-1">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Approved</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Implemented</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{implementedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search title, description, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="implemented">Implemented</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Change Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CHANGE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={fetchChanges}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Change Type</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Requested By</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Proposed Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : changes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <GitPullRequest className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No change requests found</p>
                    <p className="text-sm mt-1">Submit your first change request to get started</p>
                  </td>
                </tr>
              ) : (
                changes.map((change) => (
                  <tr
                    key={change.id}
                    className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{change.referenceNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{change.title}</td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700">
                        {change.changeType}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600">{change.requestedByName}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600">
                      {change.proposedDate ? formatDate(change.proposedDate) : "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(change.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/moc/${change.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
