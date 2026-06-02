const CACHE_NAME = 'sheqsnap-v3';
const STATIC_ASSETS = ['/', '/dashboard', '/login', '/manifest.json'];
const QUEUE_DB = 'sheqsnap-offline';
const QUEUE_STORE = 'pending-submissions';

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Helper: open IndexedDB
function openQueue() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromQueue(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteFromQueue(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const req = tx.objectStore(QUEUE_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Background sync — process queued submissions
async function processQueue() {
  const db = await openQueue();
  const items = await getAllFromQueue(db);

  const results = await Promise.allSettled(
    items.map(async (item) => {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      if (res.ok) {
        await deleteFromQueue(db, item.id);
        // Notify clients of successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage({
          type: 'SYNC_SUCCESS',
          entityType: item.entityType,
          description: item.description,
        }));
      }
    })
  );
  return results;
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sheqsnap-queue') {
    event.waitUntil(processQueue());
  }
});

// Fetch handler — network-first for GET, pass-through for POST (handled by client)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-same-origin, non-GET requests
  if (event.request.method !== 'GET') return;
  if (!url.origin.includes(self.location.origin.replace(/https?:\/\//, ''))) return;

  // API calls: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline', offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Static assets and pages: network-first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
