import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { api, setSession } from "../api.js";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
      setSession(token, user);
      navigate("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout eyebrow="Welcome back" title="Log in" subtitle="Log in to chat with the club bot.">
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="auth-footer">
        <Link to="/forgot-password">Forgot password?</Link>
      </p>
      <p className="auth-footer">
        New to the club? <Link to="/signup">Sign up</Link>
      </p>
    </AuthLayout>
  );
}
