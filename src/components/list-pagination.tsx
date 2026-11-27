import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/lib/format";
import { PAGE_SIZE, pageCount } from "@/lib/pagination";
import { Button } from "@/components/ui/button";

/**
 * Previous / next links under a paged list. The page lives in the address bar
 * (?page=…, none for the first), so back and forward walk through the pages.
 */
export function ListPagination({ page, total, shown }: { page: number; total: number; shown: number }) {
  const { t, i18n } = useTranslation();
  const format = useFormat();
  const pages = pageCount(total);
  const from = (page - 1) * PAGE_SIZE + 1;
  const rtl = i18n.dir() === "rtl";
  const toPage = (next: number) => (search: Record<string, unknown>) => ({
    ...search,
    page: next > 1 ? next : undefined,
  });

  return (
    <nav aria-label={t("common.pagination.label")} className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        {shown > 0
          ? t("common.pagination.summary", {
              from: format.number(from),
              to: format.number(from + shown - 1),
              total: format.number(total),
            })
          : t("common.pagination.total", { total: format.number(total) })}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <PageButton to={toPage(page - 1)} disabled={page <= 1}>
            {rtl ? <ChevronRightIcon data-icon="inline-start" /> : <ChevronLeftIcon data-icon="inline-start" />}
            {t("common.pagination.previous")}
          </PageButton>
          <span className="text-xs text-muted-foreground">
            {t("common.pagination.page", { page: format.number(page), pages: format.number(pages) })}
          </span>
          <PageButton to={toPage(page + 1)} disabled={page >= pages}>
            {t("common.pagination.next")}
            {rtl ? <ChevronLeftIcon data-icon="inline-end" /> : <ChevronRightIcon data-icon="inline-end" />}
          </PageButton>
        </div>
      )}
    </nav>
  );
}

function PageButton({
  to,
  disabled,
  children,
}: {
  to: (search: Record<string, unknown>) => Record<string, unknown>;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to="." search={to}>
        {children}
      </Link>
    </Button>
  );
}
