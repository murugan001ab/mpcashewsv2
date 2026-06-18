import { useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import api from "../services/api";
import { jwtDecode } from "jwt-decode";
import { getLocalCart, clearLocalCart } from "../utils/localcart";
const GOOGLE_CLIENT_ID =
  "591324332552-iv7h7gtb20utd9g2bipi2oe8repv25ui.apps.googleusercontent.com";

export default function GoogleLoginButton() {
  const buttonRef = useRef(null);
  const { setIsLogged, setAccessToken, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
    });

  }, []);

  async function handleGoogleResponse(response) {
    const idToken = response.credential;

    try {
      const res = await api.post("auth/google/", { id_token: idToken });
      const data = res.data;

      if (data.tokens?.access) {
        const decoded = jwtDecode(data.tokens.access);
        setUser(decoded);
      }

      setAccessToken(data.tokens.access);
      localStorage.setItem("accessToken", data.tokens.access);
      localStorage.setItem("refreshToken", data.tokens.refresh);
      localStorage.setItem("user", JSON.stringify(jwtDecode(data.tokens.access)));

      setIsLogged(true);

      navigate("/");
    } catch (err) {
      console.error("Google login failed:", err);
      alert("Google Login Failed");
    }
  }

  return (
    <div>
      <div ref={buttonRef}></div>
    </div>
  );
}
