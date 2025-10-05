import express from "express";
import cors from "cors";
import { router as game } from "./controller/game";
import { router as user } from "./controller/user";
import { router as upload } from "./controller/upload";
import path from "path";

export const app = express();

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/user", user);
app.use("/game", game);
app.use("/upload", upload);
app.use("/uploads", express.static("uploads"));

app.use("/", (req, res) => {
  res.send("Hello World!!!");
});