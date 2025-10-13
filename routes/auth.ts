import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { register, login } from "../controllers/auth.controller";

export const router = express.Router();

// === กำหนดโฟลเดอร์ uploads ===
const uploadsDir = path.resolve(process.cwd(), "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// === ตั้งค่า multer ===
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// === Routes ===
router.post("/register", upload.single("profile_image"), register);
router.post("/login", login);

export default router;