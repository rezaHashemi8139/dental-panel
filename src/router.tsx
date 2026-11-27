import { createRootRoute, createRoute, createRouter, Navigate, redirect } from "@tanstack/react-router";
import { getSession } from "@/auth/store";
import { parseIdentitySearch, type IdentitySearch } from "@/lib/identity";
import { RouteError } from "@/components/route-error";
import { RootLayout } from "@/pages/root-layout";
import { AppLayout } from "@/pages/app-layout";
import { HomePage } from "@/pages/home-page";
import { LoginPage } from "@/pages/login-page";
import { loadPlans, PlansPage } from "@/pages/plans-page";
import { loadSubscriptions, SubscriptionsPage } from "@/pages/subscriptions-page";
import { loadPayments, parsePaymentsSearch, PaymentsPage, type PaymentsSearch } from "@/pages/payments-page";
import { loadPaymentAccounts, PaymentAccountsPage } from "@/pages/payment-accounts-page";

/**
 * Pages.
 *
 * /                  → /home or /login
 * /login             only when logged out
 * /home              ┐ "app" layout (sidebar): only when logged in; pages read the
 * /plans             │ session with useSession() and their data with
 * /subscriptions     │ getRouteApi("<route id>").useLoaderData()
 *                    │   ?code=… (the identification code of the account searched for)
 * /payments          │   ?status=approved|rejected|canceled|all (none: pending, the queue to review)
 * /payment-accounts  ┘
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
  validateSearch: (search: Record<string, unknown>): IdentitySearch => parseIdentitySearch(search),
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: ({ deps }) => loadSubscriptions(deps.code ?? null),
  component: SubscriptionsPage,
});

const paymentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "payments",
  validateSearch: (search: Record<string, unknown>): PaymentsSearch => parsePaymentsSearch(search),
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ deps }) => loadPayments(deps),
  component: PaymentsPage,
});

const paymentAccountsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "payment-accounts",
  loader: loadPaymentAccounts,
  component: PaymentAccountsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  appRoute.addChildren([homeRoute, plansRoute, subscriptionsRoute, paymentsRoute, paymentAccountsRoute]),
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
