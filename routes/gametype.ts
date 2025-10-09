import express from 'express';
import { getAllGameTypes } from '../controllers/game.controller';

export const router = express.Router();

// === Public GameType Routes ===

// GET /api/gametypes -> ดึงประเภทเกมทั้งหมด
router.get('/', getAllGameTypes);

export default router;