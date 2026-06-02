"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, RefreshCw, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ChemicalsPage() {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    isHazardous: "all",
  });

  useEffect(() => {
    if (searchParams.get("saved") === "offline") {
      setBanner("Chemical saved offline — will be submitted automatically when you reconnect");
      const t = setTimeout(() => setBanner(""), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filters.search) params.set("search", filters.search);
    if (filters.isHazardous !== "all") params.set("isHazardous", filters.isHazardous);
    try {
      const res = await fetch(`/api/chemicals?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function updateFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {banner && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-700">{banner}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Chemical Register</h1>
          </div>
          <p className="text-gray-500 mt-1">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/chemicals/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Chemical
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search name, trade name, CAS..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filters.isHazardous} onValueChange={(v) => updateFilter("isHazardous", v)}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Chemicals" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chemicals</SelectItem>
                <SelectItem value="true">Hazardous Only</SelectItem>
                <SelectItem value="false">Non-Hazardous</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">CAS Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Hazard</th>
                <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Signal Word</th>
                <th className="hidden lg:table-cell text-left px-4 py-3 font-medium text-gray-600">SDS Docs</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No chemicals found</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/chemicals/${item.id}`} className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200">
                        {item.referenceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/chemicals/${item.id}`} className="font-medium text-blue-600 hover:underline">
                        {item.name}
                      </Link>
                      {item.tradeName && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.tradeName}</p>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600 font-mono text-xs">
                      {item.casNumber || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {item.isHazardous ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Hazardous
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Non-Hazardous
                        </span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      {item.signalWord === "DANGER" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          DANGER
                        </span>
                      )}
                      {item.signalWord === "WARNING" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          WARNING
                        </span>
                      )}
                      {!item.signalWord && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-gray-600">
                      {item._count?.sdsDocuments ?? item.sdsDocuments?.length ?? 0} SDS
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
