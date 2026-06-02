'use client';
import { useOnlineStatus } from './useOnlineStatus';
import { enqueue, enqueueWithFiles } from '@/lib/offline-queue';

interface SubmitOptions {
  url: string;
  body: object;
  entityType: string;
  description: string;
}

interface SubmitResult {
  ok: boolean;
  offline: boolean;
  data?: any;
  error?: string;
}

export function useOfflineSubmit() {
  const isOnline = useOnlineStatus();

  async function submit({ url, body, entityType, description }: SubmitOptions): Promise<SubmitResult> {
    if (!isOnline) {
      try {
        await enqueue({
          url,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          entityType,
          description,
        });

        // Register background sync if supported
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if ('sync' in reg) {
            await (reg as any).sync.register('sheqsnap-queue');
          }
        }

        return { ok: true, offline: true };
      } catch (err) {
        return { ok: false, offline: true, error: 'Failed to save offline' };
      }
    }

    // Online — submit normally
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        return { ok: true, offline: false, data };
      } else {
        const err = await res.json().catch(() => ({}));
        return { ok: false, offline: false, error: err.error || 'Submission failed' };
      }
    } catch {
      return { ok: false, offline: false, error: 'Network error' };
    }
  }

  return { submit, isOnline };
}

export function useOfflineSubmitWithFiles() {
  const isOnline = useOnlineStatus();

  async function submitWithFiles(params: {
    url: string;
    body: object;
    entityType: string;
    description: string;
    files: { file: File; entityIdField: string }[];
  }): Promise<SubmitResult> {
    if (!isOnline) {
      try {
        await enqueueWithFiles(params);
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if ('sync' in reg) await (reg as any).sync.register('sheqsnap-queue');
        }
        return { ok: true, offline: true };
      } catch {
        return { ok: false, offline: true, error: 'Failed to save offline' };
      }
    }

    // Online: create record first, then upload files
    try {
      const res = await fetch(params.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params.body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, offline: false, error: err.error || 'Submission failed' };
      }
      const data = await res.json();
      const recordId = data.id;
      // Upload files
      for (const { file, entityIdField } of params.files) {
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append(entityIdField, recordId);
        await fetch('/api/attachments', { method: 'POST', body: formData }).catch(() => {});
      }
      return { ok: true, offline: false, data };
    } catch {
      return { ok: false, offline: false, error: 'Network error' };
    }
  }

  return { submitWithFiles, isOnline };
}
