# Dental admin panel

Web panel for the system administrators of the dental server (`../dental-server`):

- **Plans** (`/plans`): list, create and edit subscription plans (limits, duration, price in rials, on sale or not).
- **Subscriptions** (`/subscriptions`): find a clinic owner by national ID, or by FIDA code and
  nationality for foreign nationals; see their account, clinics, subscriptions and payments; sell a subscription
  from an active plan (it starts when the paid time already bought ends) or cancel one.
- **Payments** (`/payments`): payments clinic owners reported in the desktop app, pending ones first as
  a review queue; check each against the bank statement, then approve it (adds the subscription) or
  reject it with a reason the owner sees. Filter by status with `?status=approved|rejected|canceled|all`.
- **Payment accounts** (`/payment-accounts`): the bank accounts (card number and/or IBAN) owners transfer to;
  create, edit, order and deactivate them.

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

The dev server forwards API calls (`/dental.v1.*`) to the dental server at `SERVER_URL`, set in
[.env](.env). For another address on your machine, override it in `.env.local` (git-ignored):

```dotenv
SERVER_URL=http://192.168.1.10:8080
```

or for a single run:

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

Use HTTPS: the session's JWT is a `Secure` cookie (browsers only send it over HTTPS, or to
`localhost` in development) and its CSRF token travels in the `X-CSRF-Token` header.
Keep the forwarded paths unchanged: the cookie is only sent to `/dental.v1.AdminService/`.

## Layout

```
src/api/            API clients (session header, timeouts) and error → message mapping
src/auth/           admin session store (sessionStorage), login/logout, form rules
src/components/     app components; ui/ holds shadcn/ui components (shared with dental-desktop)
src/gen/            generated from the server's .proto files — do not edit
src/i18n/           languages, direction (RTL/LTR) and message helpers
src/lib/            helpers: formatting (useFormat), identities, countries, subscription periods
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
