import { Router } from "express";
import { generatePDF } from "../controllers/generatePDF.mjs";

const router = Router();

router.post("/generate", generatePDF);

export default router;
