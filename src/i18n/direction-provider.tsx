import type { ReactNode } from "react";
import { Direction } from "radix-ui";
import { useLanguage } from "./use-language";

/** Tells Radix/shadcn components whether the current language is RTL or LTR. */
export function DirectionProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  return <Direction.Provider dir={language.dir}>{children}</Direction.Provider>;
}
