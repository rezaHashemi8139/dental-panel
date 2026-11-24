import { useTranslation } from "react-i18next";
import { useSession } from "@/auth/store";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  // AppLayout only renders this while logged in.
  if (!session) return null;

  const expires = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(session.expiresAt);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{t("home.welcome", { name: session.admin.fullName })}</CardTitle>
        <CardDescription>{t("home.description")}</CardDescription>
      </CardHeader>
      <CardFooter className="text-xs text-muted-foreground">{t("home.sessionExpires", { time: expires })}</CardFooter>
    </Card>
  );
}
