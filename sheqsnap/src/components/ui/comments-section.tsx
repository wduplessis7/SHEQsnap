"use client";

import { useState } from "react";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { formatDateTime } from "@/lib/utils";
import { Send } from "lucide-react";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

interface CommentsSectionProps {
  comments: Comment[];
  nearMissId?: string;
  incidentId?: string;
  actionId?: string;
  onCommentAdded: (comment: Comment) => void;
}

export function CommentsSection({
  comments,
  nearMissId,
  incidentId,
  actionId,
  onCommentAdded,
}: CommentsSectionProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, nearMissId, incidentId, actionId }),
      });
      if (res.ok) {
        const comment = await res.json();
        onCommentAdded(comment);
        setBody("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                {comment.author.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{comment.author.name}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{comment.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[60px] flex-1"
        />
        <Button type="submit" size="icon" disabled={submitting || !body.trim()} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
