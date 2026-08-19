import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password.trim()) {
      setError(
        "Please enter your email and password."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/users/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Invalid email or password."
        );
        return;
      }

      // Save JWT
      localStorage.setItem(
        "pingzone_token",
        data.token
      );

      // Save logged-in user
      onLogin(data.user);

      setEmail("");
      setPassword("");

      navigate("/chat");
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setError(
        "Unable to connect to the server."
      );
    }
  };

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "100px",
      }}
    >
      <h1>🚀 PingZone</h1>
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        style={{
          padding: "10px",
          width: "250px",
          borderRadius: "5px",
        }}
      />

      <br />
      <br />

      <input
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        style={{
          padding: "10px",
          width: "250px",
          borderRadius: "5px",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleLogin(e);
          }
        }}
      />

      <br />
      <br />

      {error && (
        <p style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleLogin}
        style={{
          padding: "10px 25px",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Login
      </button>
    </div>
  );
}

export default Login;