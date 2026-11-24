import { createRootRoute, createRoute, createRouter, Navigate, redirect } from "@tanstack/react-router";
import { getSession } from "@/auth/store";
import { RootLayout } from "@/pages/root-layout";
import { AppLayout } from "@/pages/app-layout";
import { HomePage } from "@/pages/home-page";
import { LoginPage } from "@/pages/login-page";

/**
 * Pages.
 *
 * /            → /home or /login
 * /login       only when logged out
 * /home        ┐ "app" layout (sidebar): only when logged in; pages read the session with useSession()
 *              ┘ add new management pages here, next to it
 * anything else → /
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

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, appRoute.addChildren([homeRoute])]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
