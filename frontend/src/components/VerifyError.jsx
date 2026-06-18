import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function VerifyError() {
  const navigate = useNavigate();

  // Auto redirect after 5 seconds (optional)
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      textAlign: "center",
      padding: "50px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ color: "#ff4d4f" }}>Verification Failed ❌</h1>
      <p style={{ fontSize: "18px" }}>
        Your verification link is invalid or expired.
      </p>

      <p style={{ marginTop: "20px" }}>
        You will be redirected to login page shortly...
      </p>

      <button
        onClick={() => navigate("/login")}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#ff4d4f",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        Go to Login
      </button>
    </div>
  );
}
