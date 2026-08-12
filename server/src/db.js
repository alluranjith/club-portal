const mongoose = require("mongoose");

// Local dev by default. Swap MONGODB_URI in .env for a MongoDB Atlas
// connection string later - nothing else in the app needs to change.
const DEFAULT_URI = "mongodb://127.0.0.1:27017/club-portal";

async function connectDB() {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  const safeUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@"); // hide password in logs
  console.log(`[db] Connected to MongoDB: ${safeUri}`);
}

module.exports = { connectDB, mongoose };
