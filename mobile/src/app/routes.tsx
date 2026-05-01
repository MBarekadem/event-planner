import { createBrowserRouter } from "react-router";
import { Onboarding } from "./screens/Onboarding";
import { Login } from "./screens/Login";
import { SignUp } from "./screens/SignUp";
import { Home } from "./screens/Home";
import { Dashboard } from "./screens/Dashboard";
import { Vendors } from "./screens/Vendors";
import { Profile } from "./screens/Profile";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Onboarding,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: SignUp,
  },
  {
    path: "/home",
    Component: Home,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/vendors",
    Component: Vendors,
  },
  {
    path: "/profile",
    Component: Profile,
  },
]);
