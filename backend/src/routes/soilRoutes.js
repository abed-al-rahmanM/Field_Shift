import { Router } from "express";
import multer from "multer";
import { extractSoil, validateReport } from "../services/soilExtractor.js";
import { serviceError } from "../services/gemini.js";
import { aiLimit } from "../middleware/aiLimit.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype))
      return callback(
        serviceError(
          "UPLOAD_UNSUPPORTED",
          "Choose a PDF, JPG or PNG soil report.",
          415,
        ),
      );
    callback(null, true);
  },
});
export function createSoilRouter(extractor = extractSoil) {
  const router = Router();
  router.post(
    "/soil/extract",
    aiLimit,
    upload.single("report"),
    async (req, res, next) => {
      try {
        validateReport(req.file);
        res.json(await extractor(req.file));
      } catch (error) {
        next(error);
      } finally {
        // Multer uses memory only: no temporary file is created or retained.
        if (req.file?.buffer) {
          req.file.buffer.fill(0);
          delete req.file.buffer;
        }
      }
    },
  );
  return router;
}
export const soilRouter = createSoilRouter();
