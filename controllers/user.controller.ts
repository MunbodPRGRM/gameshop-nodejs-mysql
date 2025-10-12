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
export const updateProfileInfo = async (req: any, res: Response) => {
  const userId = req.user.userId;
  const { username } = req.body;
  const profile_image = req.file ? req.file.filename : undefined;

  // ตรวจสอบว่ามีข้อมูลส่งมาหรือไม่
  if (!username && !profile_image) {
    return res.status(400).json({ error: "No fields to update" });
  }

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

    values.push(userId);
    
    // **สำคัญ:** ดึงผลลัพธ์จากการ query มาตรวจสอบ
    const [result] = await conn.query(
      `UPDATE Users SET ${fields.join(", ")} WHERE user_id = ?`, 
      values
    );

    // **สำคัญ:** ตรวจสอบว่ามีการอัปเดตเกิดขึ้นจริง
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "User not found or no new data to update" });
    }

    res.json({ message: "Profile updated successfully" });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'กรุณากรอกรหัสผ่านให้ครบถ้วน' });
  }

  try {
    // 1. ดึงรหัสผ่านที่ hash ไว้ใน DB ของผู้ใช้ปัจจุบัน
    const [rows]: any = await conn.query('SELECT password FROM Users WHERE user_id = ?', [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    }

    // 2. เปรียบเทียบรหัสผ่านปัจจุบันที่ผู้ใช้กรอก กับ hash ใน DB
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    }

    // 3. Hash รหัสผ่านใหม่
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 4. อัปเดตรหัสผ่านใหม่ลงใน DB
    await conn.query('UPDATE Users SET password = ? WHERE user_id = ?', [hashedNewPassword, userId]);

    res.status(200).json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
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
  const { gameIds, codeId } = req.body; // รับ Array ของ game_id

  if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
    return res.status(400).json({ message: 'No games to purchase.' });
  }

  const connection = await conn.getConnection();
  try {
    await connection.beginTransaction();

    const [ownedGames] = await connection.query('SELECT game_id FROM UserLibrary WHERE user_id = ? AND game_id IN (?)', [userId, gameIds]);
    if ((ownedGames as any[]).length > 0) {
      // คืน Connection ก่อนส่ง Error
      connection.release(); 
      return res.status(400).json({ message: 'คุณมีบางเกมในตะกร้าอยู่ในคลังแล้ว' });
    }

    // 1. ดึงข้อมูลและล็อคแถว User เพื่อป้องกัน Race Condition
    const [userRows]: any = await connection.query('SELECT wallet_balance FROM Users WHERE user_id = ? FOR UPDATE', [userId]);
    const user = userRows[0];
    const [games] = await connection.query('SELECT game_id, game_name, price FROM Games WHERE game_id IN (?)', [gameIds]);
    
    console.log('Games from DB:', games);

    // 2. คำนวณราคารวมจากฝั่งเซิร์ฟเวอร์เสมอ
    // **[แก้]** ทำให้ reduce() ปลอดภัยจากค่า null หรือ undefined
    const subTotal = (games as any[]).reduce((sum, game) => {
      const price = parseFloat(game.price);
      // ถ้า price ไม่ใช่ตัวเลข (เป็น NaN) ให้บวกด้วย 0 แทน
      return sum + (isNaN(price) ? 0 : price);
    }, 0); // 0 คือค่าเริ่มต้นของ sum

    let discountAmount = 0;
    let finalTotal = subTotal;

    // ตรวจสอบและคำนวณส่วนลด (ถ้ามี codeId ส่งมา)
    if (codeId) {
      // ดึงข้อมูลโค้ดเพื่อคำนวณส่วนลด (ควรมีการ re-validate อีกครั้งเพื่อความปลอดภัยสูงสุด)
      const [discountRows]: any = await connection.query('SELECT * FROM DiscountCodes WHERE code_id = ?', [codeId]);
      const discount = discountRows[0];
      
      if (discount) {
        if (discount.discount_type === 'percent') {
          discountAmount = (subTotal * parseFloat(discount.discount_value)) / 100;
        } else {
          discountAmount = parseFloat(discount.discount_value);
        }
        finalTotal = Math.max(0, subTotal - discountAmount);
      }
    }

    console.log({ subTotal, discountAmount, finalTotal });

    if (isNaN(finalTotal)) {
        throw new Error('เกิดข้อผิดพลาดในการคำนวณราคาสินค้า');
    }

    // 3. ตรวจสอบเงื่อนไข
    if (user.wallet_balance < finalTotal) {
      throw new Error('ยอดเงินใน Wallet ไม่เพียงพอ');
    }

    // 4. ทำการอัปเดตฐานข้อมูล
    // 4.1 ตัดเงินจาก Wallet
    await connection.query('UPDATE Users SET wallet_balance = wallet_balance - ? WHERE user_id = ?', [finalTotal, userId]);
    
    // 4.2 สร้างใบสั่งซื้อ
    const [purchaseResult] = await connection.query(
      'INSERT INTO Purchases (user_id, sub_total, discount_amount, total_amount, code_id) VALUES (?, ?, ?, ?, ?)', 
      [userId, subTotal, discountAmount, finalTotal, codeId]
    );
    const purchaseId = (purchaseResult as any).insertId;

    // บันทึกว่าผู้ใช้ได้ใช้โค้ดนี้แล้ว และอัปเดตจำนวนการใช้
    if (codeId) {
        // บันทึกว่าผู้ใช้ได้ใช้โค้ดนี้แล้ว
        await connection.query('INSERT INTO CodeUsage (user_id, code_id) VALUES (?, ?)', [userId, codeId]);
        
        // เพิ่มจำนวนการใช้โค้ดขึ้น 1
        await connection.query('UPDATE DiscountCodes SET current_use = current_use + 1 WHERE code_id = ?', [codeId]);

        // ตรวจสอบว่าโค้ดถูกใช้ครบจำนวนหรือยัง
        const [updatedCodeRows]: any = await connection.query('SELECT current_use, max_use FROM DiscountCodes WHERE code_id = ?', [codeId]);
        const updatedCode = updatedCodeRows[0];

        if (updatedCode && updatedCode.current_use >= updatedCode.max_use) {
            console.log(`โค้ด ID: ${codeId} ถูกใช้ครบจำนวนแล้ว กำลังทำการลบ...`);
            // ถ้าครบแล้ว ให้ลบโค้ดออกจากระบบ
            // (ต้องลบจากตาราง CodeUsage ก่อน เพราะมี Foreign Key ผูกอยู่)
            await connection.query('DELETE FROM CodeUsage WHERE code_id = ?', [codeId]);
            await connection.query('DELETE FROM DiscountCodes WHERE code_id = ?', [codeId]);
        }
    }

    // 4.3 เพิ่มรายการเกมในใบสั่งซื้อ, คลังเกม, และอัปเดตยอดขาย
    for (const game of (games as any[])) {
      await connection.query('INSERT INTO PurchaseItems (purchase_id, game_id, item_price) VALUES (?, ?, ?)', [purchaseId, game.game_id, game.price]);
      await connection.query('INSERT INTO UserLibrary (user_id, game_id) VALUES (?, ?)', [userId, game.game_id]);
      await connection.query('UPDATE Games SET sales_count = sales_count + 1 WHERE game_id = ?', [game.game_id]);
    }

    // สร้างข้อความ detail จากชื่อเกมทั้งหมด
    const gameNamesString = (games as any[]).map(game => `"${game.game_name}"`).join(', ');

    // 4.4 บันทึก Transaction
    await connection.query('INSERT INTO Transactions (user_id, type, amount, detail, purchase_id) VALUES (?, ?, ?, ?, ?)', [userId, 'ซื้อเกม', finalTotal, `ซื้อเกม ${gameNamesString}`, purchaseId]);

    // 5. ยืนยัน Transaction
    await connection.commit();
    
    res.status(200).json({ message: 'Purchase successful!' });

  } catch (error: any) {
    await connection.rollback(); // ย้อนกลับทั้งหมดถ้าเกิดข้อผิดพลาด
    // **[แก้]** แสดง error.message เพื่อให้รู้สาเหตุที่แท้จริง
    console.error('Checkout failed in catch block:', error);
    res.status(400).json({ message: error.message || 'Purchase failed.' });
  } finally {
    connection.release();
  }
};

