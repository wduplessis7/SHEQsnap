"use client";

export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Search, X, Plus } from "lucide-react";
import { useOfflineSubmitWithFiles } from "@/hooks/useOfflineSubmit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewChemicalPage() {
  const router = useRouter();
  const { submitWithFiles, isOnline } = useOfflineSubmitWithFiles();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pubchemLoading, setPubchemLoading] = useState(false);
  const [pubchemMessage, setPubchemMessage] = useState("");

  const [sdsFile, setSdsFile] = useState<File | null>(null);
  const [sdsUploading, setSdsUploading] = useState(false);

  const [ghsInput, setGhsInput] = useState("");
  const [ghsPictograms, setGhsPictograms] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: "",
    tradeName: "",
    casNumber: "",
    formula: "",
    manufacturer: "",
    supplier: "",
    physicalState: "",
    colour: "",
    odour: "",
    isHazardous: true,
    hazardClass: "",
    signalWord: "",
    hazardStatements: "",
    precautionaryStatements: "",
    flashPoint: "",
    boilingPoint: "",
    unNumber: "",
    mhiThreshold: "",
    mhiQuantityOnSite: "",
    emergencyContact: "",
    poisonCentre: "",
    notes: "",
  });

  const [sdsForm, setSdsForm] = useState({
    version: "1.0",
    language: "English",
    effectiveDate: "",
    expiryDate: "",
    notes: "",
  });

  function setField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addGhsPictogram() {
    const val = ghsInput.trim().toUpperCase();
    if (val && !ghsPictograms.includes(val)) {
      setGhsPictograms((prev) => [...prev, val]);
    }
    setGhsInput("");
  }

  function removeGhsPictogram(p: string) {
    setGhsPictograms((prev) => prev.filter((x) => x !== p));
  }

  async function handlePubchemLookup() {
    if (!form.casNumber.trim()) return;
    setPubchemLoading(true);
    setPubchemMessage("");
    try {
      const res = await fetch(`/api/chemicals/pubchem?cas=${encodeURIComponent(form.casNumber.trim())}`);
      if (!res.ok) {
        setPubchemMessage("Not found in PubChem");
        return;
      }
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        formula: data.formula || prev.formula,
        hazardClass: data.hazardClass || prev.hazardClass,
        signalWord: data.signalWord || prev.signalWord,
        hazardStatements: Array.isArray(data.hazardStatements)
          ? data.hazardStatements.join("\n")
          : prev.hazardStatements,
        precautionaryStatements: Array.isArray(data.precautionaryStatements)
          ? data.precautionaryStatements.join("\n")
          : prev.precautionaryStatements,
      }));
      if (Array.isArray(data.ghsPictograms) && data.ghsPictograms.length > 0) {
        setGhsPictograms(data.ghsPictograms);
      }
      setPubchemMessage("PubChem data loaded");
    } catch {
      setPubchemMessage("Not found in PubChem");
    } finally {
      setPubchemLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const hazardStatementsArr = form.hazardStatements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const precautionaryStatementsArr = form.precautionaryStatements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const body: any = {
        ...form,
        ghsPictograms: JSON.stringify(ghsPictograms),
        hazardStatements: JSON.stringify(hazardStatementsArr),
        precautionaryStatements: JSON.stringify(precautionaryStatementsArr),
        signalWord: form.signalWord || null,
        physicalState: form.physicalState || null,
        formula: form.formula || null,
        tradeName: form.tradeName || null,
        casNumber: form.casNumber || null,
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

      const result = await submitWithFiles({
        url: "/api/chemicals",
        body,
        entityType: "Chemical",
        description: `Chemical: ${form.name}`,
        files: [],
      });

      if (result.offline) {
        router.push("/chemicals?saved=offline");
        return;
      }
      if (!result.ok) {
        setError(result.error ?? "Failed to create chemical");
        return;
      }

      const chemicalId = result.data.id;

      if (sdsFile && chemicalId) {
        setSdsUploading(true);
        try {
          const fd = new FormData();
          fd.append("file", sdsFile);
          fd.append("chemicalId", chemicalId);
          const uploadRes = await fetch("/api/attachments", { method: "POST", body: fd });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            await fetch(`/api/chemicals/${chemicalId}/sds`, {
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
          }
        } finally {
          setSdsUploading(false);
        }
      }

      router.push(`/chemicals/${chemicalId}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/chemicals">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Chemical</h1>
          <p className="text-gray-500 text-sm mt-0.5">Register a new chemical in the chemical register</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Chemical Name *</Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Hydrochloric Acid" required className="mt-1" />
            </div>
            <div>
              <Label>Trade Name <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input value={form.tradeName} onChange={(e) => setField("tradeName", e.target.value)} placeholder="Brand or trade name" className="mt-1" />
            </div>
            <div>
              <Label>CAS Number</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={form.casNumber}
                  onChange={(e) => setField("casNumber", e.target.value)}
                  placeholder="e.g. 7647-01-0"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePubchemLookup}
                  disabled={pubchemLoading || !form.casNumber.trim()}
                  className="whitespace-nowrap"
                >
                  {pubchemLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {pubchemLoading ? "Looking up..." : "Lookup PubChem"}
                </Button>
              </div>
              {pubchemMessage && (
                <p className={`text-xs mt-1 ${pubchemMessage.includes("loaded") ? "text-green-600" : "text-amber-600"}`}>
                  {pubchemMessage}
                </p>
              )}
            </div>
            <div>
              <Label>Molecular Formula</Label>
              <Input value={form.formula} onChange={(e) => setField("formula", e.target.value)} placeholder="e.g. HCl" className="mt-1" />
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
              <Input value={form.colour} onChange={(e) => setField("colour", e.target.value)} placeholder="e.g. Colourless" className="mt-1" />
            </div>
            <div>
              <Label>Odour</Label>
              <Input value={form.odour} onChange={(e) => setField("odour", e.target.value)} placeholder="e.g. Pungent" className="mt-1" />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="isHazardous"
                checked={form.isHazardous}
                onChange={(e) => setField("isHazardous", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="isHazardous" className="text-sm font-medium text-gray-700 cursor-pointer">
                This chemical is hazardous
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">GHS Classification</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Hazard Class</Label>
              <Input value={form.hazardClass} onChange={(e) => setField("hazardClass", e.target.value)} placeholder="e.g. Flammable Liquids" className="mt-1" />
            </div>
            <div>
              <Label>Signal Word</Label>
              <Select value={form.signalWord || "none"} onValueChange={(v) => setField("signalWord", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select signal word" /></SelectTrigger>
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
                <Input
                  value={ghsInput}
                  onChange={(e) => setGhsInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGhsPictogram(); } }}
                  placeholder="e.g. GHS01, GHS02, GHS06..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addGhsPictogram}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              {ghsPictograms.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {ghsPictograms.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                      {p}
                      <button type="button" onClick={() => removeGhsPictogram(p)} className="hover:text-orange-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <Label>Hazard Statements <span className="text-gray-400 font-normal">(one per line)</span></Label>
              <Textarea
                value={form.hazardStatements}
                onChange={(e) => setField("hazardStatements", e.target.value)}
                placeholder="H225 Highly flammable liquid and vapour&#10;H302 Harmful if swallowed"
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Precautionary Statements <span className="text-gray-400 font-normal">(one per line)</span></Label>
              <Textarea
                value={form.precautionaryStatements}
                onChange={(e) => setField("precautionaryStatements", e.target.value)}
                placeholder="P210 Keep away from heat, sparks and open flames&#10;P260 Do not breathe vapours"
                rows={4}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Physical Properties</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Flash Point</Label>
              <Input value={form.flashPoint} onChange={(e) => setField("flashPoint", e.target.value)} placeholder="e.g. -11°C" className="mt-1" />
            </div>
            <div>
              <Label>Boiling Point</Label>
              <Input value={form.boilingPoint} onChange={(e) => setField("boilingPoint", e.target.value)} placeholder="e.g. 78°C" className="mt-1" />
            </div>
            <div>
              <Label>UN Number</Label>
              <Input value={form.unNumber} onChange={(e) => setField("unNumber", e.target.value)} placeholder="e.g. UN1170" className="mt-1" />
            </div>
            <div>
              <Label>MHI Threshold (tonnes)</Label>
              <Input type="number" step="any" value={form.mhiThreshold} onChange={(e) => setField("mhiThreshold", e.target.value)} placeholder="0.00" className="mt-1" />
            </div>
            <div>
              <Label>MHI Quantity on Site (tonnes)</Label>
              <Input type="number" step="any" value={form.mhiQuantityOnSite} onChange={(e) => setField("mhiQuantityOnSite", e.target.value)} placeholder="0.00" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Emergency &amp; Regulatory</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Emergency Contact</Label>
              <Input value={form.emergencyContact} onChange={(e) => setField("emergencyContact", e.target.value)} placeholder="e.g. +27 11 123 4567" className="mt-1" />
            </div>
            <div>
              <Label>Poison Centre</Label>
              <Input value={form.poisonCentre} onChange={(e) => setField("poisonCentre", e.target.value)} placeholder="0861 555 777" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Additional notes..." rows={3} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">SDS Upload <span className="text-gray-400 font-normal text-sm">(optional)</span></CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>SDS Document (PDF)</Label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setSdsFile(e.target.files?.[0] ?? null)}
                className="block w-full mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
            {sdsFile && (
              <>
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
              </>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!isOnline && (
          <p className="text-sm text-amber-600">&#9889; Offline — will be saved locally and uploaded automatically</p>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/chemicals"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={saving || sdsUploading}>
            {saving || sdsUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : sdsUploading ? "Uploading SDS..." : "Save Chemical"}
          </Button>
        </div>
      </form>
    </div>
  );
}
