import { useEffect, useState } from "react";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LandingPage from "./components/landing/LandingPage.jsx";
import LoginPage from "./components/login/LoginPage.jsx";
import StudentOS from "./components/student-os/MainAppPage.jsx";
import { getAuthenticatedUser } from "./fetchs/authFetchs";
import { scheduleQueryOptions } from "./fetchs/scheduleFetchs";
import { studyPlanQueryOptions } from "./fetchs/studyPlanFetchs";
import { queryClient } from "./lib/queryClient";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingRoute,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginRoute,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignupRoute,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/login", replace: true });
    }

    await Promise.all([
      context.queryClient.prefetchQuery(scheduleQueryOptions(context.user.id)),
      context.queryClient.prefetchQuery(studyPlanQueryOptions(context.user.id)),
    ]);
  },
  component: AppRoute,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, signupRoute, appRoute]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAuthenticatedUser()
      .then(setUser)
      .catch(() => {
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div>{t("app.checkingAuth")}</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ user, setUser, queryClient }} />
    </QueryClientProvider>
  );
}

function LoginRoute() {
  const { setUser, queryClient } = rootRoute.useRouteContext();
  return (
    <LoginPage
      mode="login"
      onAuthenticated={(authenticatedUser) => {
        queryClient.clear();
        setUser(authenticatedUser);
      }}
    />
  );
}

function LandingRoute() {
  const { user } = rootRoute.useRouteContext();
  return <LandingPage isAuthenticated={Boolean(user)} />;
}

function SignupRoute() {
  const { setUser } = rootRoute.useRouteContext();
  return <LoginPage mode="signup" onAuthenticated={setUser} />;
}

function AppRoute() {
  const { user, setUser, queryClient } = rootRoute.useRouteContext();
  return (
    <StudentOS
      user={user}
      onLogout={() => {
        queryClient.clear();
        setUser(null);
      }}
    />
  );
}
