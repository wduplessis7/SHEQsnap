export interface PendingFile {
  name: string;
  type: string;
  data: ArrayBuffer;
  entityIdField: string; // e.g. 'nearMissId' | 'incidentId' | 'actionId'
}

export interface QueueItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  entityType: string;
  description: string;
  createdAt: number;
  pendingFiles?: PendingFile[];
}

const DB_NAME = 'sheqsnap-offline';
const STORE_NAME = 'pending-submissions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(item: Omit<QueueItem, 'id' | 'createdAt'>): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const entry: QueueItem = { ...item, id, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(entry);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

// Convenience: enqueue with File objects (converts to ArrayBuffer for storage)
export async function enqueueWithFiles(params: {
  url: string;
  body: object;
  entityType: string;
  description: string;
  files: { file: File; entityIdField: string }[];
}): Promise<string> {
  const pendingFiles: PendingFile[] = await Promise.all(
    params.files.map(async ({ file, entityIdField }) => ({
      name: file.name,
      type: file.type,
      data: await file.arrayBuffer(),
      entityIdField,
    }))
  );
  return enqueue({
    url: params.url,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params.body),
    entityType: params.entityType,
    description: params.description,
    pendingFiles: pendingFiles.length > 0 ? pendingFiles : undefined,
  });
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getQueue(): Promise<QueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as QueueItem[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function uploadPendingFiles(files: PendingFile[], recordId: string): Promise<void> {
  for (const pf of files) {
    const formData = new FormData();
    const blob = new Blob([pf.data], { type: pf.type });
    formData.append('file', blob, pf.name);
    formData.append(pf.entityIdField, recordId);
    // Fire-and-forget per file — don't fail the whole sync if one file fails
    try {
      await fetch('/api/attachments', { method: 'POST', body: formData });
    } catch {
      // Will not retry individual files — acceptable trade-off
    }
  }
}

export async function processQueueOnline(): Promise<{ synced: number; failed: number }> {
  const items = await getQueue();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });

      if (res.ok) {
        // If there are pending files, upload them now using the returned record ID
        if (item.pendingFiles && item.pendingFiles.length > 0) {
          const data = await res.json();
          const recordId = data.id;
          if (recordId) {
            await uploadPendingFiles(item.pendingFiles, recordId);
          }
        }
        await dequeue(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
