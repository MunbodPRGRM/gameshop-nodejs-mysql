import express, { Request, Response } from "express";
import { conn } from "../db/dbconnect";

export const router = express.Router();

router.get("/gametype", async (req: Request, res: Response) => {
    try {
        const [results] = await conn.query("SELECT * FROM GameType");
        res.json(results);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
