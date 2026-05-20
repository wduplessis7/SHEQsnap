"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  HelpCircle,
  GraduationCap,
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

interface Induction {
  id: string;
  referenceNo: string;
  inducteeName: string;
  inducteeType: string;
  inductionType: string;
  conductedByName: string;
  conductedDate: string;
  expiryDate: string | null;
  status: string;
  createdAt: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "expired":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
          Expired
        </span>
      );
    case "expiring_soon":
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
          Expiring Soon
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
          Current
        </span>
      );
  }
}

function typeBadge(type: string) {
  return type === "contractor" ? (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 capitalize">
      Contractor
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
      Employee
    </span>
  );
}

export default function InductionsClient() {
  const [inductions, setInductions] = useState<Induction[]>([]);
  const [allInductions, setAllInductions] = useState<Induction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchInductions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("inducteeType", typeFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/inductions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInductions(data);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchInductions();
  }, [fetchInductions]);

  useEffect(() => {
    fetch("/api/inductions")
      .then((r) => r.json())
      .then((d) => setAllInductions(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [inductions]);

  const totalCount = allInductions.length;
  const currentCount = allInductions.filter((i) => i.status === "current").length;
  const expiringSoonCount = allInductions.filter((i) => i.status === "expiring_soon").length;
  const expiredCount = allInductions.filter((i) => i.status === "expired").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Inductions & Training</h1>
            <Link href="/help/inductions" className="text-gray-400 hover:text-blue-600 transition-colors" title="Help: Inductions">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-gray-500 mt-1">Track employee and contractor inductions and validity</p>
        </div>
        <Link href="/inductions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Record Induction
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Total</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Current</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{currentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
            <p className="text-3xl font-bold text-amber-500 mt-1">{expiringSoonCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-500">Expired</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{expiredCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search name, type, conducted by..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Inductee Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="contractor">Contractor</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={fetchInductions}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Inductee</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Induction Type</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Conducted Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expiry Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : inductions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No inductions found</p>
                    <p className="text-sm mt-1">Record your first induction to get started</p>
                  </td>
                </tr>
              ) : (
                inductions.map((ind) => (
                  <tr
                    key={ind.id}
                    className={cn(
                      "border-b last:border-0 hover:bg-gray-50 transition-colors",
                      ind.status === "expired" && "bg-red-50 hover:bg-red-100",
                      ind.status === "expiring_soon" && "bg-amber-50 hover:bg-amber-100"
                    )}
                  >
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{ind.referenceNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{ind.inducteeName}</td>
                    <td className="px-4 py-3">{typeBadge(ind.inducteeType)}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-gray-600">{ind.inductionType}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600">{formatDate(ind.conductedDate)}</td>
                    <td
                      className={cn(
                        "px-4 py-3 font-medium",
                        ind.status === "expired"
                          ? "text-red-600"
                          : ind.status === "expiring_soon"
                          ? "text-amber-600"
                          : "text-gray-600"
                      )}
                    >
                      {ind.expiryDate ? formatDate(ind.expiryDate) : "—"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(ind.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/inductions/${ind.id}`}>
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
