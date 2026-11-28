import { useState } from "react";
import { AlertTriangleIcon, LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { toMessage } from "@/api/errors";
import type { User } from "@/gen/dental/v1/auth_pb";
import { translateMessage, type Message } from "@/i18n/message";
import { useFormat } from "@/lib/format";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteUserDialogProps {
  onOpenChange: (open: boolean) => void;
  user: User;
  /** Clinics the account owns: deleted with it. */
  ownedClinicCount: number;
  /** Called once it is deleted, before the dialog closes: reload, or leave a page about it. */
  onDeleted: () => Promise<unknown>;
}

/**
 * Asks before deleting an account for good, with everything it owns
 * (AdminService.DeleteUser). Nothing can bring it back, so the username has to be
 * typed to confirm.
 */
export function DeleteUserDialog({ onOpenChange, user, ownedClinicCount, onDeleted }: DeleteUserDialogProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Message | null>(null);
  const confirmed = confirmation.trim().toLowerCase() === user.username.toLowerCase();

  async function remove() {
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await adminClient.deleteUser({ id: user.id });
      await onDeleted();
      onOpenChange(false);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void remove();
          }}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>{t("users.delete.title")}</DialogTitle>
            <DialogDescription>
              {t("users.delete.description", { name: user.fullName || user.username })}
            </DialogDescription>
          </DialogHeader>

          {ownedClinicCount > 0 && (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertDescription>
                {t("users.delete.clinicsWarning", {
                  clinics: t("common.clinics", { count: ownedClinicCount, clinics: format.number(ownedClinicCount) }),
                })}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{translateMessage(error)}</AlertDescription>
            </Alert>
          )}

          <FormField
            id="delete-user-confirmation"
            label={t("users.delete.confirmLabel", { username: user.username })}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            autoFocus
            latin
          />

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || !confirmed}>
              {busy && <LoaderCircleIcon className="animate-spin" />}
              {busy ? t("users.delete.working") : t("users.delete.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