export const getMyLibrary = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId; // ดึง userId จาก Token ที่ผ่านการตรวจสอบแล้ว

  try {
    // ใช้ SQL JOIN เพื่อดึงข้อมูล "เกม" ทั้งหมดที่ผู้ใช้คนนี้เป็นเจ้าของ
    const [gamesInLibrary] = await conn.query(
      `SELECT g.*, gt.type_name 
       FROM UserLibrary ul
       JOIN Games g ON ul.game_id = g.game_id
       JOIN GameType gt ON g.type_id = gt.type_id 
       WHERE ul.user_id = ?`,
      [userId]
    );

    res.status(200).json(gamesInLibrary);

  } catch (error) {
    console.error('Error fetching user library:', error);
    res.status(500).json({ message: 'Error fetching user library.' });
  }
};

export const getOwnedGameDetail = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id: gameId } = req.params; // รับ gameId จาก URL

  try {
    // **สำคัญ:** Query นี้จะดึงข้อมูลเกมก็ต่อเมื่อมี record อยู่ใน UserLibrary เท่านั้น
    const [rows]: any = await conn.query(
      `SELECT g.*, gt.type_name, r.sales_rank 
       FROM UserLibrary ul
       JOIN Games g ON ul.game_id = g.game_id
       JOIN GameType gt ON g.type_id = gt.type_id
       JOIN (
        SELECT 
          game_id, 
          ROW_NUMBER() OVER (ORDER BY sales_count DESC, game_name ASC) as sales_rank
        FROM Games
      ) r ON g.game_id = r.game_id
       WHERE ul.user_id = ? AND ul.game_id = ?`,
      [userId, gameId]
    );
    const game = rows[0];

    if (game) {
      game.price = parseFloat(game.price);
      res.status(200).json(game);
    } else {
      // ถ้าไม่เจอข้อมูล หมายความว่า user ไม่ใช่เจ้าของเกมนี้ หรือไม่มีเกมนี้อยู่
      res.status(404).json({ message: 'ไม่พบเกมในคลังของคุณ' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching owned game details.' });
  }
};