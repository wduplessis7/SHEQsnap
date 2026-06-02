"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useOfflineSubmit } from "@/hooks/useOfflineSubmit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewChemicalPage() {
  const router = useRouter();
  const { submit, isOnline } = useOfflineSubmit();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    productName: "",
    tradeName: "",
    manufacturer: "",
    supplier: "",
    physicalState: "",
    colour: "",
    odour: "",
    flashPoint: "",
    boilingPoint: "",
    isHazardous: true,
    unNumber: "",
    mhiThreshold: "",
    mhiQuantityOnSite: "",
    emergencyContact: "",
    poisonCentre: "",
    notes: "",
  });

  function setField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const result = await submit({
        url: "/api/chemicals",
        body: {
          ...form,
          tradeName: form.tradeName || null,
          manufacturer: form.manufacturer || null,
          supplier: form.supplier || null,
          physicalState: form.physicalState || null,
          colour: form.colour || null,
          odour: form.odour || null,
          flashPoint: form.flashPoint || null,
          boilingPoint: form.boilingPoint || null,
          unNumber: form.unNumber || null,
          mhiThreshold: form.mhiThreshold ? parseFloat(form.mhiThreshold) : null,
          mhiQuantityOnSite: form.mhiQuantityOnSite ? parseFloat(form.mhiQuantityOnSite) : null,
          emergencyContact: form.emergencyContact || null,
          poisonCentre: form.poisonCentre || null,
          notes: form.notes || null,
        },
        entityType: "Chemical",
        description: `Chemical product: ${form.productName}`,
      });

      if (result.offline) {
        router.push("/chemicals?saved=offline");
        return;
      }
      if (!result.ok) {
        setError(result.error ?? "Failed to create chemical product");
        return;
      }
      router.push(`/chemicals/${result.data.id}`);
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
          <h1 className="text-2xl font-bold text-gray-900">Add Chemical Product</h1>
          <p className="text-gray-500 text-sm mt-0.5">Register a new chemical product on site</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Product Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Product Name *</Label>
              <Input
                value={form.productName}
                onChange={(e) => setField("productName", e.target.value)}
                placeholder="e.g. Turpentine 500ml"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Trade Name <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                value={form.tradeName}
                onChange={(e) => setField("tradeName", e.target.value)}
                placeholder="Brand or trade name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input
                value={form.manufacturer}
                onChange={(e) => setField("manufacturer", e.target.value)}
                placeholder="e.g. Alcolin"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Supplier</Label>
              <Input
                value={form.supplier}
                onChange={(e) => setField("supplier", e.target.value)}
                className="mt-1"
              />
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
              <Label>Colour</Label>
              <Input
                value={form.colour}
                onChange={(e) => setField("colour", e.target.value)}
                placeholder="e.g. Colourless"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Odour</Label>
              <Input
                value={form.odour}
                onChange={(e) => setField("odour", e.target.value)}
                placeholder="e.g. Pungent"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Flash Point</Label>
              <Input
                value={form.flashPoint}
                onChange={(e) => setField("flashPoint", e.target.value)}
                placeholder="e.g. -11°C"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Boiling Point</Label>
              <Input
                value={form.boilingPoint}
                onChange={(e) => setField("boilingPoint", e.target.value)}
                placeholder="e.g. 78°C"
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="isHazardous"
                checked={form.isHazardous}
                onChange={(e) => setField("isHazardous", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="isHazardous" className="text-sm font-medium text-gray-700 cursor-pointer">
                This product is hazardous
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Regulatory</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>UN Number</Label>
              <Input
                value={form.unNumber}
                onChange={(e) => setField("unNumber", e.target.value)}
                placeholder="e.g. UN1170"
                className="mt-1"
              />
            </div>
            <div>
              <Label>MHI Threshold (tonnes)</Label>
              <Input
                type="number"
                step="any"
                value={form.mhiThreshold}
                onChange={(e) => setField("mhiThreshold", e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label>MHI Quantity on Site (tonnes)</Label>
              <Input
                type="number"
                step="any"
                value={form.mhiQuantityOnSite}
                onChange={(e) => setField("mhiQuantityOnSite", e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Emergency</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Emergency Contact</Label>
              <Input
                value={form.emergencyContact}
                onChange={(e) => setField("emergencyContact", e.target.value)}
                placeholder="e.g. +27 11 123 4567"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Poison Centre</Label>
              <Input
                value={form.poisonCentre}
                onChange={(e) => setField("poisonCentre", e.target.value)}
                placeholder="0861 555 777"
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="mt-1"
              />
            </div>
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
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Chemical Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
