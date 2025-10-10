import { Request, Response } from "express";
import { conn } from "../db/dbconnect";
import bcrypt from "bcrypt";

// ================== ดึงข้อมูลโปรไฟล์ (Profile) ==================
export const getProfile = async (req: any, res: Response) => {
  const userId = req.user.userId;
  try {
    const [rows]: any = await conn.query(
      "SELECT user_id, username, email, profile_image, role, wallet_balance FROM Users WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ================== อัปเดตข้อมูลผู้ใช้ (Profile Update) ==================
export const updateProfile = async (req: any, res: Response) => {
  const userId = req.user.userId;
  const { username, old_password, new_password, confirm_password } = req.body;
  const profile_image = req.file ? req.file.filename : undefined;

  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (username) {
      fields.push("username = ?");
      values.push(username);
    }

    if (profile_image) {
      fields.push("profile_image = ?");
      values.push(profile_image);
    }

    // ถ้ามีการเปลี่ยนรหัสผ่าน
    if (old_password || new_password || confirm_password) {
      if (!old_password || !new_password || !confirm_password)
        return res
          .status(400)
          .json({ error: "All password fields are required" });

      const [rows]: any = await conn.query(
        "SELECT password FROM Users WHERE user_id = ?",
        [userId]
      );
      const user = rows[0];

      const isMatch = await bcrypt.compare(old_password, user.password);
      if (!isMatch)
        return res.status(401).json({ error: "Old password is incorrect" });

      if (new_password !== confirm_password)
        return res
          .status(400)
          .json({ error: "New password and confirm password do not match" });

      const hashed = await bcrypt.hash(new_password, 10);
      fields.push("password = ?");
      values.push(hashed);
    }

    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    values.push(userId);
    await conn.query(`UPDATE Users SET ${fields.join(", ")} WHERE user_id = ?`, values);

    res.json({ message: "User updated successfully", profile_image, username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  const { search } = req.query; // รับค่า search จาก query parameter
  
  let query = 'SELECT user_id, username, email, role FROM Users';
  const params = [];

  if (search) {
    query += ' WHERE username LIKE ? OR email LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  try {
    const [users] = await conn.query(query, params);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users.' });
  }
};

export const getUserHistory = async (req: Request, res: Response) => {
  const { id } = req.params; // รับ ID ของผู้ใช้จาก URL

  try {
    // 1. ดึงข้อมูลโปรไฟล์
    const [userRows]: any = await conn.query(
      'SELECT user_id, username, email, profile_image, role FROM Users WHERE user_id = ?',
      [id]
    );
    const user = userRows[0];

    if (!user) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    // 2. ดึงข้อมูลธุรกรรมทั้งหมดของผู้ใช้คนนั้น
    const [transactions] = await conn.query(
      'SELECT * FROM Transactions WHERE user_id = ? ORDER BY transaction_date DESC',
      [id]
    );

    // 3. รวมข้อมูลแล้วส่งกลับไป
    res.status(200).json({ ...user, transactions });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching user history.' });
  }
};

// ================== ดึงข้อมูลผู้ใช้ตาม ID ==================
export const getUserById = async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const [rows]: any = await conn.query(
      "SELECT user_id, username, email, profile_image, role, wallet_balance FROM Users WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ดึงประวัติธุรกรรม
export const getMyTransactions = async (req: any, res: Response) => {
  const userId = req.user.userId;
  try {
    const [transactions] = await conn.query(
      'SELECT transaction_id, type, amount, detail, transaction_date FROM Transactions WHERE user_id = ? ORDER BY transaction_date DESC',
      [userId]
    );
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions.' });
  }
};

// เติมเงินเข้า Wallet
export const topUpWallet = async (req: any, res: Response) => {
  const userId = req.user.userId;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid top-up amount.' });
  }

  const connection = await conn.getConnection(); // ใช้ Connection เพื่อทำ Transaction
  try {
    await connection.beginTransaction();

    // 1. เพิ่มเงินในตาราง Users
    await connection.query(
      'UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?',
      [amount, userId]
    );
    
    // 2. บันทึก Transaction
    await connection.query(
      'INSERT INTO Transactions (user_id, type, amount, detail) VALUES (?, ?, ?, ?)',
      [userId, 'เติมเงิน', amount, `เติมเงินจำนวน ${amount} บาท`]
    );

    await connection.commit(); // ยืนยัน Transaction

    // ดึงยอดเงินล่าสุดส่งกลับไป
    const [rows]: any = await connection.query('SELECT wallet_balance FROM Users WHERE user_id = ?', [userId]);
    const wallet_balance = rows[0]?.wallet_balance;

    res.status(200).json({ message: 'Top-up successful.', new_balance: wallet_balance });

  } catch (error) {
    await connection.rollback(); // ยกเลิก Transaction ถ้าเกิดข้อผิดพลาด
    res.status(500).json({ message: 'Transaction failed.' });
  } finally {
    connection.release(); // คืน Connection กลับสู่ Pool
  }
};

export const buyGame = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { gameId } = req.body; // รับ gameId มาแค่ตัวเดียว

  if (!gameId) {
    return res.status(400).json({ message: 'Game ID is required.' });
  }

  const connection = await conn.getConnection();
  try {
    await connection.beginTransaction();

    // --- ตรวจสอบข้อมูลและความพร้อม ---
    const [userRows]: any = await connection.query('SELECT wallet_balance FROM Users WHERE user_id = ? FOR UPDATE', [userId]);
    const user = userRows[0];
    const [gameRows]: any = await connection.query('SELECT game_name, price FROM Games WHERE game_id = ?', [gameId]);
    const game = gameRows[0];

    if (!game) {
      throw new Error('ไม่พบเกมที่ต้องการซื้อ');
    }
    if (user.wallet_balance < game.price) {
      throw new Error('ยอดเงินใน Wallet ไม่เพียงพอ');
    }

    // [แนะนำ] ตรวจสอบว่าผู้ใช้มีเกมนี้อยู่แล้วหรือไม่
    const [ownedGames]: any = await connection.query('SELECT * FROM UserLibrary WHERE user_id = ? AND game_id = ?', [userId, gameId]);
    if (ownedGames.length > 0) {
      throw new Error('คุณมีเกมนี้อยู่ในคลังแล้ว');
    }

    // --- ทำการอัปเดตฐานข้อมูล ---
    // 1. ตัดเงินจาก Wallet
    await connection.query('UPDATE Users SET wallet_balance = wallet_balance - ? WHERE user_id = ?', [game.price, userId]);

    // 2. สร้างใบสั่งซื้อ (สำหรับ 1 รายการ)
    // **[แก้]** เพิ่ม sub_total เข้าไปในคำสั่ง INSERT
    const [purchaseResult] = await connection.query(
      'INSERT INTO Purchases (user_id, sub_total, total_amount) VALUES (?, ?, ?)',
      [userId, game.price, game.price] // สำหรับการซื้อเกมเดียว sub_total จะเท่ากับ total_amount
    );
    const purchaseId = (purchaseResult as any).insertId;
    
    // 3. เพิ่มเกมเข้าคลังของผู้ใช้
    await connection.query('INSERT INTO UserLibrary (user_id, game_id) VALUES (?, ?)', [userId, gameId]);
    
    // 4. บันทึก Transaction
    await connection.query('INSERT INTO Transactions (user_id, type, amount, detail, purchase_id) VALUES (?, ?, ?, ?, ?)', [userId, 'ซื้อเกม', game.price, `ซื้อเกม ${game.game_name}`, purchaseId]);

    // 5. อัปเดตยอดขาย
    await connection.query('UPDATE Games SET sales_count = sales_count + 1 WHERE game_id = ?', [gameId]);

    // --- ยืนยัน Transaction ---
    await connection.commit();
    
    const [rows]: any = await connection.query('SELECT wallet_balance FROM Users WHERE user_id = ?', [userId]);
    const wallet_balance = rows[0]?.wallet_balance;

    res.status(200).json({ message: 'Purchase successful!', new_balance: wallet_balance });

  } catch (error: any) {
    await connection.rollback();
    res.status(400).json({ message: error.message || 'Purchase failed.' });
  } finally {
    connection.release();
  }
};

export const checkout = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { gameIds, codeId } = req.body;

  if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
    return res.status(400).json({ message: 'No games to purchase.' });
  }

  const connection = await conn.getConnection();
  try {
    await connection.beginTransaction();

    // 1. ดึงข้อมูลเกมและราคาทั้งหมด + ยอดเงินผู้ใช้ (ล็อคแถวข้อมูล user เพื่อป้องกันการอัปเดตพร้อมกัน)
    const [userRows]: any = await connection.query('SELECT wallet_balance FROM Users WHERE user_id = ? FOR UPDATE', [userId]);
    const user = userRows[0];
    const [games] = await connection.query('SELECT game_id, price FROM Games WHERE game_id IN (?)', [gameIds]);
    
    // 2. คำนวณราคารวมจากฝั่งเซิร์ฟเวอร์ (ห้ามเชื่อราคาจาก Client)
    const subTotal = (games as any[]).reduce((sum, game) => sum + game.price, 0);
    let discountAmount = 0;
    let finalTotal = subTotal;
    
    // **[ใหม่]** Logic การคำนวณส่วนลด
    if (codeId) {
      const [discountRows]: any = await connection.query('SELECT * FROM DiscountCodes WHERE code_id = ?', [codeId]);
      const discount = discountRows[0];
      // (ควรมีการตรวจสอบโค้ดอีกครั้งที่นี่เพื่อความปลอดภัยสูงสุด)
      if (discount) {
        if (discount.discount_type === 'percent') {
          discountAmount = (subTotal * discount.discount_value) / 100;
        } else {
          discountAmount = discount.discount_value;
        }
        finalTotal = Math.max(0, subTotal - discountAmount);
      }
    }

    // 3. ตรวจสอบเงื่อนไข
    if (user.wallet_balance < finalTotal) {
      throw new Error('ยอดเงินใน Wallet ไม่เพียงพอ');
    }
    // (อาจเพิ่มการเช็คว่าผู้ใช้มีเกมนี้อยู่แล้วหรือไม่)

    // 4. ทำการอัปเดตฐานข้อมูล
    // 4.1 ตัดเงินจาก Wallet
    await connection.query('UPDATE Users SET wallet_balance = wallet_balance - ? WHERE user_id = ?', [finalTotal, userId]);
    
    // 4.2 สร้างใบสั่งซื้อ (Purchases)
    // สร้างใบสั่งซื้อ (บันทึกราคาก่อนและหลังลด)
    const [purchaseResult] = await connection.query(
      'INSERT INTO Purchases (user_id, sub_total, discount_amount, total_amount, code_id) VALUES (?, ?, ?, ?, ?)', 
      [userId, subTotal, discountAmount, finalTotal, codeId]
    );
    const purchaseId = (purchaseResult as any).insertId;

    // 4.3 เพิ่มรายการเกมในใบสั่งซื้อ (PurchaseItems) และคลังเกม (UserLibrary)
    for (const game of (games as any[])) {
      await connection.query('INSERT INTO PurchaseItems (purchase_id, game_id, item_price) VALUES (?, ?, ?)', [purchaseId, game.game_id, game.price]);
      await connection.query('INSERT INTO UserLibrary (user_id, game_id) VALUES (?, ?)', [userId, game.game_id]);
      await connection.query('UPDATE Games SET sales_count = sales_count + 1 WHERE game_id = ?', [game.game_id]);
    }

    // 4.4 บันทึก Transaction
    await connection.query('INSERT INTO Transactions (user_id, type, amount, detail, purchase_id) VALUES (?, ?, ?, ?, ?)', [userId, 'ซื้อเกม', finalTotal, `ซื้อเกม ${gameIds.length} รายการ`, purchaseId]);

    // 5. ยืนยัน Transaction
    await connection.commit();
    
    res.status(200).json({ message: 'Purchase successful!' });

  } catch (error: any) {
    await connection.rollback();
    res.status(400).json({ message: error.message || 'Purchase failed.' });
  } finally {
    connection.release();
  }
};