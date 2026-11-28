import type { ReactNode } from "react";
import { cn } from "cn";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The layout every list page shares: the page's title and its filters in one card at
 * the top (ListFilters), and the table in its own card below (ListResults), apart.
 * Anything else the page shows (an alert, more cards) follows with the same gap.
 *
 * PageArea makes it at least as tall as the window: ListFilters keeps its own height
 * and ListResults takes the rest, down to a minimum below which the page scrolls.
 * Taller content (several cards) scrolls the page.
 */
export function ListPage({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex w-full flex-col gap-6", className)}>{children}</div>;
}

interface ListFiltersProps {
  title: ReactNode;
  description?: ReactNode;
  /** A button beside the title, such as "New". */
  action?: ReactNode;
  /** The filters (search box, status links); none for a page that lists everything. */
  children?: ReactNode;
}

/** The top card of a list page: its title, then the filters of the table below. */
export function ListFilters({ title, description, action, children }: ListFiltersProps) {
  return (
    <Card className="shrink-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      {children && <CardContent className="flex flex-col gap-4">{children}</CardContent>}
    </Card>
  );
}

/**
 * The table card of a list page; `footer` (the pagination) goes in a bar under it.
 *
 * It fills the height left in the window, growing from a zero basis so the table's
 * own height never pushes the page, but never below `min-h-80`: in a shorter window
 * the page scrolls instead. A long table scrolls inside its own container (the
 * Table's, which already scrolls across), so its header row, kept at the top of that
 * container, and the footer, at the bottom of the card, stay in view.
 */
export function ListResults({ footer, children }: { footer?: ReactNode; children: ReactNode }) {
  return (
    <Card className="min-h-80 grow basis-0">
      <CardContent
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card",
          // A sticky row loses its collapsed border, so the header draws its own line.
          "[&_th]:shadow-[inset_0_-1px_0_var(--color-border)]",
        )}
      >
        {children}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}

/** What an empty table says instead. */
export function ListEmpty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}
