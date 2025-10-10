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
  getMyTransactions,
  topUpWallet,
  checkout,
  buyGame,
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

router.get("/profile", authenticateJWT, getProfile);
router.put("/update", authenticateJWT, upload.single("profile_image"), updateProfile);
router.get('/transactions',authenticateJWT, getMyTransactions);
router.post('/topup',authenticateJWT, topUpWallet);
router.post('/checkout', authenticateJWT, checkout);
router.post('/buy', authenticateJWT, buyGame);

router.get("/:id", getUserById);

export default router;
