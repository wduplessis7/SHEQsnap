'use client';
import { useEffect, useState, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getQueueCount, processQueueOnline } from '@/lib/offline-queue';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setPendingCount(count);
    } catch { /* ignore — IndexedDB not available */ }
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [isOnline]);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage('');
    try {
      const { synced, failed } = await processQueueOnline();
      await refreshCount();
      if (synced > 0) {
        setSyncMessage(`✓ ${synced} record${synced > 1 ? 's' : ''} uploaded`);
        setTimeout(() => setSyncMessage(''), 4000);
      }
      if (failed > 0) {
        setSyncMessage(`${failed} failed to sync — will retry`);
      }
    } finally {
      setSyncing(false);
    }
  }

  if (!isOnline) {
    return (
      <div className="bg-red-600 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4 flex-shrink-0" />
        <span>
          You are offline — forms will be saved and uploaded when connection is restored
          {pendingCount > 0 && ` · ${pendingCount} pending`}
        </span>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" />
        <span>Uploading {pendingCount} saved record{pendingCount > 1 ? 's' : ''}...</span>
      </div>
    );
  }

  if (syncMessage) {
    return (
      <div className="bg-green-600 text-white text-sm px-4 py-2 flex items-center justify-center gap-2">
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        <span>{syncMessage}</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-2 cursor-pointer" onClick={handleSync}>
        <RefreshCw className="h-4 w-4 flex-shrink-0" />
        <span>{pendingCount} record{pendingCount > 1 ? 's' : ''} waiting to sync · Click to upload now</span>
      </div>
    );
  }

  return null;
}
