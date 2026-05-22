import { useEffect, useState } from "react";
import LoginPage from "./components/login/LoginPage.jsx";
import StudentOS from "./components/student-os/StudentOS.jsx";

function getPath() {
  return window.location.pathname;
}

export default function App() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onPopState = () => setPath(getPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (path === "/login") {
    return <LoginPage mode="login" />;
  }

  if (path === "/signup") {
    return <LoginPage mode="signup" />;
  }

  return <StudentOS />;
}
