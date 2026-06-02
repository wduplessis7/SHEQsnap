"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, RefreshCw, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface LegalPosition {
  id: string;
  name: string;
  code: string;
  orgType: string;
  appointmentCategory: string;
  isStatutory: boolean;
  termLengthMonths: number | null;
  renewalAllowed: boolean;
  isActive: boolean;
  archivedAt: string | null;
  archivedReason: string | null;
}

function formatOrgType(orgType: string): string {
  const map: Record<string, string> = {
    PRIVATE_COMPANY: "Private Company",
    PUBLIC_COMPANY: "Public Company",
    SOE: "SOE",
    MUNICIPALITY: "Municipality",
    GOVERNMENT_ENTITY: "Government Entity",
    NPO: "NPO",
    TRUST: "Trust",
    BOARD: "Board",
    COMMITTEE: "Committee",
    OTHER: "Other",
  };
  return map[orgType] ?? orgType;
}

function formatCategory(category: string): string {
  const map: Record<string, string> = {
    BOARD: "Board",
    EXECUTIVE: "Executive",
    STATUTORY: "Statutory",
    COMMITTEE: "Committee",
    REGULATORY: "Regulatory",
    OTHER: "Other",
  };
  return map[category] ?? category;
}

export default function LegalPositionsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "ADMIN";

  const [items, setItems] = useState<LegalPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/legal-positions");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function handleArchive(position: LegalPosition) {
    const reason = window.prompt(
      `Archive "${position.name}"?\n\nPlease provide a reason for archiving:`
    );
    if (reason === null) return; // cancelled
    const res = await fetch(`/api/admin/legal-positions/${position.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      fetchData();
    } else {
      alert("Failed to archive position.");
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Scale className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-700">Access Denied</h2>
          <p className="text-gray-500 mt-1">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Positions</h1>
          <p className="text-gray-500 mt-1">{items.length} position{items.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/admin/legal-positions/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New Position
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Org Type</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statutory</th>
                <th className="hidden lg:table-cell text-left px-4 py-3 font-medium text-gray-600">Term</th>
                <th className="hidden lg:table-cell text-left px-4 py-3 font-medium text-gray-600">Renewals</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    No legal positions found.{" "}
                    <Link href="/admin/legal-positions/new" className="text-blue-600 hover:underline">
                      Create the first one.
                    </Link>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/legal-positions/${item.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.code}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600">
                      {formatOrgType(item.orgType)}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-gray-600">
                      {formatCategory(item.appointmentCategory)}
                    </td>
                    <td className="px-4 py-3">
                      {item.isStatutory ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">Yes</Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-gray-600">
                      {item.termLengthMonths ? `${item.termLengthMonths} mo` : "—"}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 text-gray-600">
                      {item.renewalAllowed ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3">
                      {item.isActive ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                      ) : (
                        <span className="text-xs text-gray-400">Archived</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <Link href={`/admin/legal-positions/${item.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            Edit
                          </Button>
                        </Link>
                        {item.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleArchive(item)}
                          >
                            Archive
                          </Button>
                        )}
                      </div>
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
