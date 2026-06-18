import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";

export default function AdminProtected({ children }) {
  const { isLogged, user, authLoading } = useContext(AuthContext);

  // Wait for /auth/me to resolve before deciding
  if (authLoading) return null;

  if (!isLogged || !user) return <Navigate to="/login" replace />;

  // Adjust the field/value below to match what your backend returns
  // e.g. user.role === "admin"  OR  user.is_staff === true
  if (user.role !== "admin" && !user.is_staff) return <Navigate to="/" replace />;

  return children;
}
