"use client";

import { useState, useRef } from "react";
import { Button } from "./button";
import { Paperclip, Trash2, Upload, FileIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: { name: string };
}

interface AttachmentsSectionProps {
  attachments: Attachment[];
  nearMissId?: string;
  incidentId?: string;
  actionId?: string;
  onAttachmentAdded: (att: Attachment) => void;
  onAttachmentDeleted: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsSection({
  attachments,
  nearMissId,
  incidentId,
  actionId,
  onAttachmentAdded,
  onAttachmentDeleted,
}: AttachmentsSectionProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (nearMissId) fd.append("nearMissId", nearMissId);
      if (incidentId) fd.append("incidentId", incidentId);
      if (actionId) fd.append("actionId", actionId);

      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      if (res.ok) {
        const att = await res.json();
        onAttachmentAdded(att);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this attachment?")) return;
    const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    if (res.ok) onAttachmentDeleted(id);
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No attachments</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50"
            >
              <FileIcon className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <a
                  href={`/uploads/${att.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline truncate block"
                >
                  {att.originalName}
                </a>
                <p className="text-xs text-gray-400">
                  {formatBytes(att.size)} · {att.uploadedBy.name} · {formatDate(att.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-400 hover:text-red-600"
                onClick={() => handleDelete(att.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : "Upload File"}
      </Button>
    </div>
  );
}
