import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { api } from "../api.js";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Password reset"
      title="Forgot password"
      subtitle="Enter your account email. We'll send a reset link and a 6-digit code."
    >
      {error && <div className="form-error">{error}</div>}
      {result && <div className="form-note">{result.message}</div>}

      {!result && (
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
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      {result?.dev && (
        <div className="dev-reset-box">
          Local demo mode — no real inbox delivery confirmed, so here's the reset info
          the email would contain:
          <br />
          <br />
          Code: <strong>{result.dev.code}</strong>
          <br />
          Link: <strong>{result.dev.resetUrl}</strong>
          {result.dev.previewUrl && (
            <>
              <br />
              Preview sent email:{" "}
              <a href={result.dev.previewUrl} target="_blank" rel="noreferrer">
                {result.dev.previewUrl}
              </a>
            </>
          )}
        </div>
      )}

      {result && (
        <p className="auth-footer">
          <Link to="/reset-password">Enter code / continue to reset</Link>
        </p>
      )}
      <p className="auth-footer">
        <Link to="/login">Back to login</Link>
      </p>
    </AuthLayout>
  );
}
