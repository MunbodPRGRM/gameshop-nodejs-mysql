// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

export const authenticateJWT = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "Authorization header missing" });

  const token = authHeader.split(" ")[1]; // Bearer <token>
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const isAdmin = (req: any, res: Response, next: NextFunction) => {
  // Middleware นี้จะทำงาน "หลัง" authenticateJWT เสมอ
  // ดังนั้นเราจะสามารถเข้าถึง req.user ได้
  if (req.user && req.user.role === 'Admin') {
    next(); // ถ้าเป็น Admin ให้ผ่านไปได้
  } else {
    res.status(403).json({ error: "Forbidden: Admins only" }); // ถ้าไม่ใช่ ให้ปฏิเสธ
  }
};