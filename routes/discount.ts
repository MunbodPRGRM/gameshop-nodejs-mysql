import express from "express";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { createDiscountCode, deleteDiscountCode, getAllDiscountCodes, updateDiscountCode, validateDiscountCode } from "../controllers/discount.controller";

const router = express.Router();

// POST /validate -> ตรวจสอบโค้ดส่วนลด
router.post('/validate', authenticateJWT, validateDiscountCode);

// === Discount Code Management Routes ===
router.get("/", getAllDiscountCodes);
router.post("/", createDiscountCode);
router.put("/:id", updateDiscountCode);
router.delete("/:id", deleteDiscountCode);

export default router;