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
import LoginPage from "./components/login/LoginPage.jsx";
import StudentOS from "./components/student-os/MainAppPage.jsx";
import { getAuthenticatedUser } from "./fetchs/authFetchs";
import { scheduleQueryOptions } from "./fetchs/scheduleFetchs";
import { queryClient } from "./lib/queryClient";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: ({ context }) => {
    throw redirect({ to: context.user ? "/app" : "/login", replace: true });
  },
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

    await context.queryClient.prefetchQuery(scheduleQueryOptions());
  },
  component: AppRoute,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, signupRoute, appRoute]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

export default function App() {
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
    return <div>Checking authentication...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ user, setUser, queryClient }} />
    </QueryClientProvider>
  );
}

function LoginRoute() {
  const { setUser } = rootRoute.useRouteContext();
  return <LoginPage mode="login" onAuthenticated={setUser} />;
}

function SignupRoute() {
  const { setUser } = rootRoute.useRouteContext();
  return <LoginPage mode="signup" onAuthenticated={setUser} />;
}

function AppRoute() {
  const { setUser } = rootRoute.useRouteContext();
  return <StudentOS onLogout={() => setUser(null)} />;
}
