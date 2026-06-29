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
import LoginPage from "./components/LoginPage";
import VerifyEmailPage from "./components/VerifyEmailPage";
import Studium from "./components/MainAppPage";
import { applyThemeVariables, getResolvedTheme, getStoredAppearance, getSystemTheme, themes } from "./components/data.js";
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

const publicPaths = new Set(["/login", "/signup", "/verify-email"]);

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
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

const routeTree = rootRoute.addChildren([loginRoute, signupRoute, verifyEmailRoute, appRoute]);

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
    return <AuthLoadingPage label={t("app.checkingAuth")} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ user, setUser, needsEmailVerification, setNeedsEmailVerification, queryClient }} />
    </QueryClientProvider>
  );
}

function AuthLoadingPage({ label }: { label: string }) {
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const appearance = getStoredAppearance();
  const theme = getResolvedTheme(appearance, systemTheme);
  const t = themes[theme];

  useEffect(() => {
    applyThemeVariables(t);
  }, [t]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      aria-busy="true"
      aria-label={label}
      role="status"
      className="flex min-h-screen items-center justify-center bg-[var(--sos-bg)] font-sos-ui text-[var(--sos-text)] transition-colors duration-200"
    >
      <div
        className="sos-auth-loader border-[var(--sos-border-alt)] border-t-[var(--sos-accent)]"
      />
      <span className="sr-only">{label}</span>
    </div>
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
