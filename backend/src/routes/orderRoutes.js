import express from "express";
import {
  createOrderController,
  getOrdersController,
  getOrderController,
  updateOrderStatusController,
  updatePaymentStatusController,
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/", getOrdersController);
router.get("/:id", getOrderController);
router.post("/", createOrderController);
router.patch("/:id/status", updateOrderStatusController);
router.patch("/:id/payment", updatePaymentStatusController);

export default router;
