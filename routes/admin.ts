import express from "express";
import { authenticateJWT, isAdmin } from "../middlewares/auth.middleware";
import { getAllUsers, getUserHistory } from "../controllers/user.controller";

const router = express.Router();

// ทุก Route ในไฟล์นี้จะถูกป้องกันโดย authenticateJWT และ isAdmin
router.use(authenticateJWT, isAdmin);

// GET /api/admin/users -> ดึงผู้ใช้ทั้งหมด (พร้อมค้นหา)
router.get("/users", getAllUsers);
router.get("/users/history/:id", getUserHistory);

// (คุณสามารถเพิ่ม Route อื่นๆ สำหรับ Admin ได้ที่นี่ เช่น delete user)

export default router;