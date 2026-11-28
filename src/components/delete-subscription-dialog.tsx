import { useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { toMessage } from "@/api/errors";
import type { Subscription } from "@/gen/dental/v1/subscription_pb";
import { translateMessage, type Message } from "@/i18n/message";
import { useFormat } from "@/lib/format";
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

interface DeleteSubscriptionDialogProps {
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
  /** Bought with a payment in the desktop app: the payment is deleted with it. */
  purchased: boolean;
  /** Called once it is deleted, before the dialog closes: reload, or leave a page about it. */
  onDeleted: () => Promise<unknown>;
}

/** Asks before deleting a subscription for good (AdminService.DeleteSubscription). */
export function DeleteSubscriptionDialog({ onOpenChange, subscription, purchased, onDeleted }: DeleteSubscriptionDialogProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Message | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await adminClient.deleteSubscription({ id: subscription.id });
      await onDeleted();
      onOpenChange(false);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const period = t("subscriptions.list.period", {
    start: format.date(subscription.startsAt),
    end: format.date(subscription.endsAt),
  });

  return (
    <Dialog open onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("subscriptions.delete.title")}</DialogTitle>
          <DialogDescription>
            {t("subscriptions.delete.description", { plan: subscription.planName, period })}
          </DialogDescription>
        </DialogHeader>

        {purchased && (
          <Alert>
            <AlertDescription>{t("subscriptions.delete.purchased")}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{translateMessage(error)}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={remove}>
            {busy && <LoaderCircleIcon className="animate-spin" />}
            {busy ? t("subscriptions.delete.working") : t("subscriptions.delete.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
