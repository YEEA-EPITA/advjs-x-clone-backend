const mongoose = require("mongoose");

const connectMongoDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/twitter_clone"
    );
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error; // Let the caller handle the error
  }
};

module.exports = connectMongoDB;
