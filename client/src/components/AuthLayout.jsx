import React from "react";

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">CP</span>
          Club Member Portal
          <span className="brand-sub">AWS Student Builder Groups</span>
        </div>
      </div>
      <div className="auth-wrap">
        <div className="auth-card">
          {eyebrow && <p className="auth-eyebrow">{eyebrow}</p>}
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
