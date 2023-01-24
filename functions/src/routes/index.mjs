import generatePDF from "./generatePDF.mjs";

export function registerRoutes(app) {
  /** Unauthenticated Requests */
  app.use("/pdf", generatePDF);
}
