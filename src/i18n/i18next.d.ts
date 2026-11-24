import "i18next";
import type fa from "../locales/fa.json";

// Persian is the reference file: translation keys are type-checked and
// autocompleted against it, so a typo in t("...") is a compile error.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof fa;
    };
  }
}
