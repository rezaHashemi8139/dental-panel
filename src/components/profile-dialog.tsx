import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { adminClient } from "@/api/client";
import { hasReason, toMessage } from "@/api/errors";
import { profileSchema, type ProfileValues } from "@/auth/schemas";
import { setSession, type AdminSession } from "@/auth/store";
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

interface ProfileDialogProps {
  onOpenChange: (open: boolean) => void;
  session: AdminSession;
}

/** Changes the logged-in administrator's own full name and username (AdminService.UpdateProfile). */
export function ProfileDialog({ onOpenChange, session }: ProfileDialogProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<Message | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: session.admin.fullName, username: session.admin.username },
  });

  async function submit(values: ProfileValues) {
    setError(null);
    try {
      const { admin } = await adminClient.updateProfile({ fullName: values.fullName, username: values.username });
      // The session shows who is logged in; it is the same session, with the new details.
      setSession({
        ...session,
        admin: { ...session.admin, fullName: admin?.fullName ?? values.fullName, username: admin?.username ?? values.username },
      });
      onOpenChange(false);
    } catch (e) {
      if (hasReason(e, "username_taken")) setFieldError("username", { message: "errors.usernameTaken" });
      else setError(toMessage(e));
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
          <DialogHeader>
            <DialogTitle>{t("account.profile.title")}</DialogTitle>
            <DialogDescription>{t("account.profile.description")}</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{translateMessage(error)}</AlertDescription>
            </Alert>
          )}

          <FormField
            id="profile-full-name"
            label={t("account.profile.fullName")}
            error={fieldError(errors.fullName)}
            autoComplete="name"
            autoFocus
            {...register("fullName")}
          />
          <FormField
            id="profile-username"
            label={t("auth.fields.username")}
            hint={t("account.profile.usernameHint")}
            error={fieldError(errors.username)}
            autoComplete="username"
            maxLength={32}
            latin
            {...register("username")}
          />

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircleIcon className="animate-spin" />}
              {isSubmitting ? t("account.profile.working") : t("account.profile.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
