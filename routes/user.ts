import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { authenticateJWT } from "../middlewares/auth.middleware";
import {
  getProfile,
  updateProfile,
  getUserById,
} from "../controllers/user.controller";

export const router = express.Router();

// === จัดการโฟลเดอร์อัปโหลด ===
const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// === ตั้งค่า multer สำหรับอัปโหลดรูปโปรไฟล์ ===
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) =>
    cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// === Routes ===

// ดึงข้อมูลโปรไฟล์ (ต้องส่ง JWT)
router.get("/profile", authenticateJWT, getProfile);

// อัปเดตข้อมูลโปรไฟล์ (ต้องส่ง JWT)
router.put("/update", authenticateJWT, upload.single("profile_image"), updateProfile);

// ดึงข้อมูลผู้ใช้ตาม ID
router.get("/:id", getUserById);

export default router;
