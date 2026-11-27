import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * A search box over a paged list. The text goes to the address bar (?q=…) and the
 * list starts again at its first page; other search parameters stay. Mount it with
 * key={query} so it follows back and forward.
 */
export function ListSearch({ query, label, placeholder }: { query: string; label: string; placeholder: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [text, setText] = useState(query);

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = text.trim() || undefined;
    void navigate({
      to: ".",
      search: (search: Record<string, unknown>) => ({ ...search, q, page: undefined, code: undefined }),
    });
  }

  return (
    <form role="search" className="flex gap-2 sm:max-w-md" onSubmit={submit}>
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        maxLength={100}
        onChange={(event) => setText(event.target.value)}
      />
      <Button type="submit" variant="secondary">
        <SearchIcon data-icon="inline-start" />
        {t("common.search")}
      </Button>
    </form>
  );
}
