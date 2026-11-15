import { Router } from "express";
import { getClimate } from "../services/nasaPower.js";

export const nasaRouter = Router();
nasaRouter.get("/climate", async (req, res, next) => {
  try {
    res.json(
      await getClimate({
        latitude: Number(req.query.lat),
        longitude: Number(req.query.lon),
        start: String(req.query.start ?? ""),
        end: String(req.query.end ?? ""),
      }),
    );
  } catch (error) {
    next(error);
  }
});
