import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// Resolve relative to this module, so root-level and workspace commands load the same file.
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
