import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AdminProtected({ children }) {
  const { isLogged, user, authLoading } = useContext(AuthContext);

  // Show a spinner while verifying admin session
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={40} className="animate-spin text-brand-orange" />
      </div>
    );
  }

  if (!isLogged || !user) return <Navigate to="/login" replace />;

  // Adjust the field/value below to match what your backend returns
  if (user.role !== "admin" && !user.is_staff) return <Navigate to="/" replace />;

  return children;
}