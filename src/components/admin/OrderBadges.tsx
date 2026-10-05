import { cn } from "@/lib/utils";
import { TONE } from "@/lib/adminOrders";

export function Badge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold",
        TONE[status] ?? "border-border bg-secondary text-foreground",
      )}
    >
      {label ?? status}
    </span>
  );
}
