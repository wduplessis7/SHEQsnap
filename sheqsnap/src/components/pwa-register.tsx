'use client';
import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);

      // Listen for sync success messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_SUCCESS') {
          // Trigger a storage event so OfflineBanner refreshes its count
          window.dispatchEvent(new Event('sheqsnap-sync'));
        }
      });
    }
  }, []);
  return null;
}
