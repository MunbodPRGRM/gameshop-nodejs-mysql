import express, { Request, Response } from "express";
import { conn } from "../db/dbconnect";
import bcrypt from "bcrypt";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import jwt from "jsonwebtoken";

export const router = express.Router();
const JWT_SECRET = "your_secret_key"; // แนะนำใช้ env แทน hardcode

// กำหนดโฟลเดอร์ uploads
const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ตั้งค่า storage ของ multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ================= ROUTES =================

// Register
router.post("/register", upload.single("profile_image"), async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const profile_image = req.file ? req.file.filename : null;
    const [result] = await conn.query(
      "INSERT INTO Users (username, email, password, profile_image) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, profile_image]
    );
    res.status(201).json({
      message: "User created successfully",
      userId: (result as any).insertId,
      profile_image,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login → คืน JWT
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const [rows]: any = await conn.query("SELECT * FROM Users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

    // สร้าง JWT
    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" } // token หมดอายุ 7 วัน
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        profile_image: user.profile_image,
        role: user.role,
        wallet_balance: user.wallet_balance,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware ตรวจ JWT
export const authenticateJWT = (req: any, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Authorization header missing" });

  const token = authHeader.split(" ")[1]; // Bearer <token>
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ดึงข้อมูลโปรไฟล์ → ต้องส่ง JWT
router.get("/profile", authenticateJWT, async (req: any, res: Response) => {
  const userId = req.user.userId;
  try {
    const [rows]: any = await conn.query(
      "SELECT user_id, username, email, profile_image, role, wallet_balance FROM Users WHERE user_id = ?",
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// อัปเดตข้อมูลผู้ใช้ → ต้องส่ง JWT
router.put("/update", authenticateJWT, upload.single("profile_image"), async (req: any, res: Response) => {
  const userId = req.user.userId;
  const { username, old_password, new_password, confirm_password } = req.body;
  const profile_image = req.file ? req.file.filename : undefined;

  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (username) { fields.push("username = ?"); values.push(username); }
    if (profile_image) { fields.push("profile_image = ?"); values.push(profile_image); }

    if (old_password || new_password || confirm_password) {
      if (!old_password || !new_password || !confirm_password)
        return res.status(400).json({ error: "All password fields are required" });

      const [rows]: any = await conn.query("SELECT password FROM Users WHERE user_id = ?", [userId]);
      const user = rows[0];
      const isMatch = await bcrypt.compare(old_password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Old password is incorrect" });

      if (new_password !== confirm_password)
        return res.status(400).json({ error: "New password and confirm password do not match" });

      const hashed = await bcrypt.hash(new_password, 10);
      fields.push("password = ?");
      values.push(hashed);
    }

    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

    values.push(userId);
    await conn.query(`UPDATE Users SET ${fields.join(", ")} WHERE user_id = ?`, values);

    res.json({ message: "User updated successfully", profile_image, username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get("/:id", async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const [rows]: any = await conn.query(
      "SELECT user_id, username, email, profile_image, role, wallet_balance FROM Users WHERE user_id = ?",
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
    } catch (err: any) {
    res.status(500).json({ error: err.message });
    }
});