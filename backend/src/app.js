import "./env.js";
import express from "express";
import cors from "cors";
import { readJson } from "./utils/data.js";
import { analysisRouter } from "./routes/analysisRoutes.js";
import { nasaRouter } from "./routes/nasaRoutes.js";
import { soilRouter } from "./routes/soilRoutes.js";
import { errorHandler } from "./middleware/errors.js";

export const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(",") ?? [
      "http://localhost:5173",
    ],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    service: "FIELD SHIFT API",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  }),
);
app.get("/api/crops", async (_req, res, next) => {
  try {
    res.json(await readJson("crops.json"));
  } catch (error) {
    next(error);
  }
});
app.use("/api", analysisRouter, nasaRouter, soilRouter);
app.use(errorHandler);

// Vercel imports the app; src/server.js retains the local port listener.
export default app;
