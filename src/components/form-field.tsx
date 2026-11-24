import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { latinKeyDown, latinPaste } from "@/lib/latin-input";

interface FormFieldProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  /** Types Latin whatever the keyboard layout (see src/lib/latin-input.ts). Also left-to-right. */
  latin?: boolean;
}

/** A labelled input with an optional hint and error text. */
export function FormField({ id, label, hint, error, latin, onKeyDown, onPaste, ...inputProps }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const latinProps: ComponentProps<typeof Input> = latin
    ? {
        dir: "ltr",
        spellCheck: false,
        autoCapitalize: "off",
        autoCorrect: "off",
        onKeyDown: (e) => {
          onKeyDown?.(e);
          if (!e.defaultPrevented) latinKeyDown(e);
        },
        onPaste: (e) => {
          onPaste?.(e);
          if (!e.defaultPrevented) latinPaste(e);
        },
      }
    : { onKeyDown, onPaste };

  return (
    <div className="flex flex-col gap-1.5">
      {/* A little more room under the label than between the input and its hint. */}
      <Label htmlFor={id} className="mb-1">
        {label}
      </Label>
      <Input id={id} aria-invalid={!!error} aria-describedby={describedBy} {...inputProps} {...latinProps} />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
