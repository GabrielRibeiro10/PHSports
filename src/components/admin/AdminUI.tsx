import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function AdminCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: "default" | "brand" | "warning";
}) {
  return (
    <AdminCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-black tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            tone === "brand" && "bg-primary/10 text-primary",
            tone === "warning" && "bg-amber-500/10 text-amber-600",
            tone === "default" && "bg-secondary text-foreground",
          )}
        >
          {icon}
        </span>
      </div>
    </AdminCard>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-14 text-center">
      {icon && (
        <span className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">
          {icon}
        </span>
      )}
      <p className="font-bold">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-1/3" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  pendente: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  pago: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  enviado: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  entregue: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
  aprovada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  reprovada: "bg-destructive/10 text-destructive border-destructive/20",
  ativo: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inativo: "bg-muted text-muted-foreground border-border",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize",
        STATUS_TONES[status] ?? "bg-secondary text-foreground border-border",
      )}
    >
      {status}
    </span>
  );
}
