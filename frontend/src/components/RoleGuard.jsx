import { Navigate } from "react-router-dom";

export default function RoleGuard({ children, roles }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  // pas connecté → login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // mauvais rôle → accueil
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}