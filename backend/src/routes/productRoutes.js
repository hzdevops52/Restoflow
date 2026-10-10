import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  getProducts,
  createProduct,
  updateProduct,
} from "../controllers/productController.js";

const router = express.Router();
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../frontend/public/images/menu"
    );
fs.mkdirSync(uploadDir, { recursive: true });

const allowedTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = allowedTypes[file.mimetype];
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes[file.mimetype]) {
      return cb(new Error("Choose a JPG, PNG, WebP, or GIF image."));
    }
    cb(null, true);
  },
});

router.get("/", getProducts);
router.post("/upload-image", imageUpload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Choose an image first." });
  }
  res.status(201).json({
    success: true,
    data: { imageUrl: `/images/menu/${req.file.filename}` },
  });
});
router.post("/", createProduct);
router.patch("/:id", updateProduct);

export default router;
