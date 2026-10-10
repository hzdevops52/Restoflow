import express from "express";
import {
  getTables,
  createTable,
} from "../controllers/tableController.js";

const router = express.Router();

router.get("/", getTables);
router.post("/", createTable);

export default router;
