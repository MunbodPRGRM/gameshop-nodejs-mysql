import express from "express";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";

export const router = express.Router();

const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = uuidv4() + ext;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 64 * 1024 * 1024 }, // 64 MB
});

// Route to upload a file
router.post("/", upload.single("file"), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }
    res.json({ filename: req.file.filename });
});

router.get("/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "File not found" });
        return;
    }
    const download = req.query.download === "true";
    if (download) {
        res.download(filePath);
    } else {
        res.sendFile(filePath);
    }
});