const { Schema, model } = require("mongoose");

const passwordResetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  code: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

// MongoDB TTL index - Mongo itself deletes expired reset docs automatically,
// as a backstop in addition to the app deleting them after use.
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("PasswordReset", passwordResetSchema);
