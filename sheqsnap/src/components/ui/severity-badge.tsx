import { cn, SEVERITY_COLORS } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const colorClass = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || "bg-gray-100 text-gray-800";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        colorClass,
        className
      )}
    >
      {severity}
    </span>
  );
}
