import express from 'express';
import { addGame, updateGame, deleteGame, getAllGames, getGameById, getBestSellers, getGameRanking } from '../controllers/game.controller';
import path from 'path';
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { authenticateJWT } from '../middlewares/auth.middleware';

export const router = express.Router();

// === กำหนดโฟลเดอร์ uploads ===
const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// === ตั้งค่า multer ===
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// === Admin Game Management Routes ===

// POST /api/admin/games -> เพิ่มเกมใหม่
router.post('/', upload.fields([
    { name: 'pic_icon', maxCount: 1 },
    { name: 'pic_portrait', maxCount: 1 },
    { name: 'pic_landscape', maxCount: 1 }
  ]), 
  addGame
);

// PUT /api/admin/games/:id -> แก้ไขเกมตาม ID
router.put('/:id', upload.fields([
    { name: 'pic_icon', maxCount: 1 },
    { name: 'pic_portrait', maxCount: 1 },
    { name: 'pic_landscape', maxCount: 1 }
  ]), 
  updateGame
);

router.get('/', getAllGames);
router.get('/ranking', getGameRanking);
router.get('/bestsellers', getBestSellers);

router.get('/:id', getGameById);
router.delete('/:id', deleteGame);

export default router;