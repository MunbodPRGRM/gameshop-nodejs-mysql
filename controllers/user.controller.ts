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
