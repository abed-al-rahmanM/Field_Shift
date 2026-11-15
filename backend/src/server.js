import "./env.js";
import { app } from "./app.js";

const port = Number(process.env.PORT) || 5000;
app.listen(port, () =>
  console.log(`FIELD SHIFT API running at http://localhost:${port}`),
);
