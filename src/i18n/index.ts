import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * Multi-language setup.
 *
 * A language is one JSON file in `src/locales` that describes itself in its
 * `_meta` section (code, full name, abbreviation, text direction, version). All of
 * them are bundled into the panel; Persian (`fa.json`) is the reference file and
 * the fallback for any missing text. See `src/locales/README.md`.
 */

export type TextDirection = "ltr" | "rtl";

export interface Language {
  /** Language code, e.g. "fa". */
  code: string;
  /** Full name in the language itself, e.g. "English". */
  name: string;
  /** Short label, e.g. "FA". */
  abbr: string;
  dir: TextDirection;
}

interface LanguageMeta {
  code?: string;
  name?: string;
  abbr?: string;
  dir?: string;
}
type LanguageFile = { _meta?: LanguageMeta } & Record<string, unknown>;

/** Used on the first visit, before the user has picked a language. */
const DEFAULT_LANGUAGE = "fa";
/** Used for any text missing from the selected language's file. */
const FALLBACK_LANGUAGE = "fa";
const STORAGE_KEY = "language";
const NAMESPACE = "translation";

let languages: readonly Language[] = [];

export function getLanguages(): readonly Language[] {
  return languages;
}

export function getLanguage(code: string | undefined): Language {
  return (
    languages.find((language) => language.code === code) ??
    languages.find((language) => language.code === FALLBACK_LANGUAGE) ??
    languages[0]
  );
}

function toLanguage(file: LanguageFile, fallbackCode: string): Language {
  const meta = file._meta ?? {};
  const code = meta.code?.trim() || fallbackCode;
  return {
    code,
    name: meta.name?.trim() || code,
    abbr: meta.abbr?.trim() || code.toUpperCase(),
    dir: meta.dir === "rtl" ? "rtl" : "ltr",
  };
}

function readSavedLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function applyLanguage(code: string) {
  const language = getLanguage(code);
  document.documentElement.lang = language.code;
  document.documentElement.dir = language.dir;
  document.title = `${i18n.t("app.panel")} · ${i18n.t("app.title")}`;
  try {
    localStorage.setItem(STORAGE_KEY, language.code);
  } catch {
    // Storage unavailable: the choice just won't be remembered.
  }
}

/** Loads all languages and selects the saved one. Call once before rendering. */
export async function initI18n(): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources: {},
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: {
      // React already escapes rendered text.
      escapeValue: false,
    },
  });

  const files = import.meta.glob<LanguageFile>("../locales/*.json", { eager: true, import: "default" });
  const loaded: Language[] = [];
  for (const [path, file] of Object.entries(files)) {
    const language = toLanguage(file, path.slice(path.lastIndexOf("/") + 1, -".json".length));
    if (loaded.some((item) => item.code === language.code)) {
      console.warn(`[i18n] Language "${language.code}" is defined twice, extra file skipped.`);
      continue;
    }
    i18n.addResourceBundle(language.code, NAMESPACE, file, false, true);
    loaded.push(language);
  }
  languages = loaded.sort((a, b) => a.code.localeCompare(b.code));

  const saved = readSavedLanguage();
  const has = (code: string | null) => !!code && languages.some((language) => language.code === code);
  const initial = has(saved) ? saved! : has(DEFAULT_LANGUAGE) ? DEFAULT_LANGUAGE : (languages[0]?.code ?? FALLBACK_LANGUAGE);

  i18n.on("languageChanged", applyLanguage);
  await i18n.changeLanguage(initial);
}

export default i18n;
