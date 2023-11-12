import dotenv from "dotenv";
import express, { Application } from "express";
import morgan from "morgan";
import globalErrorHandlerMiddleware from "./middlewares/global-error-handler.middleware";
import testRouter from "./routes/test.route";
import healthCheckRouter from "./routes/health-check.route";

dotenv.config();
const env = process.env.NODE_ENV || "local";
const app: Application = express();
app.use(express.json());
app.use(morgan(
  env === "local" ? "dev" : "common"
));

// Public routes
app.use(healthCheckRouter);

// Secure routes
app.use(testRouter);

// Error handler, should always be LAST use()
app.use(globalErrorHandlerMiddleware);

app.listen(5001, () => {
  console.log(`Server is listening on http://localhost:5001`);
});

process.on("SIGINT", () => {
  process.exit();
});
