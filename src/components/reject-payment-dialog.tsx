import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { toMessage } from "@/api/errors";
import { rejectPaymentSchema, type RejectPaymentValues } from "@/auth/schemas";
import type { PaymentReview } from "@/gen/dental/v1/admin_pb";
import { translateMessage, type Message } from "@/i18n/message";
import { fieldError } from "@/lib/form";
import { PaymentDetails } from "@/components/payment-details";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RejectPaymentDialogProps {
  onOpenChange: (open: boolean) => void;
  /** A pending payment. */
  review: PaymentReview;
}

/** Rejects a payment with a reason the owner sees. The page reloads once it is rejected. */
export function RejectPaymentDialog({ onOpenChange, review }: RejectPaymentDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<Message | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RejectPaymentValues>({
    resolver: zodResolver(rejectPaymentSchema),
    defaultValues: { reason: "" },
  });
  const reasonError = fieldError(errors.reason);

  async function submit(values: RejectPaymentValues) {
    if (!review.payment) return;
    setError(null);
    try {
      await adminClient.rejectPayment({ id: review.payment.id, reason: values.reason });
      await router.invalidate({ sync: true });
      onOpenChange(false);
    } catch (e) {
      setError(toMessage(e));
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
          <DialogHeader>
            <DialogTitle>{t("payments.reject.title")}</DialogTitle>
            <DialogDescription>{t("payments.reject.description")}</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{translateMessage(error)}</AlertDescription>
            </Alert>
          )}

          <PaymentDetails review={review} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-reason" className="mb-1">
              {t("payments.reject.reason")}
            </Label>
            <Textarea
              id="reject-reason"
              rows={3}
              autoFocus
              aria-invalid={!!reasonError}
              aria-describedby="reject-reason-hint"
              {...register("reason")}
            />
            <p id="reject-reason-hint" className={reasonError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {reasonError ?? t("payments.reject.reasonHint")}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircleIcon className="animate-spin" />}
              {isSubmitting ? t("payments.reject.working") : t("payments.reject.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
