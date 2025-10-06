import express, { Request, Response } from "express";
import { conn } from "../db/dbconnect";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET!;

//Register
export const register = async (req: Request, res: Response) => {
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
};

// LOGIN
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const [rows]: any = await conn.query("SELECT * FROM Users WHERE email = ?", [email]);
    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid email or password" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
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
};