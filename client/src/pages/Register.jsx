import { useState } from "react";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/users/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      setName("");
      setEmail("");
      setPassword("");

      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);
      setError("Unable to connect to the server.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>🚀 PingZone</h1>
      <h2>Register</h2>

      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          padding: "10px",
          width: "250px",
          borderRadius: "5px",
        }}
      />

      <br />
      <br />

      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
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
        onChange={(e) => setPassword(e.target.value)}
        style={{
          padding: "10px",
          width: "250px",
          borderRadius: "5px",
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
        onClick={handleRegister}
        style={{
          padding: "10px 25px",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Register
      </button>
    </div>
  );
}

export default Register;