const { Schema, model } = require("mongoose");

const sourceSchema = new Schema(
  {
    file: String,
    section: String,
  },
  { _id: false }
);

const chatMessageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    sources: { type: [sourceSchema], default: [] },
    fellBack: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "askedAt", updatedAt: false } }
);

// Fast lookup of "this user's history, oldest first"
chatMessageSchema.index({ userId: 1, askedAt: 1 });

module.exports = model("ChatMessage", chatMessageSchema);
