import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { api, setSession } from "../api.js";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.signup(name, email, password);
      setSession(token, user);
      navigate("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Join the chapter"
      title="Create your account"
      subtitle="Sign up to ask the club bot about workshops, AWS setup, and the hackathon."
    >
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </div>
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
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="auth-footer">
        Already a member? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
