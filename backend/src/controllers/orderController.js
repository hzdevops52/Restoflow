import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
} from "../services/orderService.js";
import { validateOrderItems } from "../utils/validation.js";

const createOrderController = async (req, res, next) => {
  try {
    const { tableId, items, notes } = req.body;

    if (!tableId) {
      return res.status(400).json({
        success: false,
        message: "Table is required.",
      });
    }

    const validationError = validateOrderItems(items);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const order = await createOrder({
      tableId,
      items,
      notes,
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const getOrdersController = async (req, res, next) => {
  try {
    const orders = await getOrders(req.query.status);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

const getOrderController = async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatusController = async (req, res, next) => {
  try {
    const allowedStatuses = [
      "NEW",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    const order = await updateOrderStatus(
      req.params.id,
      req.body.status
    );

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

const updatePaymentStatusController = async (req, res, next) => {
  try {
    const allowedStatuses = ["UNPAID", "PAID"];

    if (!allowedStatuses.includes(req.body.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status.",
      });
    }

    const order = await updatePaymentStatus(
      req.params.id,
      req.body.paymentStatus
    );

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export {
  createOrderController,
  getOrdersController,
  getOrderController,
  updateOrderStatusController,
  updatePaymentStatusController,
};
