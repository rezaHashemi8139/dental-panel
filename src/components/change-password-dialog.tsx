import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { hasReason, toMessage } from "@/api/errors";
import { changePasswordSchema, type ChangePasswordValues } from "@/auth/schemas";
import { translateMessage, type Message } from "@/i18n/message";
import { fieldError } from "@/lib/form";
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

/**
 * Changes the logged-in administrator's own password, proven with the current one
 * (AdminService.ChangePassword). This session goes on; the server ends the others.
 */
export function ChangePasswordDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const [error, setError] = useState<Message | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    resetField,
    setError: setFieldError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function submit(values: ChangePasswordValues) {
    setError(null);
    try {
      await adminClient.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      setDone(true);
    } catch (e) {
      if (hasReason(e, "invalid_credentials")) {
        resetField("currentPassword");
        setFieldError("currentPassword", { message: "account.password.wrongCurrent" }, { shouldFocus: true });
      } else if (hasReason(e, "password_unchanged")) {
        setFieldError("newPassword", { message: "errors.passwordUnchanged" });
        setFocus("newPassword");
      } else {
        setError(toMessage(e));
      }
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("account.password.title")}</DialogTitle>
              <DialogDescription>{t("account.password.done")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button autoFocus onClick={() => onOpenChange(false)}>
                {t("account.password.close")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
            <DialogHeader>
              <DialogTitle>{t("account.password.title")}</DialogTitle>
              <DialogDescription>{t("account.password.description")}</DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{translateMessage(error)}</AlertDescription>
              </Alert>
            )}

            <FormField
              id="password-current"
              type="password"
              label={t("account.password.current")}
              error={fieldError(errors.currentPassword)}
              autoComplete="current-password"
              autoFocus
              latin
              {...register("currentPassword")}
            />
            <FormField
              id="password-new"
              type="password"
              label={t("account.password.new")}
              hint={t("account.password.newHint")}
              error={fieldError(errors.newPassword)}
              autoComplete="new-password"
              maxLength={256}
              latin
              {...register("newPassword")}
            />
            <FormField
              id="password-confirm"
              type="password"
              label={t("account.password.confirm")}
              error={fieldError(errors.confirmPassword)}
              autoComplete="new-password"
              maxLength={256}
              latin
              {...register("confirmPassword")}
            />

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircleIcon className="animate-spin" />}
                {isSubmitting ? t("account.password.working") : t("account.password.save")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
