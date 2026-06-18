import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function EmailVerified() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setAccessToken, setIsLogged } = useContext(AuthContext);

  useEffect(() => {
    const access = params.get("access");
    const refresh = params.get("refresh");

    if (!access || !refresh) {
      navigate("/verify-error");
      return;
    }

    // decode user
    const user = jwtDecode(access);
    setUser(user);

    // save tokens
    setAccessToken(access);
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);

    setIsLogged(true);

    // ⏳ Delay redirect for 3 seconds
    const timer = setTimeout(() => {
      navigate("/");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      textAlign: "center",
      marginTop: "100px",
      fontFamily: "Inter, sans-serif"
    }}>
      <h2 style={{ color: "#4CAF50", fontSize: "28px" }}>Email Verified! 🎉</h2>
      <p style={{ color: "#666", marginTop: "10px", fontSize: "18px" }}>
        Redirecting you to home in <b>3 seconds...</b>
      </p>
    </div>
  );
}
