import { Request, Response } from 'express';
import { conn } from '../db/dbconnect';
import path from 'path';
import fs from 'fs/promises';

// Interface สำหรับข้อมูลเกมที่รับเข้ามา
interface GameInput {
    game_name: string;
    detail?: string;
    price: number;
    release_date?: string;
    pic_icon?: string;
    pic_portrait?: string;
    pic_landscape?: string;
    vdo_link?: string;
    type_id: number;
}

// 1. เพิ่มเกมใหม่ (Create) - **เวอร์ชันอัปเดตสำหรับรับไฟล์**
export const addGame = async (req: Request, res: Response) => {
  // 1. ดึงข้อมูล Text จาก req.body
  const { 
    game_name, detail, price, release_date, type_id 
  } = req.body as GameInput;

  // 2. ตรวจสอบข้อมูลที่จำเป็น (เหมือนเดิม)
  if (!game_name || !price || !type_id) {
    return res.status(400).json({ message: 'game_name, price, and type_id are required.' });
  }

  // 3. ดึงข้อมูลไฟล์จาก req.files
  // req.files จะเป็น object ที่มี key เป็นชื่อ field ที่เรากำหนดใน route
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // 4. ดึงชื่อไฟล์ (Path) เพื่อนำไปเก็บใน Database
  // ถ้าไม่มีการอัปโหลดไฟล์ในฟิลด์นั้นๆ ค่าจะเป็น undefined
  const pic_icon = files?.['pic_icon']?.[0]?.filename;
  const pic_portrait = files?.['pic_portrait']?.[0]?.filename;
  const pic_landscape = files?.['pic_landscape']?.[0]?.filename;

  // vdo_link ยังคงมาจาก body เหมือนเดิม
  const { vdo_link } = req.body;

  try {
    // 5. Query ลง Database โดยใช้ชื่อไฟล์ที่ multer สร้างให้
    const [result] = await conn.query(
      'INSERT INTO Games (game_name, detail, price, release_date, pic_icon, pic_portrait, pic_landscape, vdo_link, type_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [game_name, detail, price, release_date || new Date(), pic_icon, pic_portrait, pic_landscape, vdo_link, type_id]
    );

    const insertId = (result as any).insertId;
    res.status(201).json({ message: 'Game added successfully with images', gameId: insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding game to database.' });
  }
};

// 2. แก้ไขข้อมูลเกม (Update) - **เวอร์ชันอัปเดตสำหรับเปลี่ยนไฟล์**
export const updateGame = async (req: Request, res: Response) => {
  const { id } = req.params;
  const textFields = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const uploadsDir = path.resolve(__dirname, '../../uploads');

  try {
    // 1. ดึงข้อมูลเกมเก่าจาก DB เพื่อเอาชื่อไฟล์เก่ามาลบ
    const [rows] = await conn.query(
      'SELECT pic_icon, pic_portrait, pic_landscape FROM Games WHERE game_id = ?',
      [id]
    );
    // Explicitly type as RowDataPacket or undefined
    const oldGameData = Array.isArray(rows) ? (rows[0] as import('mysql2').RowDataPacket) : undefined;

    if (!oldGameData) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    // 2. เตรียมข้อมูลที่จะอัปเดต (ทั้ง text และชื่อไฟล์ใหม่)
    const fieldsToUpdate: { [key: string]: any } = { ...textFields };
    
    const fileFields: { [key: string]: string | undefined } = {
      pic_icon: files?.['pic_icon']?.[0]?.filename,
      pic_portrait: files?.['pic_portrait']?.[0]?.filename,
      pic_landscape: files?.['pic_landscape']?.[0]?.filename,
    };

    // 3. ลูปเพื่อลบไฟล์เก่า (ถ้ามีไฟล์ใหม่มาแทน) และเพิ่มชื่อไฟล์ใหม่ลงใน object ที่จะอัปเดต
    for (const key in fileFields) {
      const newFilename = fileFields[key];
      if (newFilename) {
        // ถ้ามีไฟล์ใหม่อัปโหลดมา
        const oldFilename = oldGameData[key];
        if (oldFilename) {
          // และมีไฟล์เก่าอยู่ ให้ลบไฟล์เก่าทิ้ง
          try {
            await fs.unlink(path.join(uploadsDir, oldFilename));
            console.log(`Deleted old file: ${oldFilename}`);
          } catch (err) {
            console.warn(`Could not delete old file ${oldFilename}:`, err);
          }
        }
        // เพิ่มชื่อไฟล์ใหม่เข้าไปใน list ที่จะอัปเดต
        fieldsToUpdate[key] = newFilename;
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update.' });
    }

    // 4. สร้าง SQL Query และอัปเดตฐานข้อมูล
    const setClause = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
    const values = Object.values(fieldsToUpdate);

    const [result] = await conn.query(
      `UPDATE Games SET ${setClause} WHERE game_id = ?`,
      [...values, id]
    );

    if ((result as any).affectedRows === 0) {
        return res.status(404).json({ message: 'Game not found or no new data to update.' });
    }

    res.status(200).json({ message: `Game ID ${id} updated successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating game.' });
  }
};

// 3. ลบเกม (Delete)
export const deleteGame = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [result] = await conn.query('DELETE FROM Games WHERE game_id = ?', [id]);
    
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    res.status(200).json({ message: `Game ID ${id} deleted successfully.` });
  } catch (error: any) {
    console.error(error);
    // ตรวจจับ Foreign Key Constraint Error
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ 
            message: 'Cannot delete this game because it is referenced by existing purchases. Consider deactivating it instead.' 
        });
    }
    res.status(500).json({ message: 'Error deleting game.' });
  }
};

// 4. ดึงข้อมูลเกมทั้งหมด (Read All) - **เวอร์ชันอัปเดต เพิ่มการค้นหา**
export const getAllGames = async (req: Request, res: Response) => {
  try {
    // --- รับค่า Query Parameters ---
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;

    // **[ใหม่]** รับค่าสำหรับค้นหาชื่อเกมและประเภทเกม
    const search = req.query.search as string;
    const gameType = req.query.gameType as string;

    // --- สร้าง WHERE Clause แบบไดนามิก ---
    const whereClauses: string[] = [];
    const queryParams: (string | number)[] = [];

    if (search) {
      whereClauses.push("g.game_name LIKE ?");
      queryParams.push(`%${search}%`); // ใช้ % เพื่อค้นหาคำที่อยู่ตรงกลาง
    }

    if (gameType) {
      whereClauses.push("gt.type_name LIKE ?");
      queryParams.push(`%${gameType}%`);
    }

    // รวม WHERE clauses ทั้งหมดเข้าด้วยกัน
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // --- สร้าง SQL Query หลัก ---
    const mainQuery = `
      SELECT g.game_id, g.game_name, g.price, g.pic_icon, gt.type_name
      FROM Games g
      JOIN GameType gt ON g.type_id = gt.type_id
      ${whereSql}
      ORDER BY g.release_date DESC
      LIMIT ?
      OFFSET ?
    `;

    // --- สร้าง Query สำหรับนับจำนวนทั้งหมด ---
    const countQuery = `
      SELECT COUNT(*) as totalGames
      FROM Games g
      JOIN GameType gt ON g.type_id = gt.type_id
      ${whereSql}
    `;

    // --- Execute Queries ---
    const [games] = await conn.query(mainQuery, [...queryParams, limit, offset]);
    const [countRows] = await conn.query(countQuery, queryParams);
    const totalGames = Array.isArray(countRows) && countRows.length > 0 ? (countRows[0] as any).totalGames : 0;

    // --- ส่ง Response กลับไป ---
    res.status(200).json({
      totalGames,
      totalPages: Math.ceil(totalGames / limit),
      currentPage: page,
      games,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching games.' });
  }
};

// 5. ดึงข้อมูลเกมเดียว (Read One)
export const getGameById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await conn.query(
      `SELECT g.*, gt.type_name
       FROM Games g
       JOIN GameType gt ON g.type_id = gt.type_id
       WHERE g.game_id = ?`,
      [id]
    );
    const game = Array.isArray(rows) ? rows[0] : undefined;

    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    res.status(200).json(game);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching game details.' });
  }
};

// **[ใหม่]** ดึงข้อมูลประเภทเกมทั้งหมด (Get All Game Types)
export const getAllGameTypes = async (req: Request, res: Response) => {
  try {
    const [gameTypes] = await conn.query(
      'SELECT * FROM GameType ORDER BY type_name ASC'
    );

    res.status(200).json(gameTypes);
  } catch (error) {
    console.error('Error fetching game types:', error);
    res.status(500).json({ message: 'Error fetching game types.' });
  }
};

// **[ใหม่]** ดึงข้อมูลเกมขายดี (Best Sellers)
export const getBestSellers = async (req: Request, res: Response) => {
  try {
    const [bestSellers] = await conn.query(
      `SELECT game_id, game_name, pic_icon, pic_portrait
       FROM Games
       ORDER BY sales_count DESC
       LIMIT 5`
    );
    res.status(200).json(bestSellers);
  } catch (error) {
    console.error('Error fetching best sellers:', error);
    res.status(500).json({ message: 'Error fetching best sellers.' });
  }
};