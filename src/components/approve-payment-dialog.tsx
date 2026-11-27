import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { InfoIcon, LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { toMessage } from "@/api/errors";
import { approvePaymentSchema, type ApprovePaymentValues } from "@/auth/schemas";
import type { PaymentReview } from "@/gen/dental/v1/admin_pb";
import { PurchaseMode } from "@/gen/dental/v1/subscription_pb";
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

interface ApprovePaymentDialogProps {
  onOpenChange: (open: boolean) => void;
  /** A pending payment. */
  review: PaymentReview;
}

/** Approves a payment, which adds the subscription it pays for. The page reloads once it is approved. */
export function ApprovePaymentDialog({ onOpenChange, review }: ApprovePaymentDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<Message | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApprovePaymentValues>({
    resolver: zodResolver(approvePaymentSchema),
    defaultValues: { note: "" },
  });
  const payment = review.payment;

  async function submit(values: ApprovePaymentValues) {
    if (!payment) return;
    setError(null);
    try {
      await adminClient.approvePayment({ id: payment.id, note: values.note });
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
            <DialogTitle>{t("payments.approve.title")}</DialogTitle>
            <DialogDescription>{t("payments.approve.description")}</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{translateMessage(error)}</AlertDescription>
            </Alert>
          )}

          <PaymentDetails review={review} />

          <Alert variant="info">
            <InfoIcon />
            <AlertDescription>
              {t(payment?.mode === PurchaseMode.UPGRADE_NOW ? "payments.approve.upgradeNow" : "payments.approve.extend")}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="approve-note" className="mb-1">
              {t("payments.approve.note")}
            </Label>
            <Textarea
              id="approve-note"
              rows={2}
              aria-invalid={!!errors.note}
              aria-describedby="approve-note-hint"
              {...register("note")}
            />
            <p
              id="approve-note-hint"
              className={errors.note ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
            >
              {fieldError(errors.note) ?? t("payments.approve.noteHint")}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircleIcon className="animate-spin" />}
              {isSubmitting ? t("payments.approve.working") : t("payments.approve.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
