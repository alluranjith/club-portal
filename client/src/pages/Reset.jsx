import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { api } from "../api.js";

export default function Reset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromLink = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = tokenFromLink ? { token: tokenFromLink, password } : { email, code, password };
      await api.resetPassword(payload);
      setDone(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Password reset"
      title="Set a new password"
      subtitle={
        tokenFromLink
          ? "You followed a reset link — just set a new password below."
          : "Enter the email and 6-digit code you received, then set a new password."
      }
    >
      {error && <div className="form-error">{error}</div>}
      {done && <div className="form-note">Password updated. Redirecting to login…</div>}

      {!done && (
        <form onSubmit={handleSubmit}>
          {!tokenFromLink && (
            <>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="code">6-digit code</label>
                <input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}

      <p className="auth-footer">
        <Link to="/login">Back to login</Link>
      </p>
    </AuthLayout>
  );
}
