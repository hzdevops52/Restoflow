import dotenv from "dotenv";

dotenv.config();

const environment = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  mongoUri:
    process.env.MONGO_URI || "mongodb://localhost:27017/restaurant_orders",
};

export default environment;
