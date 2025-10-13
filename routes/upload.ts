// src/routes/upload.ts
import express from "express";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { uploadFile, getFile } from "../controllers/upload.controller";

export const router = express.Router();

// สร้างโฟลเดอร์ uploads หากยังไม่มี
const uploadsDir = path.join(process.cwd(), "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ตั้งค่า multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 64 * 1024 * 1024 }, // 64MB
});

// Routes
router.post("/", upload.single("file"), uploadFile);
router.get("/:filename", getFile);

export default router;
