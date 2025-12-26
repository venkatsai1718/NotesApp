import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Login.css";

import api from "../api";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { setAuthToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // useEffect(() => {
  //   const token = localStorage.getItem("token");
  //   if (token) {
  //     navigate("/home");
  //   }
  // }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill all fields");
      return;
    }

    try {
      // OAuth2 expects FormData
      const formData = new FormData();
      formData.append("username", email); 
      formData.append("password", password);

      const res = await api.post("/login", formData);

      const token = res.data.access_token;

      setAuthToken(token);

      setError("");
      navigate("/home");
    } catch (err) {
      console.error(err.response?.data || err.message);
      setError("Invalid email or password");
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Login</h2>

        {error && <p className="error">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>

        <p className="register-text">
          Don’t have an account?{" "}
          <span className="register-link" onClick={() => navigate("/register")}>
            Register
          </span>
        </p>
      </form>
    </div>
  );
}

export default Login;
