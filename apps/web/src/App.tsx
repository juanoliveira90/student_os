import { useEffect, useState } from "react";
import {
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import LandingPage from "./components/landing/LandingPage";
import LoginPage from "./components/login/LoginPage";
import VerifyEmailPage from "./components/login/VerifyEmailPage";
import Studium from "./components/MainAppPage";
import { getAuthenticatedUser, isEmailVerificationRequiredError } from "./fetchs/authFetchs";
import { scheduleQueryOptions } from "./fetchs/scheduleFetchs";
import { studyPlanQueryOptions } from "./fetchs/studyPlanFetchs";
import { queryClient } from "./lib/queryClient";

type AuthenticatedUser = {
  id: string | number;
} & Record<string, unknown>;

type AppRouteContext = {
  user: AuthenticatedUser | null;
  setUser: (user: AuthenticatedUser | null) => void;
  needsEmailVerification: boolean;
  setNeedsEmailVerification: (value: boolean) => void;
  queryClient: QueryClient;
};

const rootRoute = createRootRouteWithContext<AppRouteContext>()({
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

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  component: VerifyEmailRoute,
});

const publicPaths = new Set(["/", "/login", "/signup", "/verify-email"]);

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  beforeLoad: async ({ context }) => {
    if (context.needsEmailVerification) {
      throw redirect({ to: "/verify-email", replace: true });
    }

    if (!context.user) {
      throw redirect({ to: "/login", replace: true });
    }

    try {
      await Promise.all([
        context.queryClient.prefetchQuery(scheduleQueryOptions(context.user.id)),
        context.queryClient.prefetchQuery(studyPlanQueryOptions(context.user.id)),
      ]);
    } catch (error) {
      if (isEmailVerificationRequiredError(error)) {
        throw redirect({ to: "/verify-email", replace: true });
      }

      throw error;
    }
  },
  component: AppRoute,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, signupRoute, verifyEmailRoute, appRoute]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAuthenticatedUser()
      .then((authenticatedUser) => {
        setNeedsEmailVerification(false);
        setUser(authenticatedUser as AuthenticatedUser);
      })
      .catch((error) => {
        if (isEmailVerificationRequiredError(error)) {
          setNeedsEmailVerification(true);
          if (!publicPaths.has(window.location.pathname)) {
            void router.navigate({ to: "/verify-email", replace: true });
          }
        }

        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div>{t("app.checkingAuth")}</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ user, setUser, needsEmailVerification, setNeedsEmailVerification, queryClient }} />
    </QueryClientProvider>
  );
}

function LoginRoute() {
  const { setUser, setNeedsEmailVerification, queryClient } = rootRoute.useRouteContext();
  return (
    <LoginPage
      mode="login"
      onAuthenticated={(authenticatedUser) => {
        queryClient.clear();
        setNeedsEmailVerification(false);
        setUser(authenticatedUser as AuthenticatedUser);
      }}
      onNeedsEmailVerification={() => {
        queryClient.clear();
        setNeedsEmailVerification(true);
        setUser(null);
      }}
    />
  );
}

function LandingRoute() {
  const { user } = rootRoute.useRouteContext();
  return <LandingPage isAuthenticated={Boolean(user)} />;
}

function SignupRoute() {
  const { setUser, setNeedsEmailVerification } = rootRoute.useRouteContext();
  return (
    <LoginPage
      mode="signup"
      onAuthenticated={(authenticatedUser) => setUser(authenticatedUser as AuthenticatedUser)}
      onNeedsEmailVerification={() => {
        setNeedsEmailVerification(true);
        setUser(null);
      }}
    />
  );
}

function VerifyEmailRoute() {
  const { setUser, setNeedsEmailVerification, queryClient } = rootRoute.useRouteContext();
  return (
    <VerifyEmailPage
      onVerified={(authenticatedUser) => {
        queryClient.clear();
        setNeedsEmailVerification(false);
        setUser(authenticatedUser as AuthenticatedUser);
      }}
    />
  );
}

function AppRoute() {
  const { user, setUser, queryClient } = rootRoute.useRouteContext();
  return (
    <Studium
      user={user}
      onLogout={() => {
        queryClient.clear();
        setUser(null);
      }}
    />
  );
}
