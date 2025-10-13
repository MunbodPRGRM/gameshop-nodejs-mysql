import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { authenticateJWT } from "../middlewares/auth.middleware";
import {
  getProfile,
  updateProfileInfo,
  getUserById,
  getMyTransactions,
  topUpWallet,
  checkout,
  buyGame,
  getMyLibrary,
  getOwnedGameDetail,
  changePassword,
} from "../controllers/user.controller";

export const router = express.Router();

// === จัดการโฟลเดอร์อัปโหลด ===
const uploadsDir = path.join(process.cwd(), "../uploads");
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
router.put("/update", authenticateJWT, upload.single("profile_image"), updateProfileInfo);
router.post('/change-password', authenticateJWT, changePassword);
router.get('/transactions',authenticateJWT, getMyTransactions);
router.post('/topup',authenticateJWT, topUpWallet);
router.post('/checkout', authenticateJWT, checkout);
router.post('/buy', authenticateJWT, buyGame);
router.get('/library', authenticateJWT, getMyLibrary);

router.get("/:id", getUserById);
router.get('/library/game/:id', authenticateJWT, getOwnedGameDetail);

export default router;
