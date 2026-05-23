import { useEffect, useState } from "react";
import LoginPage from "./components/login/LoginPage.jsx";
import StudentOS from "./components/student-os/MainAppPage.jsx";

function getPath() {
  return window.location.pathname;
}

export default function App() {
  const [path, setPath] = useState(getPath);
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const onPopState = () => setPath(getPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    fetch('/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized")
        return res.json()
      })
      .then((data) => {
        setUser(data.user)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return <div>Checking authentication...</div>; 
  }

  if (!user && path === "/app") {
    /*if (path !== "/login") {
      window.history.replaceState({}, "", "/login")
    }*/
    window.history.replaceState({}, "", "/login")
    return <LoginPage mode="login" />
  }

  if (path === "/login") {
    return <LoginPage mode="login" />;
  }

  if (path === "/signup") {
    return <LoginPage mode="signup" />;
  }

  if (path === "/app") {
    return <StudentOS />;
  }
}
