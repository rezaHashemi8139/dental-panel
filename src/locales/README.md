# Translations

Each `.json` file is one language, bundled into the panel. It describes itself in its `_meta` section:

```json
"_meta": { "code": "de", "name": "Deutsch", "abbr": "DE", "dir": "ltr", "version": 1 }
```

`fa.json` is the reference: TypeScript checks translation keys against it, and any text missing from
another file falls back to Persian.

## Adding text

1. Add the key and Persian text to `fa.json`.
2. Add the same key, translated, to every other file in this folder.
3. Run `pnpm check-locales`: it reports missing or extra keys and `{{placeholder}}` mismatches.

## Adding a language

Translate `en.json` (only the values; keep keys, nesting and `{{placeholders}}` as they are), update
`_meta` for the new language, and save it here as `<code>.json`, e.g. `ar.json` with `"dir": "rtl"`.
It appears in the language menu automatically.
