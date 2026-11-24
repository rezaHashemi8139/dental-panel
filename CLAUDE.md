# CLAUDE.md

Project rules for AI assistants and contributors working on dental-panel, the web admin panel
of the dental server (`../dental-server`).

## Project Consistency & English-Only Codebase

### Project architecture and coding style

- The entire project must follow a unified and consistent architecture.
- Maintain the same folder structure, naming conventions, coding patterns, and architectural principles
  as the sibling repositories `../dental-desktop` (frontend) and `../dental-server` (API).
- Follow the existing coding style throughout the project.
- Before implementing anything, inspect existing implementations and follow their conventions.
- Do not introduce alternative patterns or inconsistent approaches without explicit approval.
- Reuse existing components, utilities, services, hooks, and shared logic whenever possible
  (e.g. `src/components/ui`, `src/components/form-field.tsx`, `src/api`, `src/i18n`).

### Dependency installation approval

- Always ask for explicit approval before installing any new package, library, framework, or development tool.
- Never install, upgrade, replace, or remove dependencies without permission.
- When asking, explain why the dependency is necessary and why existing project resources are insufficient.
- Always prefer existing libraries and built-in project capabilities.

### English-only project content

**All written content inside the project must be in English**: source code comments, names, error and
validation messages, logs, documentation, tests and commit messages.

Do not introduce Persian or any other non-English language directly into source code, comments,
documentation, or project interfaces.

### Localization

- User-facing text lives only in `src/locales/*.json`, whose values are written in each file's own language.
  Code refers to it through English keys such as `t("auth.login.title")`.
- `src/locales/fa.json` is the reference: TypeScript checks every `t("...")` call against it.
- Whenever a new key is added, add it to **every** file in `src/locales/` (list the folder; do not assume
  which languages exist), with the same `{{placeholders}}`.
- Run `pnpm check-locales` and confirm it exits 0.
- The server never sends finished text: errors carry a stable reason code
  (`../dental-server/internal/service/common.go`). Map a new reason to a key in `src/api/errors.ts`.
- The panel's languages are its own; they are **not** synced with `../dental-server/internal/languages/files`
  (those are the desktop app's downloadable languages).

## API

- RPCs are defined in `../dental-server/proto/dental/v1/*.proto` (AdminService is the panel's).
- After any change there, run `pnpm generate` (regenerates `src/gen/`, never edit it by hand).
- Call the API only through the clients in `src/api/client.ts`; turn errors into text with `toMessage`
  from `src/api/errors.ts`.

**Final rule:** one unified architecture, one consistent coding style, English-only source and documentation,
approval before every new dependency, and complete multilingual support through the existing localization system.
