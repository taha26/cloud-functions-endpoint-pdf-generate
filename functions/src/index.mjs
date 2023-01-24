//import libraries
import * as functions from "firebase-functions";
import express from "express";
import { registerRoutes } from "./routes/index.mjs";
import HttpStatusCodes from "./declarations/HttpStatusCodes.mjs";

// //initialize firebase inorder to access its services
const app = express();

app.use((err, _, res, next) => {
  let status = HttpStatusCodes.BAD_REQUEST;
  if (err) {
    status = err.status;
  }
  return res.status(status).json({ error: err.message });
});

registerRoutes(app);
const api = functions.https.onRequest(app);
export { api };
