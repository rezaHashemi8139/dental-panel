import { useState } from "react";
import { KeyRoundIcon, LoaderCircleIcon, LogOutIcon, UserIcon, UserPenIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logout } from "@/auth/session";
import type { AdminSession } from "@/auth/store";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { ProfileDialog } from "@/components/profile-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The logged-in administrator: their own details and password, and logout. The
 * layouts react to the session ending (src/auth/store.ts), so nothing has to
 * navigate here.
 */
export function AccountMenu({ session }: { session: AdminSession }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"profile" | "password" | null>(null);

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  }

  const close = (open: boolean) => !open && setDialog(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label={t("account.label")}>
            {busy ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : <UserIcon data-icon="inline-start" />}
            <span className="max-w-40 truncate">{session.admin.fullName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate">{session.admin.fullName}</span>
            <span className="truncate text-xs font-normal text-muted-foreground" dir="ltr">
              {session.admin.username}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={busy} onSelect={() => setDialog("profile")}>
            <UserPenIcon />
            {t("account.profile.menu")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={busy} onSelect={() => setDialog("password")}>
            <KeyRoundIcon />
            {t("account.password.menu")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={busy} onSelect={onLogout}>
            <LogOutIcon />
            {t("account.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog === "profile" && <ProfileDialog session={session} onOpenChange={close} />}
      {dialog === "password" && <ChangePasswordDialog onOpenChange={close} />}
    </>
  );
}
