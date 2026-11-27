import { Link, type LinkProps } from "@tanstack/react-router";
import { BanknoteIcon, HouseIcon, LandmarkIcon, PackageIcon, ReceiptTextIcon, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/**
 * Side navigation of the logged-in pages (src/router.tsx). Link marks the
 * current page with data-status="active".
 */
export function AppSidebar() {
  const { t } = useTranslation();
  return (
    <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-e bg-muted/40 p-3">
      <nav aria-label={t("nav.label")} className="flex flex-col gap-1">
        <SidebarLink to="/home" icon={HouseIcon} label={t("nav.home")} />
        <SidebarLink to="/plans" icon={PackageIcon} label={t("nav.plans")} />
        <SidebarLink to="/subscriptions" icon={ReceiptTextIcon} label={t("nav.subscriptions")} />
        <SidebarLink to="/payments" icon={BanknoteIcon} label={t("nav.payments")} />
        <SidebarLink to="/payment-accounts" icon={LandmarkIcon} label={t("nav.paymentAccounts")} />
      </nav>
    </aside>
  );
}

function SidebarLink({ to, icon: Icon, label }: { to: LinkProps["to"]; icon: LucideIcon; label: string }) {
  return (
    <Button
      asChild
      variant="ghost"
      className="w-full justify-start data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
    >
      <Link to={to}>
        <Icon data-icon="inline-start" />
        {label}
      </Link>
    </Button>
  );
}
