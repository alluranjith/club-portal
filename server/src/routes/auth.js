const express = require("express");
const store = require("../store");
const { hashPassword, verifyPassword, issueToken, generateResetCredentials } = require("../security");
const { sendPasswordResetEmail } = require("../mailer");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Please enter your name." });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  if (await store.findUserByEmail(email)) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const passwordHash = await hashPassword(password);
  const user = await store.createUser({ name: name.trim(), email, passwordHash });

  const token = issueToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Enter your email and password." });
  }

  const user = await store.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const token = issueToken(user);
  res.json({ token, user: publicUser(user) });
});

// Always responds the same way whether or not the email exists, so the API
// doesn't leak which emails have accounts.
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  const generic = {
    message: "If that email has an account, a reset link and code were sent to it.",
  };

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const user = await store.findUserByEmail(email);
  if (!user) {
    // Don't reveal account existence, but still respond successfully.
    return res.json(generic);
  }

  const { code, token, expiresAt } = generateResetCredentials();
  await store.createReset({ userId: user.id, code, token, expiresAt });

  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const resetUrl = `${clientOrigin}/reset-password?token=${token}`;

  const mailResult = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    code,
    resetUrl,
  });

  // In local/dev demo mode (no real SMTP configured) we also return the
  // code + link in the API response so the reset flow can be demoed
  // without needing a real inbox. Remove `dev` before any real deployment.
  const dev = !mailResult.delivered || process.env.NODE_ENV !== "production"
    ? { code, resetUrl, previewUrl: mailResult.previewUrl || null }
    : undefined;

  res.json({ ...generic, dev });
});

router.post("/reset-password", async (req, res) => {
  const { token, code, email, password } = req.body || {};

  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  let reset = null;
  let user = null;

  if (token) {
    reset = await store.findResetByToken(token);
    if (reset) user = await store.findUserById(reset.userId);
  } else if (email && code) {
    user = await store.findUserByEmail(email);
    if (user) reset = await store.findValidReset(user.id, code);
  }

  if (!reset || !user) {
    return res.status(400).json({ error: "That reset link or code is invalid or has expired." });
  }

  const passwordHash = await hashPassword(password);
  await store.updateUserPassword(user.id, passwordHash);
  await store.deleteReset(user.id);

  res.json({ message: "Password updated. You can log in with your new password now." });
});

module.exports = router;
