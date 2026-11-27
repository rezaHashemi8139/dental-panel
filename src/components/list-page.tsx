import type { ReactNode } from "react";
import { cn } from "cn";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The layout every list page shares: the page's title and its filters in one card at
 * the top (ListFilters), and the table in its own card below (ListResults), apart.
 * Anything else the page shows (an alert, more cards) follows with the same gap.
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      {children && <CardContent className="flex flex-col gap-4">{children}</CardContent>}
    </Card>
  );
}

/** The table card of a list page; `footer` (the pagination) goes in a bar under it. */
export function ListResults({ footer, children }: { footer?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}

/** What an empty table says instead. */
export function ListEmpty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}
