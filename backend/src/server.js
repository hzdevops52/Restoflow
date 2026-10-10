import app from "./app.js";
import connectDatabase from "./config/database.js";
import environment from "./config/environment.js";

const startServer = async () => {
  await connectDatabase();

  app.listen(environment.port, "0.0.0.0", () => {
    console.log(
      `Restaurant Order System API running on port ${environment.port}`
    );
  });
};

startServer();
