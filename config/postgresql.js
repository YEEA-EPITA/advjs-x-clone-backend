const { Sequelize } = require("sequelize");

// PostgreSQL connection configuration
const sequelize = new Sequelize(
  process.env.POSTGRES_DATABASE || "twitter_clone_pg",
  process.env.POSTGRES_USER || "postgres",
  process.env.POSTGRES_PASSWORD || "password",
  {
    host: process.env.POSTGRES_HOST || "localhost",
    port: process.env.POSTGRES_PORT || 5432,
    dialect: "postgres",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

const connectPostgreSQL = async () => {
  try {
    // Wait a moment for PostgreSQL to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL");

    // Sync models (create tables if they don't exist)
    if (process.env.NODE_ENV === "development") {
      // Use force: false to avoid constraint conflicts
      await sequelize.sync({ force: false });
      console.log("✅ PostgreSQL models synchronized");
    }

    return sequelize;
  } catch (error) {
    console.error("❌ PostgreSQL connection error:", error.message);
    console.error("❌ Full error details:", error.name);

    if (error.message.includes("password authentication failed")) {
      console.error(
        "💡 Hint: Make sure PostgreSQL is running with correct credentials"
      );
      console.error("💡 Try: docker-compose up -d postgresql");
    } else if (error.name === "SequelizeDatabaseError") {
      console.error("💡 Database/Constraint Error - Check model definitions");
      console.error("💡 Consider: docker-compose down && docker-compose up -d");
    }
    throw error;
  }
};
module.exports = {
  sequelize,
  connectPostgreSQL,
};
