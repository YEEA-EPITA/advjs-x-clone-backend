require("dotenv").config();
const { connectPostgreSQL } = require("./src/config/postgresql");

console.log("🔍 Testing PostgreSQL connection...");
console.log("📋 Using credentials:");
console.log("   Host:", process.env.POSTGRES_HOST);
console.log("   Port:", process.env.POSTGRES_PORT);
console.log("   Database:", process.env.POSTGRES_DATABASE);
console.log("   User:", process.env.POSTGRES_USER);

connectPostgreSQL()
  .then(() => {
    console.log("✅ SUCCESS: PostgreSQL connection working!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ FAILED: PostgreSQL connection failed");
    console.error("Error:", err.message);
    process.exit(1);
  });
