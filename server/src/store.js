// Data access layer - talks to MongoDB via Mongoose. Every route goes
// through these functions, so this is the one file you'd touch to swap
// storage again later (e.g. a different DB), same as it was with the old
// JSON-file version.

const User = require("./models/User");
const PasswordReset = require("./models/PasswordReset");
const ChatMessage = require("./models/ChatMessage");

// --- Users ---

function findUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase().trim() });
}

function findUserById(id) {
  return User.findById(id).catch(() => null); // bad ObjectId format -> treat as not found
}

function createUser({ name, email, passwordHash }) {
  return User.create({ name, email: email.toLowerCase().trim(), passwordHash });
}

function updateUserPassword(id, passwordHash) {
  return User.findByIdAndUpdate(id, { passwordHash }, { new: true });
}

// --- Password reset tokens ---

async function createReset({ userId, code, token, expiresAt }) {
  await PasswordReset.deleteMany({ userId }); // one active reset per user
  return PasswordReset.create({ userId, code, token, expiresAt: new Date(expiresAt) });
}

function findValidReset(userId, code) {
  return PasswordReset.findOne({ userId, code, expiresAt: { $gt: new Date() } });
}

function findResetByToken(token) {
  return PasswordReset.findOne({ token, expiresAt: { $gt: new Date() } });
}

function deleteReset(userId) {
  return PasswordReset.deleteMany({ userId });
}

// --- Chat history ---

function saveChatMessage({ userId, question, answer, sources, fellBack }) {
  return ChatMessage.create({ userId, question, answer, sources, fellBack });
}

function getChatHistory(userId, limit = 100) {
  return ChatMessage.find({ userId }).sort({ askedAt: 1 }).limit(limit);
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserPassword,
  createReset,
  findValidReset,
  findResetByToken,
  deleteReset,
  saveChatMessage,
  getChatHistory,
};
