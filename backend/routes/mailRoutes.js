import express from "express";
import { sendMail } from "../controller/mailController.js";

const router = express.Router();

router.post("/", (req, res, next) => {
  console.log("📩 Route send-mail appelée !");
  next();
}, sendMail);
export default router;