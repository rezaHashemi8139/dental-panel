# Dental admin panel

Web panel for the system administrators of the dental server (`../dental-server`):
subscription plans, users and subscriptions. For now: administrator login and logout.

- **React** 19, **TypeScript**, **Vite**
- **Tailwind CSS** 4 + **shadcn/ui** (radix-nova, RTL), same look and components as `../dental-desktop`
- **TanStack Router**, **react-hook-form** + **zod**, **i18next** (Persian, English, German)
- **Connect-ES** (`@connectrpc/connect-web`): calls the server's `AdminService` with types generated
  from the server's `.proto` files

## Run

Needs Node.js and pnpm, and the dental server running (default `http://localhost:8080`).

```powershell
pnpm install
pnpm dev                 # http://localhost:5173
```

The dev server forwards API calls (`/dental.v1.*`) to the dental server. Another address:

```powershell
$env:SERVER_URL = "http://192.168.1.10:8080"; pnpm dev
```

Administrators are not regular user accounts. Create the first one on the server:

```powershell
cd ..\dental-server; go run . create-admin -username admin -full-name "Site Admin"
```

(It asks for the password; see `../dental-server/createadmin.go`.)

## Scripts

```powershell
pnpm dev                 # development server with hot reload
pnpm build               # type-check, then production build into dist/
pnpm preview             # serve dist/ locally (API calls forwarded like pnpm dev)
pnpm typecheck           # type-check only
pnpm generate            # regenerate src/gen/ from ../dental-server/proto (after any .proto change)
pnpm check-locales       # every language file has every key of fa.json, same placeholders
```

## Production

`pnpm build` produces static files in `dist/`. The panel calls the API on **its own origin**
(the server sends no CORS headers), so serve it behind a web server that:

- forwards every path starting with `/dental.v1.` to the dental server, and
- serves `dist/` for everything else, falling back to `dist/index.html` (the panel uses real URLs such as `/home`).

Use HTTPS: the session token travels in the `Authorization` header.

## Layout

```
src/api/            API clients (session header, timeouts) and error → message mapping
src/auth/           admin session store (sessionStorage), login/logout, form rules
src/components/     app components; ui/ holds shadcn/ui components (shared with dental-desktop)
src/gen/            generated from the server's .proto files — do not edit
src/i18n/           languages, direction (RTL/LTR) and message helpers
src/locales/        one JSON file per language; fa.json is the reference
src/pages/          layouts and pages
src/theme/          light/dark/system theme
src/router.tsx      routes and login guards
```

## Sessions

The session token is kept in `sessionStorage`: it survives a page reload but not closing the tab, and
is not shared between tabs. The session ends when it expires (`SESSION_TTL` on the server, 12h by
default), when the administrator logs out, or when the server refuses it (revoked, administrator
disabled); the login screen then says why.
