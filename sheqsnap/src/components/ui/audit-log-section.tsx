import { formatDateTime } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  changes: string;
  timestamp: string;
  changedBy: { name: string };
}

interface AuditLogSectionProps {
  auditLogs: AuditEntry[];
}

export function AuditLogSection({ auditLogs }: AuditLogSectionProps) {
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {auditLogs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No audit history</p>
      ) : (
        auditLogs.map((log) => {
          let changes: Record<string, any> = {};
          try {
            changes = JSON.parse(log.changes);
          } catch {}
          return (
            <div key={log.id} className="flex gap-3 text-sm border-l-2 border-blue-200 pl-3 py-1">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{log.changedBy.name}</span>
                  <span className="text-gray-400 text-xs">{log.action}</span>
                  <span className="text-gray-400 text-xs">{formatDateTime(log.timestamp)}</span>
                </div>
                {changes.updated && (
                  <p className="text-gray-500 text-xs mt-0.5">
                    Status: {changes.previous?.status} → {changes.updated?.status}
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
