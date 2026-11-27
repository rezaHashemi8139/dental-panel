import { createRootRoute, createRoute, createRouter, Navigate, redirect } from "@tanstack/react-router";
import { getSession } from "@/auth/store";
import { RouteError } from "@/components/route-error";
import { RootLayout } from "@/pages/root-layout";
import { AppLayout } from "@/pages/app-layout";
import { HomePage } from "@/pages/home-page";
import { LoginPage } from "@/pages/login-page";
import { loadPlans, PlansPage } from "@/pages/plans-page";
import {
  loadSubscriptions,
  parseSubscriptionsSearch,
  SubscriptionsPage,
  type SubscriptionsSearch,
} from "@/pages/subscriptions-page";
import { loadPayments, parsePaymentsSearch, PaymentsPage, type PaymentsSearch } from "@/pages/payments-page";
import { loadPaymentAccounts, PaymentAccountsPage } from "@/pages/payment-accounts-page";
import { loadPatients, parsePatientsSearch, PatientsPage, type PatientsSearch } from "@/pages/patients-page";

/**
 * Pages.
 *
 * /                  → /home or /login
 * /login             only when logged out
 * /home              ┐ "app" layout (sidebar): only when logged in; pages read the
 * /plans             │ session with useSession() and their data with
 * /subscriptions     │ getRouteApi("<route id>").useLoaderData()
 *                    │   ?status=active|upcoming|ended|canceled (none: all) &q=… &page=… (the list), or
 *                    │   ?code=… (one owner's account, by identification code)
 * /payments          │   ?status=approved|rejected|canceled|all (none: pending, the queue to review) &q=… &page=…
 * /payment-accounts  │
 * /patients          ┘   ?q=… &page=…
 * anything else      → /
 *
 * Data is loaded by each route's loader, again on every visit; after a change, pages
 * reload it with router.invalidate(). A failed load shows RouteError instead of the page.
 */

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <Navigate to="/" replace />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: getSession() ? "/home" : "/login" });
  },
});

// --- Logged out -------------------------------------------------------------

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: "/home" });
  },
  component: LoginPage,
});

// --- Logged in --------------------------------------------------------------

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: () => {
    if (!getSession()) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "home",
  component: HomePage,
});

const plansRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "plans",
  loader: loadPlans,
  component: PlansPage,
});

const subscriptionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "subscriptions",
  validateSearch: (search: Record<string, unknown>): SubscriptionsSearch => parseSubscriptionsSearch(search),
  loaderDeps: ({ search }) => ({ code: search.code, status: search.status, q: search.q, page: search.page }),
  loader: ({ deps }) => loadSubscriptions(deps),
  component: SubscriptionsPage,
});

const paymentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "payments",
  validateSearch: (search: Record<string, unknown>): PaymentsSearch => parsePaymentsSearch(search),
  loaderDeps: ({ search }) => ({ status: search.status, q: search.q, page: search.page }),
  loader: ({ deps }) => loadPayments(deps),
  component: PaymentsPage,
});

const paymentAccountsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "payment-accounts",
  loader: loadPaymentAccounts,
  component: PaymentAccountsPage,
});

const patientsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "patients",
  validateSearch: (search: Record<string, unknown>): PatientsSearch => parsePatientsSearch(search),
  loaderDeps: ({ search }) => ({ q: search.q, page: search.page }),
  loader: ({ deps }) => loadPatients(deps),
  component: PatientsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  appRoute.addChildren([
    homeRoute,
    plansRoute,
    subscriptionsRoute,
    paymentsRoute,
    paymentAccountsRoute,
    patientsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultErrorComponent: RouteError,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
