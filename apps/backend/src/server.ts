import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { initAuthStore } from "./auth-store.js";
import { config } from "./config.js";
import { createApiRouter } from "./routes.js";
import { initQuestionBankStore } from "./store.js";
import { initStudyStore } from "./study-store.js";

await initAuthStore();
await initStudyStore();
await initQuestionBankStore();

const app = express();

app.use(cors({ origin: config.frontendOrigin === "*" ? true : config.frontendOrigin, credentials: true }));
app.use(express.json({ limit: "256kb" }));
app.use("/api", createApiRouter());

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Invalid request", details: error.flatten() });
  }
  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`ace-backend listening on ${config.port}`);
});
