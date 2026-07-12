import "dotenv/config";
import express from "express";
import cors from "cors";
import { ok } from "./lib/http.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  ok(res, { ok: true, service: "assetflow-api" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
