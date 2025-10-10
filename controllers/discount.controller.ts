import { conn } from "../db/dbconnect";
import { Request, Response } from "express";

type DiscountCode = {
  code_id: number;
  code_name: string;
  expire_date: string | null;
  current_use: number;
  max_use: number;
  // Add other fields if needed
};

export const validateDiscountCode = async (req: Request, res: Response) => {
  const { code_name } = req.body;
  const userId = (req as any).user.userId;

  if (!code_name) {
    return res.status(400).json({ message: 'กรุณากรอกโค้ดส่วนลด' });
  }

  try {
    const [rows] = await conn.query('SELECT * FROM DiscountCodes WHERE code_name = ?', [code_name]);
    const code = Array.isArray(rows) ? (rows[0] as DiscountCode | undefined) : undefined;

    // ตรวจสอบเงื่อนไขต่างๆ
    if (!code) return res.status(404).json({ message: 'ไม่พบโค้ดส่วนลดนี้' });
    if (code.expire_date && new Date(code.expire_date) < new Date()) return res.status(400).json({ message: 'โค้ดหมดอายุแล้ว' });
    if (code.current_use >= code.max_use) return res.status(400).json({ message: 'โค้ดถูกใช้เต็มจำนวนแล้ว' });

    // ตรวจสอบว่า User เคยใช้โค้ดนี้หรือยัง
    const [usageRows] = await conn.query('SELECT * FROM CodeUsage WHERE user_id = ? AND code_id = ?', [userId, code.code_id]);
    const usage = Array.isArray(usageRows) ? usageRows[0] : undefined;
    if (usage) return res.status(400).json({ message: 'คุณเคยใช้โค้ดนี้ไปแล้ว' });

    // ถ้าผ่านทุกเงื่อนไข ส่งข้อมูลโค้ดกลับไป
    res.status(200).json(code);

  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบโค้ด' });
  }
};