import type { ReactNode } from "react";

/** One labelled value in a <dl>. */
export function Detail({ label, ltr, children }: { label: string; ltr?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {/* Latin values keep their own order, aligned like the rest of the page. */}
      <dd className="text-sm font-medium">{ltr ? <span dir="ltr">{children}</span> : children}</dd>
    </div>
  );
}
