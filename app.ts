// src/app.ts
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import uploadRoutes from "./routes/upload";
import path from "path";

export const app = express();

// ========== Middleware ==========
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== Routes ==========
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/upload", uploadRoutes);

// ให้สามารถเข้าถึงไฟล์อัปโหลดได้โดยตรงผ่าน URL
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========== Default route ==========
app.get("/", (_req, res) => {
  res.send("Hello GameShop API is running 🚀");
});
