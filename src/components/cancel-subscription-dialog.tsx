import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
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

interface CancelSubscriptionDialogProps {
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
}

/** Asks before canceling a subscription. The page reloads once it is canceled. */
export function CancelSubscriptionDialog({ onOpenChange, subscription }: CancelSubscriptionDialogProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Message | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await adminClient.cancelSubscription({ id: subscription.id });
      await router.invalidate({ sync: true });
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
          <DialogTitle>{t("subscriptions.cancel.title")}</DialogTitle>
          <DialogDescription>
            {t("subscriptions.cancel.description", { plan: subscription.planName, period })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{translateMessage(error)}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={cancel}>
            {busy && <LoaderCircleIcon className="animate-spin" />}
            {busy ? t("subscriptions.cancel.working") : t("subscriptions.cancel.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
