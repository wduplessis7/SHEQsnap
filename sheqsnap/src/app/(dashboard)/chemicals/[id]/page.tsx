"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, Edit, Save, X, Loader2, Upload, Trash2, Plus,
  Search, Copy, Check, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

function safeParseJson(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isWithin90Days(date: string | null | undefined) {
  if (!date) return false;
  const end = new Date(date);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return diff <= 90 * 24 * 60 * 60 * 1000;
}

function isPast(date: string | null | undefined) {
  if (!date) return false;
  return new Date(date) < new Date();
}

export default function ChemicalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>({});
  const [ghsPictograms, setGhsPictograms] = useState<string[]>([]);
  const [ghsInput, setGhsInput] = useState("");
  const [pubchemLoading, setPubchemLoading] = useState(false);
  const [pubchemMessage, setPubchemMessage] = useState("");

  const [sdsUploading, setSdsUploading] = useState(false);
  const [sdsError, setSdsError] = useState("");
  const [showSdsForm, setShowSdsForm] = useState(false);
  const [sdsFile, setSdsFile] = useState<File | null>(null);
  const [sdsForm, setSdsForm] = useState({ version: "1.0", language: "English", effectiveDate: "", expiryDate: "", notes: "" });
  const sdsFileRef = useRef<HTMLInputElement>(null);

  const [showLocForm, setShowLocForm] = useState(false);
  const [locSaving, setLocSaving] = useState(false);
  const [locError, setLocError] = useState("");
  const [locForm, setLocForm] = useState({ locationName: "", buildingArea: "", quantity: "", unit: "kg", maxQuantity: "", storageConditions: "" });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/chemicals/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setItem(data);
        const pics = safeParseJson(data.ghsPictograms);
        setGhsPictograms(pics);
        setForm({
          name: data.name || "",
          tradeName: data.tradeName || "",
          casNumber: data.casNumber || "",
          formula: data.formula || "",
          manufacturer: data.manufacturer || "",
          supplier: data.supplier || "",
          physicalState: data.physicalState || "",
          colour: data.colour || "",
          odour: data.odour || "",
          isHazardous: data.isHazardous ?? true,
          hazardClass: data.hazardClass || "",
          signalWord: data.signalWord || "",
          hazardStatements: safeParseJson(data.hazardStatements).join("\n"),
          precautionaryStatements: safeParseJson(data.precautionaryStatements).join("\n"),
          flashPoint: data.flashPoint || "",
          boilingPoint: data.boilingPoint || "",
          unNumber: data.unNumber || "",
          mhiThreshold: data.mhiThreshold != null ? String(data.mhiThreshold) : "",
          mhiQuantityOnSite: data.mhiQuantityOnSite != null ? String(data.mhiQuantityOnSite) : "",
          emergencyContact: data.emergencyContact || "",
          poisonCentre: data.poisonCentre || "",
          notes: data.notes || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function setField(key: string, value: string | boolean) {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }

  function addGhsPictogram() {
    const val = ghsInput.trim().toUpperCase();
    if (val && !ghsPictograms.includes(val)) setGhsPictograms((prev) => [...prev, val]);
    setGhsInput("");
  }

  async function handlePubchemLookup() {
    const cas = form.casNumber?.trim();
    if (!cas) return;
    setPubchemLoading(true);
    setPubchemMessage("");
    try {
      const res = await fetch(`/api/chemicals/pubchem?cas=${encodeURIComponent(cas)}`);
      if (!res.ok) { setPubchemMessage("Not found in PubChem"); return; }
      const data = await res.json();
      setForm((prev: any) => ({
        ...prev,
        formula: data.formula || prev.formula,
        hazardClass: data.hazardClass || prev.hazardClass,
        signalWord: data.signalWord || prev.signalWord,
        hazardStatements: Array.isArray(data.hazardStatements) ? data.hazardStatements.join("\n") : prev.hazardStatements,
        precautionaryStatements: Array.isArray(data.precautionaryStatements) ? data.precautionaryStatements.join("\n") : prev.precautionaryStatements,
      }));
      if (Array.isArray(data.ghsPictograms) && data.ghsPictograms.length > 0) setGhsPictograms(data.ghsPictograms);
      setPubchemMessage("PubChem data loaded");
    } catch {
      setPubchemMessage("Not found in PubChem");
    } finally {
      setPubchemLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const hazardStatementsArr = form.hazardStatements.split("\n").map((s: string) => s.trim()).filter(Boolean);
      const precautionaryStatementsArr = form.precautionaryStatements.split("\n").map((s: string) => s.trim()).filter(Boolean);
      const payload = {
        ...form,
        ghsPictograms: JSON.stringify(ghsPictograms),
        hazardStatements: JSON.stringify(hazardStatementsArr),
        precautionaryStatements: JSON.stringify(precautionaryStatementsArr),
        signalWord: form.signalWord || null,
        physicalState: form.physicalState || null,
        tradeName: form.tradeName || null,
        casNumber: form.casNumber || null,
        formula: form.formula || null,
        manufacturer: form.manufacturer || null,
        supplier: form.supplier || null,
        colour: form.colour || null,
        odour: form.odour || null,
        hazardClass: form.hazardClass || null,
        flashPoint: form.flashPoint || null,
        boilingPoint: form.boilingPoint || null,
        unNumber: form.unNumber || null,
        mhiThreshold: form.mhiThreshold ? parseFloat(form.mhiThreshold) : null,
        mhiQuantityOnSite: form.mhiQuantityOnSite ? parseFloat(form.mhiQuantityOnSite) : null,
        emergencyContact: form.emergencyContact || null,
        poisonCentre: form.poisonCentre || null,
        notes: form.notes || null,
      };
      const res = await fetch(`/api/chemicals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setItem((prev: any) => ({ ...prev, ...updated }));
        setEditing(false);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSdsUpload(e: React.FormEvent) {
    e.preventDefault();
    setSdsError("");
    if (!sdsFile) { setSdsError("Please select a PDF file."); return; }
    setSdsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", sdsFile);
      fd.append("chemicalId", id);
      const uploadRes = await fetch("/api/attachments", { method: "POST", body: fd });
      if (!uploadRes.ok) { setSdsError("File upload failed."); return; }
      const uploadData = await uploadRes.json();
      const sdsRes = await fetch(`/api/chemicals/${id}/sds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadData.filename,
          originalName: sdsFile.name,
          fileSize: sdsFile.size,
          version: sdsForm.version || "1.0",
          language: sdsForm.language || "English",
          effectiveDate: sdsForm.effectiveDate || null,
          expiryDate: sdsForm.expiryDate || null,
          notes: sdsForm.notes || null,
          isActive: true,
        }),
      });
      if (sdsRes.ok) {
        const newSds = await sdsRes.json();
        setItem((prev: any) => ({ ...prev, sdsDocuments: [newSds, ...(prev.sdsDocuments || [])] }));
        setSdsForm({ version: "1.0", language: "English", effectiveDate: "", expiryDate: "", notes: "" });
        setSdsFile(null);
        if (sdsFileRef.current) sdsFileRef.current.value = "";
        setShowSdsForm(false);
      } else {
        const err = await sdsRes.json();
        setSdsError(err.error || "Failed to save SDS record.");
      }
    } finally {
      setSdsUploading(false);
    }
  }

  async function handleSdsDelete(sdsId: string) {
    if (!confirm("Delete this SDS document?")) return;
    const res = await fetch(`/api/chemicals/${id}/sds/${sdsId}`, { method: "DELETE" });
    if (res.ok) {
      setItem((prev: any) => ({ ...prev, sdsDocuments: prev.sdsDocuments.filter((s: any) => s.id !== sdsId) }));
    }
  }

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    setLocError("");
    if (!locForm.locationName.trim()) { setLocError("Location name is required."); return; }
    setLocSaving(true);
    try {
      const res = await fetch(`/api/chemicals/${id}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: locForm.locationName,
          buildingArea: locForm.buildingArea || null,
          quantity: locForm.quantity ? parseFloat(locForm.quantity) : null,
          unit: locForm.unit || "kg",
          maxQuantity: locForm.maxQuantity ? parseFloat(locForm.maxQuantity) : null,
          storageConditions: locForm.storageConditions || null,
        }),
      });
      if (res.ok) {
        const newLoc = await res.json();
        setItem((prev: any) => ({ ...prev, locations: [...(prev.locations || []), newLoc] }));
        setLocForm({ locationName: "", buildingArea: "", quantity: "", unit: "kg", maxQuantity: "", storageConditions: "" });
        setShowLocForm(false);
      } else {
        const err = await res.json();
        setLocError(err.error || "Failed to add location.");
      }
    } finally {
      setLocSaving(false);
    }
  }

  async function handleDeleteLocation(locId: string) {
    if (!confirm("Delete this storage location?")) return;
    const res = await fetch(`/api/chemicals/${id}/locations/${locId}`, { method: "DELETE" });
    if (res.ok) {
      setItem((prev: any) => ({ ...prev, locations: prev.locations.filter((l: any) => l.id !== locId) }));
    }
  }

  async function copyEmergencyUrl(token: string) {
    const url = `${window.location.origin}/emergency/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!item || item.error) return <div className="text-center py-8 text-gray-500">Chemical not found.</div>;

  const ghsPics = safeParseJson(item.ghsPictograms);
  const hazardStatements = safeParseJson(item.hazardStatements);
  const precautionaryStatements = safeParseJson(item.precautionaryStatements);
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/chemicals"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {item.referenceNo}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
              {item.tradeName && <span className="text-gray-500 text-base">({item.tradeName})</span>}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {item.isHazardous ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Hazardous</span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Non-Hazardous</span>
              )}
              {item.signalWord === "DANGER" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">DANGER</span>
              )}
              {item.signalWord === "WARNING" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">WARNING</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <Button variant="outline" onClick={() => setEditing(true)}><Edit className="h-4 w-4" />Edit</Button>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setError(""); setPubchemMessage(""); }}>
                <X className="h-4 w-4" />Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="sds">SDS Library ({item.sdsDocuments?.length || 0})</TabsTrigger>
          <TabsTrigger value="locations">Locations ({item.locations?.length || 0})</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          {editing ? (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Chemical Name *</Label>
                    <Input value={form.name} onChange={(e) => setField("name", e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label>Trade Name</Label>
                    <Input value={form.tradeName} onChange={(e) => setField("tradeName", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>CAS Number</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={form.casNumber} onChange={(e) => setField("casNumber", e.target.value)} className="flex-1" />
                      <Button type="button" variant="outline" size="sm" onClick={handlePubchemLookup} disabled={pubchemLoading || !form.casNumber?.trim()} className="whitespace-nowrap">
                        {pubchemLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        PubChem
                      </Button>
                    </div>
                    {pubchemMessage && (
                      <p className={`text-xs mt-1 ${pubchemMessage.includes("loaded") ? "text-green-600" : "text-amber-600"}`}>{pubchemMessage}</p>
                    )}
                  </div>
                  <div>
                    <Label>Formula</Label>
                    <Input value={form.formula} onChange={(e) => setField("formula", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Physical State</Label>
                    <Select value={form.physicalState || "none"} onValueChange={(v) => setField("physicalState", v === "none" ? "" : v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="SOLID">Solid</SelectItem>
                        <SelectItem value="LIQUID">Liquid</SelectItem>
                        <SelectItem value="GAS">Gas</SelectItem>
                        <SelectItem value="AEROSOL">Aerosol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Manufacturer</Label>
                    <Input value={form.manufacturer} onChange={(e) => setField("manufacturer", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <Input value={form.supplier} onChange={(e) => setField("supplier", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Colour</Label>
                    <Input value={form.colour} onChange={(e) => setField("colour", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Odour</Label>
                    <Input value={form.odour} onChange={(e) => setField("odour", e.target.value)} className="mt-1" />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <input type="checkbox" id="isHazardousEdit" checked={form.isHazardous} onChange={(e) => setField("isHazardous", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                    <label htmlFor="isHazardousEdit" className="text-sm font-medium text-gray-700 cursor-pointer">This chemical is hazardous</label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">GHS Classification</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Hazard Class</Label>
                    <Input value={form.hazardClass} onChange={(e) => setField("hazardClass", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Signal Word</Label>
                    <Select value={form.signalWord || "none"} onValueChange={(v) => setField("signalWord", v === "none" ? "" : v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="DANGER">DANGER</SelectItem>
                        <SelectItem value="WARNING">WARNING</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>GHS Pictograms</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={ghsInput} onChange={(e) => setGhsInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGhsPictogram(); } }} placeholder="e.g. GHS01" className="flex-1" />
                      <Button type="button" variant="outline" size="sm" onClick={addGhsPictogram}><Plus className="h-4 w-4" />Add</Button>
                    </div>
                    {ghsPictograms.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ghsPictograms.map((p) => (
                          <span key={p} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                            {p}
                            <button type="button" onClick={() => setGhsPictograms((prev) => prev.filter((x) => x !== p))} className="hover:text-orange-900"><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label>Hazard Statements <span className="text-gray-400 font-normal">(one per line)</span></Label>
                    <Textarea value={form.hazardStatements} onChange={(e) => setField("hazardStatements", e.target.value)} rows={4} className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Precautionary Statements <span className="text-gray-400 font-normal">(one per line)</span></Label>
                    <Textarea value={form.precautionaryStatements} onChange={(e) => setField("precautionaryStatements", e.target.value)} rows={4} className="mt-1" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Physical Properties &amp; Regulatory</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Flash Point</Label><Input value={form.flashPoint} onChange={(e) => setField("flashPoint", e.target.value)} className="mt-1" /></div>
                  <div><Label>Boiling Point</Label><Input value={form.boilingPoint} onChange={(e) => setField("boilingPoint", e.target.value)} className="mt-1" /></div>
                  <div><Label>UN Number</Label><Input value={form.unNumber} onChange={(e) => setField("unNumber", e.target.value)} className="mt-1" /></div>
                  <div><Label>MHI Threshold (t)</Label><Input type="number" step="any" value={form.mhiThreshold} onChange={(e) => setField("mhiThreshold", e.target.value)} className="mt-1" /></div>
                  <div><Label>MHI Quantity on Site (t)</Label><Input type="number" step="any" value={form.mhiQuantityOnSite} onChange={(e) => setField("mhiQuantityOnSite", e.target.value)} className="mt-1" /></div>
                  <div><Label>Emergency Contact</Label><Input value={form.emergencyContact} onChange={(e) => setField("emergencyContact", e.target.value)} className="mt-1" /></div>
                  <div><Label>Poison Centre</Label><Input value={form.poisonCentre} onChange={(e) => setField("poisonCentre", e.target.value)} className="mt-1" /></div>
                  <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={3} className="mt-1" /></div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chemical Name</dt><dd className="mt-1 text-sm text-gray-900 font-medium">{item.name}</dd></div>
                      {item.tradeName && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Trade Name</dt><dd className="mt-1 text-sm text-gray-900">{item.tradeName}</dd></div>}
                      {item.casNumber && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">CAS Number</dt><dd className="mt-1 text-sm font-mono text-gray-900">{item.casNumber}</dd></div>}
                      {item.formula && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Formula</dt><dd className="mt-1 text-sm font-mono text-gray-900">{item.formula}</dd></div>}
                      {item.physicalState && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Physical State</dt><dd className="mt-1 text-sm text-gray-900">{item.physicalState}</dd></div>}
                      {item.manufacturer && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manufacturer</dt><dd className="mt-1 text-sm text-gray-900">{item.manufacturer}</dd></div>}
                      {item.supplier && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Supplier</dt><dd className="mt-1 text-sm text-gray-900">{item.supplier}</dd></div>}
                      {item.colour && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Colour</dt><dd className="mt-1 text-sm text-gray-900">{item.colour}</dd></div>}
                      {item.odour && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Odour</dt><dd className="mt-1 text-sm text-gray-900">{item.odour}</dd></div>}
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">GHS Classification</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {item.hazardClass && (
                      <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hazard Class</dt><dd className="mt-1 text-sm text-gray-900">{item.hazardClass}</dd></div>
                    )}
                    {ghsPics.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">GHS Pictograms</p>
                        <div className="flex flex-wrap gap-2">
                          {ghsPics.map((p) => (
                            <span key={p} className="inline-flex items-center bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-1 rounded-full">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {hazardStatements.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Hazard Statements</p>
                        <ol className="space-y-1">
                          {hazardStatements.map((s, i) => (
                            <li key={i} className="text-sm text-gray-900 flex gap-2">
                              <span className="text-gray-400 min-w-[1.5rem]">{i + 1}.</span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {precautionaryStatements.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Precautionary Statements</p>
                        <ol className="space-y-1">
                          {precautionaryStatements.map((s, i) => (
                            <li key={i} className="text-sm text-gray-900 flex gap-2">
                              <span className="text-gray-400 min-w-[1.5rem]">{i + 1}.</span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(item.flashPoint || item.boilingPoint || item.unNumber || item.mhiThreshold != null || item.mhiQuantityOnSite != null) && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Physical Properties &amp; Regulatory</CardTitle></CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {item.flashPoint && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Flash Point</dt><dd className="mt-1 text-sm text-gray-900">{item.flashPoint}</dd></div>}
                        {item.boilingPoint && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Boiling Point</dt><dd className="mt-1 text-sm text-gray-900">{item.boilingPoint}</dd></div>}
                        {item.unNumber && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">UN Number</dt><dd className="mt-1 text-sm font-mono text-gray-900">{item.unNumber}</dd></div>}
                        {item.mhiThreshold != null && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">MHI Threshold</dt><dd className="mt-1 text-sm text-gray-900">{item.mhiThreshold} t</dd></div>}
                        {item.mhiQuantityOnSite != null && <div><dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">MHI Qty on Site</dt><dd className="mt-1 text-sm text-gray-900">{item.mhiQuantityOnSite} t</dd></div>}
                      </dl>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Record Info</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div><p className="text-xs text-gray-500">Reference</p><p className="font-mono font-medium text-xs">{item.referenceNo}</p></div>
                    <div><p className="text-xs text-gray-500">Added By</p><p className="font-medium">{item.addedBy?.name || "—"}</p></div>
                    <div><p className="text-xs text-gray-500">Created</p><p className="text-gray-600">{formatDateTime(item.createdAt)}</p></div>
                    <div><p className="text-xs text-gray-500">Updated</p><p className="text-gray-600">{formatDateTime(item.updatedAt)}</p></div>
                  </CardContent>
                </Card>

                {(item.emergencyContact || item.poisonCentre) && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-red-700">Emergency Contacts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm pt-0">
                      {item.emergencyContact && (
                        <div>
                          <p className="text-xs text-red-500">Emergency Contact</p>
                          <p className="font-medium text-red-800">{item.emergencyContact}</p>
                        </div>
                      )}
                      {item.poisonCentre && (
                        <div>
                          <p className="text-xs text-red-500">Poison Centre</p>
                          <p className="font-medium text-red-800">{item.poisonCentre}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {item.notes && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sds" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowSdsForm((v) => !v)}>
              <Upload className="h-4 w-4" />{showSdsForm ? "Cancel" : "Upload SDS"}
            </Button>
          </div>

          {showSdsForm && (
            <Card>
              <CardHeader><CardTitle className="text-base">Upload SDS Document</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSdsUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>PDF File *</Label>
                    <input
                      type="file"
                      accept="application/pdf"
                      ref={sdsFileRef}
                      onChange={(e) => setSdsFile(e.target.files?.[0] ?? null)}
                      className="block w-full mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    />
                  </div>
                  <div>
                    <Label>Version</Label>
                    <Input value={sdsForm.version} onChange={(e) => setSdsForm((f) => ({ ...f, version: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Language</Label>
                    <Input value={sdsForm.language} onChange={(e) => setSdsForm((f) => ({ ...f, language: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Effective Date</Label>
                    <Input type="date" value={sdsForm.effectiveDate} onChange={(e) => setSdsForm((f) => ({ ...f, effectiveDate: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input type="date" value={sdsForm.expiryDate} onChange={(e) => setSdsForm((f) => ({ ...f, expiryDate: e.target.value }))} className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Textarea value={sdsForm.notes} onChange={(e) => setSdsForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1" />
                  </div>
                  {sdsError && <p className="md:col-span-2 text-sm text-red-600">{sdsError}</p>}
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={sdsUploading}>
                      {sdsUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {sdsUploading ? "Uploading..." : "Upload SDS"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                    <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Language</th>
                    <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Effective</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Expiry</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="hidden sm:table-cell text-left px-4 py-3 font-medium text-gray-600">Uploaded</th>
                    {isAdmin && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(item.sdsDocuments || []).length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-6 text-gray-400">No SDS documents uploaded</td></tr>
                  ) : (
                    [...(item.sdsDocuments || [])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((sds: any) => {
                      const expiring = isWithin90Days(sds.expiryDate) && !isPast(sds.expiryDate);
                      const expired = isPast(sds.expiryDate);
                      return (
                        <tr key={sds.id} className={cn("border-b last:border-0 hover:bg-gray-50", expired && "bg-red-50")}>
                          <td className="px-4 py-3 text-gray-700 font-mono">{sds.version}</td>
                          <td className="px-4 py-3">
                            <a href={`/api/uploads/${sds.filename}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-xs block">
                              {sds.originalName || sds.filename}
                            </a>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-gray-600">{sds.language}</td>
                          <td className="hidden md:table-cell px-4 py-3 text-gray-600">{formatDate(sds.effectiveDate)}</td>
                          <td className="px-4 py-3">
                            {sds.expiryDate ? (
                              <span className={cn("text-sm", expired ? "text-red-600 font-medium" : expiring ? "text-amber-600 font-medium" : "text-gray-600")}>
                                {formatDate(sds.expiryDate)}
                                {expired && <span className="ml-1 text-xs">(Expired)</span>}
                                {expiring && !expired && <span className="ml-1 text-xs flex items-center gap-0.5 inline-flex"><AlertTriangle className="h-3 w-3" />Soon</span>}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {sds.isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-gray-500 text-xs">{formatDate(sds.createdAt)}</td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-7 w-7" onClick={() => handleSdsDelete(sds.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowLocForm((v) => !v)}>
              <Plus className="h-4 w-4" />{showLocForm ? "Cancel" : "Add Location"}
            </Button>
          </div>

          {showLocForm && (
            <Card>
              <CardHeader><CardTitle className="text-base">Add Storage Location</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAddLocation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Location Name *</Label>
                    <Input value={locForm.locationName} onChange={(e) => setLocForm((f) => ({ ...f, locationName: e.target.value }))} placeholder="e.g. Chemical Store A" className="mt-1" />
                  </div>
                  <div>
                    <Label>Building / Area</Label>
                    <Input value={locForm.buildingArea} onChange={(e) => setLocForm((f) => ({ ...f, buildingArea: e.target.value }))} placeholder="e.g. Warehouse B, Room 12" className="mt-1" />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" step="any" value={locForm.quantity} onChange={(e) => setLocForm((f) => ({ ...f, quantity: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input value={locForm.unit} onChange={(e) => setLocForm((f) => ({ ...f, unit: e.target.value }))} placeholder="kg" className="mt-1" />
                  </div>
                  <div>
                    <Label>Max Quantity</Label>
                    <Input type="number" step="any" value={locForm.maxQuantity} onChange={(e) => setLocForm((f) => ({ ...f, maxQuantity: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Storage Conditions</Label>
                    <Input value={locForm.storageConditions} onChange={(e) => setLocForm((f) => ({ ...f, storageConditions: e.target.value }))} placeholder="e.g. Cool, dry, ventilated" className="mt-1" />
                  </div>
                  {locError && <p className="md:col-span-2 text-sm text-red-600">{locError}</p>}
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={locSaving}>
                      {locSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {locSaving ? "Saving..." : "Add Location"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                    <th className="hidden md:table-cell text-left px-4 py-3 font-medium text-gray-600">Building / Area</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Quantity</th>
                    <th className="hidden lg:table-cell text-left px-4 py-3 font-medium text-gray-600">Storage Conditions</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">QR / Emergency</th>
                    {isAdmin && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(item.locations || []).length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-gray-400">No storage locations added</td></tr>
                  ) : (
                    (item.locations || []).map((loc: any) => (
                      <tr key={loc.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{loc.locationName}</td>
                        <td className="hidden md:table-cell px-4 py-3 text-gray-600">{loc.buildingArea || "—"}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {loc.quantity != null ? `${loc.quantity} ${loc.unit || ""}` : "—"}
                          {loc.maxQuantity != null && <span className="text-gray-400 text-xs"> / max {loc.maxQuantity}</span>}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 text-gray-600 max-w-xs">
                          <span className="truncate block">{loc.storageConditions || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {loc.qrToken && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 gap-1"
                              onClick={() => copyEmergencyUrl(loc.qrToken)}
                            >
                              {copiedToken === loc.qrToken ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copiedToken === loc.qrToken ? "Copied!" : "Emergency URL"}
                            </Button>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-7 w-7" onClick={() => handleDeleteLocation(loc.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Changed By</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {(item.auditLogs || []).length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-6 text-gray-400">No audit history</td></tr>
                  ) : (
                    (item.auditLogs || []).map((log: any) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatDateTime(log.timestamp)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{log.action}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{log.changedBy?.name || "System"}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-sm">
                          {log.changes ? (
                            <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                              {typeof log.changes === "string"
                                ? (() => { try { return JSON.stringify(JSON.parse(log.changes), null, 2); } catch { return log.changes; } })()
                                : JSON.stringify(log.changes, null, 2)}
                            </pre>
                          ) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
