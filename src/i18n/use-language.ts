import { useTranslation } from "react-i18next";
import { getLanguage, getLanguages } from "./index";

/** Current language, the languages to pick from, and a way to switch. */
export function useLanguage() {
  const { i18n } = useTranslation();

  return {
    language: getLanguage(i18n.resolvedLanguage),
    languages: getLanguages(),
    setLanguage: (code: string) => i18n.changeLanguage(code),
  };
}
