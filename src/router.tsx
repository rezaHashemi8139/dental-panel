import { createRootRoute, createRoute, createRouter, Navigate, redirect } from "@tanstack/react-router";
import { getSession } from "@/auth/store";
import { identityFromSearch, parseIdentitySearch, type IdentitySearch } from "@/lib/identity";
import { RouteError } from "@/components/route-error";
import { RootLayout } from "@/pages/root-layout";
import { AppLayout } from "@/pages/app-layout";
import { HomePage } from "@/pages/home-page";
import { LoginPage } from "@/pages/login-page";
import { loadPlans, PlansPage } from "@/pages/plans-page";
import { loadSubscriptions, SubscriptionsPage } from "@/pages/subscriptions-page";

/**
 * Pages.
 *
 * /                → /home or /login
 * /login           only when logged out
 * /home            ┐ "app" layout (sidebar): only when logged in; pages read the
 * /plans           │ session with useSession() and their data with
 * /subscriptions   ┘ getRouteApi("<route id>").useLoaderData()
 *                    ?kind=national|foreign&number=…&nationality=… (the account searched for)
 * anything else    → /
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
  loaderDeps: ({ search }) => ({ kind: search.kind, number: search.number, nationality: search.nationality }),
  loader: ({ deps }) => loadSubscriptions(identityFromSearch(deps)),
  component: SubscriptionsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  appRoute.addChildren([homeRoute, plansRoute, subscriptionsRoute]),
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
