import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { toMessage } from "@/api/errors";
import { paymentAccountSchema, type PaymentAccountValues } from "@/auth/schemas";
import type { PaymentAccount } from "@/gen/dental/v1/subscription_pb";
import { translateMessage, type Message } from "@/i18n/message";
import { fieldError } from "@/lib/form";
import { normalizeCardNumber, normalizeIban } from "@/lib/payment";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PaymentAccountDialogProps {
  onOpenChange: (open: boolean) => void;
  /** The account to edit; null for a new one. */
  account: PaymentAccount | null;
  /** The position a new account starts with. */
  nextPosition: number;
}

function toValues(account: PaymentAccount): PaymentAccountValues {
  return {
    bankName: account.bankName,
    holderName: account.holderName,
    cardNumber: account.cardNumber,
    iban: account.iban,
    position: String(account.position),
    active: account.active,
  };
}

/** Creates a payment account, or edits one. The list reloads once it is saved. */
export function PaymentAccountDialog({ onOpenChange, account, nextPosition }: PaymentAccountDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<Message | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentAccountValues>({
    resolver: zodResolver(paymentAccountSchema),
    defaultValues: account
      ? toValues(account)
      : { bankName: "", holderName: "", cardNumber: "", iban: "", position: String(nextPosition), active: true },
  });

  async function submit(values: PaymentAccountValues) {
    setError(null);
    const fields = {
      bankName: values.bankName,
      holderName: values.holderName,
      cardNumber: normalizeCardNumber(values.cardNumber),
      iban: normalizeIban(values.iban),
      position: Number(values.position),
    };
    try {
      if (account) await adminClient.updatePaymentAccount({ id: account.id, ...fields, active: values.active });
      else await adminClient.createPaymentAccount(fields);
      await router.invalidate({ sync: true });
      onOpenChange(false);
    } catch (e) {
      setError(toMessage(e));
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
          <DialogHeader>
            <DialogTitle>
              {t(account ? "paymentAccounts.dialog.editTitle" : "paymentAccounts.dialog.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {t(account ? "paymentAccounts.dialog.editDescription" : "paymentAccounts.dialog.createDescription")}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{translateMessage(error)}</AlertDescription>
            </Alert>
          )}

          <FormField
            id="account-bank"
            label={t("paymentAccounts.fields.bankName")}
            error={fieldError(errors.bankName)}
            autoFocus
            {...register("bankName")}
          />
          <FormField
            id="account-holder"
            label={t("paymentAccounts.fields.holderName")}
            hint={t("paymentAccounts.fields.holderNameHint")}
            error={fieldError(errors.holderName)}
            {...register("holderName")}
          />
          <FormField
            id="account-card"
            label={t("paymentAccounts.fields.cardNumber")}
            hint={t("paymentAccounts.fields.cardNumberHint")}
            error={fieldError(errors.cardNumber)}
            inputMode="numeric"
            maxLength={19}
            latin
            {...register("cardNumber")}
          />
          <FormField
            id="account-iban"
            label={t("paymentAccounts.fields.iban")}
            hint={t("paymentAccounts.fields.ibanHint")}
            error={fieldError(errors.iban)}
            maxLength={34}
            latin
            {...register("iban")}
          />
          <FormField
            id="account-position"
            label={t("paymentAccounts.fields.position")}
            hint={t("paymentAccounts.fields.positionHint")}
            error={fieldError(errors.position)}
            inputMode="numeric"
            latin
            {...register("position")}
          />

          {account && (
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <div className="flex items-start gap-3">
                  <Switch
                    id="account-active"
                    className="mt-0.5"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-describedby="account-active-hint"
                  />
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="account-active">{t("paymentAccounts.fields.active")}</Label>
                    <p id="account-active-hint" className="text-xs text-muted-foreground">
                      {t("paymentAccounts.fields.activeHint")}
                    </p>
                  </div>
                </div>
              )}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircleIcon className="animate-spin" />}
              {isSubmitting
                ? t("paymentAccounts.dialog.working")
                : t(account ? "paymentAccounts.dialog.save" : "paymentAccounts.dialog.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
