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
  const userId = (req as any).user.userId; // ดึง userId จาก Token

  if (!code_name) {
    return res.status(400).json({ message: 'กรุณากรอกโค้ดส่วนลด' });
  }

  try {
    const [rows] = await conn.query('SELECT * FROM DiscountCodes WHERE code_name = ?', [code_name]);
    const code = (rows as any[])[0];

    // --- ตรวจสอบเงื่อนไขต่างๆ ---
    if (!code) {
      return res.status(404).json({ message: 'ไม่พบโค้ดส่วนลดนี้' });
    }

    // เช็คว่าโค้ดถูกใช้ครบจำนวนหรือยัง (ซ่อนจากระบบ)
    if (code.current_use >= code.max_use) {
      return res.status(400).json({ message: 'โค้ดนี้ถูกใช้เต็มจำนวนแล้ว' });
    }

    if (code.expire_date && new Date(code.expire_date) < new Date()) {
      return res.status(400).json({ message: 'โค้ดหมดอายุแล้ว' });
    }

    // ตรวจสอบว่า User คนนี้เคยใช้โค้ดนี้ไปแล้วหรือยัง
    const [usageRows] = await conn.query('SELECT * FROM CodeUsage WHERE user_id = ? AND code_id = ?', [userId, code.code_id]);
    const usage = (usageRows as any[])[0];
    if (usage) {
      return res.status(400).json({ message: 'คุณเคยใช้โค้ดส่วนลดนี้ไปแล้ว' });
    }

    // ถ้าผ่านทุกเงื่อนไข ส่งข้อมูลโค้ดกลับไป
    res.status(200).json(code);

  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบโค้ด' });
  }
};

// [Admin] ดึงโค้ดส่วนลดทั้งหมด
export const getAllDiscountCodes = async (req: Request, res: Response) => {
  try {
    const [codes] = await conn.query('SELECT * FROM DiscountCodes ORDER BY code_id DESC');
    res.status(200).json(codes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discount codes.' });
  }
};

// [Admin] สร้างโค้ดส่วนลดใหม่
export const createDiscountCode = async (req: Request, res: Response) => {
  const { code_name, discount_value, discount_type, max_use, expire_date } = req.body;

  if (!code_name || !discount_value || !max_use) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
  }

  try {
    const [result] = await conn.query(
      'INSERT INTO DiscountCodes (code_name, discount_value, discount_type, max_use, expire_date) VALUES (?, ?, ?, ?, ?)',
      [code_name, discount_value, discount_type || 'amount', max_use, expire_date || null]
    );
    res.status(201).json({ message: 'สร้างโค้ดส่วนลดสำเร็จ', insertId: (result as any).insertId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'มีชื่อโค้ดส่วนลดนี้อยู่แล้ว' });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างโค้ดส่วนลด' });
  }
};

// [Admin] อัปเดตโค้ดส่วนลด
export const updateDiscountCode = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { discount_value, max_use, expire_date } = req.body;

  try {
    await conn.query(
      'UPDATE DiscountCodes SET discount_value = ?, max_use = ?, expire_date = ? WHERE code_id = ?',
      [discount_value, max_use, expire_date || null, id]
    );
    res.status(200).json({ message: 'อัปเดตโค้ดส่วนลดสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดต' });
  }
};

// [Admin] ลบโค้ดส่วนลด
export const deleteDiscountCode = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await conn.query('DELETE FROM DiscountCodes WHERE code_id = ?', [id]);
    res.status(200).json({ message: 'ลบโค้ดส่วนลดสำเร็จ' });
  } catch (error: any) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ message: 'ไม่สามารถลบโค้ดนี้ได้ เนื่องจากมีการใช้งานแล้ว' });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบ' });
  }
};

export const getActiveDiscountCodes = async (req: Request, res: Response) => {
  try {
    // ดึงเฉพาะโค้ดที่:
    // 1. ยังใช้ไม่ครบจำนวน (current_use < max_use)
    // 2. ยังไม่หมดอายุ (expire_date เป็น NULL หรือยังไม่ถึงวันที่หมดอายุ)
    const [activeCodes] = await conn.query(
      `SELECT code_name, discount_value, discount_type 
       FROM DiscountCodes 
       WHERE 
         current_use < max_use AND
         (expire_date IS NULL OR expire_date >= CURDATE())`
    );
    res.status(200).json(activeCodes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active discount codes.' });
  }
};