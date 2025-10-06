// src/controllers/upload.controller.ts
import { Request, Response } from "express";
import path from "path";
import fs from "fs";

// กำหนดโฟลเดอร์อัปโหลด
const uploadsDir = path.resolve(__dirname, "../uploads");

// =============== Upload File ===============
export const uploadFile = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  return res.status(200).json({
    message: "File uploaded successfully",
    filename: req.file.filename,
  });
};

// =============== Get File or Download ===============
export const getFile = (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename!);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  const download = req.query.download === "true";

  if (download) {
    return res.download(filePath); // ดาวน์โหลดไฟล์
  } else {
    return res.sendFile(filePath); // แสดงไฟล์ใน browser
  }
};
