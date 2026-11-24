import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toMessage } from "@/api/errors";
import { loginSchema, type LoginValues } from "@/auth/schemas";
import { login } from "@/auth/session";
import { setSession, takeEndedMessage, useSession } from "@/auth/store";
import { translateMessage, type Message } from "@/i18n/message";
import { fieldError } from "@/lib/form";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageArea } from "@/pages/root-layout";

/** /login: only while logged out (src/router.tsx). */
export function LoginPage() {
  const { t } = useTranslation();
  const session = useSession();
  // Why the last session ended by itself (expired, refused by the server), if it did.
  const [error, setError] = useState<Message | null>(takeEndedMessage);
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  // Once logged in, on to the panel.
  if (session) return <Navigate to="/home" replace />;

  async function submit(values: LoginValues) {
    setError(null);
    try {
      setSession(await login(values.username, values.password));
    } catch (e) {
      setError(toMessage(e));
      resetField("password");
      setFocus("password");
    }
  }

  return (
    <PageArea>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.login.title")}</CardTitle>
          <CardDescription>{t("auth.login.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{translateMessage(error)}</AlertDescription>
              </Alert>
            )}

            <FormField
              id="login-username"
              label={t("auth.fields.username")}
              error={fieldError(errors.username)}
              autoComplete="username"
              autoFocus
              latin
              {...register("username")}
            />
            <FormField
              id="login-password"
              type="password"
              label={t("auth.fields.password")}
              error={fieldError(errors.password)}
              autoComplete="current-password"
              latin
              {...register("password")}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircleIcon className="animate-spin" />}
              {isSubmitting ? t("auth.login.working") : t("auth.login.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageArea>
  );
}
