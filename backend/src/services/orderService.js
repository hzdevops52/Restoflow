import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Table from "../models/Table.js";
import generateOrderNumber from "../utils/orderNumber.js";

const createOrder = async ({ tableId, items, notes = "" }) => {
  const table = await Table.findById(tableId);

  if (!table || !table.isActive) {
    throw new Error("Table not found or inactive.");
  }

  const productIds = items.map((item) => item.product);

  const products = await Product.find({
    _id: { $in: productIds },
    isAvailable: true,
  });

  if (products.length !== items.length) {
    throw new Error("One or more products are unavailable.");
  }

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  const orderItems = items.map((item) => {
    const product = productMap.get(item.product.toString());

    const quantity = Number(item.quantity);
    const unitPrice = Number(product.price);
    const subtotal = quantity * unitPrice;

    return {
      product: product._id,
      name: product.name,
      quantity,
      unitPrice,
      subtotal,
    };
  });

  const subtotal = orderItems.reduce(
    (total, item) => total + item.subtotal,
    0
  );

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    table: table._id,
    items: orderItems,
    subtotal,
    total: subtotal,
    notes,
  });

  await Table.findByIdAndUpdate(table._id, {
    status: "occupied",
  });

  return order.populate("table", "tableNumber name");
};

const getOrders = async (status) => {
  const filter = status ? { status } : {};

  return Order.find(filter)
    .populate("table", "tableNumber name")
    .sort({ createdAt: -1 });
};

const getOrderById = async (id) => {
  return Order.findById(id).populate("table", "tableNumber name");
};

const updateOrderStatus = async (id, status) => {
  const order = await Order.findById(id);

  if (!order) {
    throw new Error("Order not found.");
  }

  if (["COMPLETED", "CANCELLED"].includes(order.status)) {
    throw new Error(`Cannot change an order that is already ${order.status}.`);
  }

  if (status === "CANCELLED") {
    order.status = status;
  } else {
    const allowedTransitions = {
      NEW: "CONFIRMED",
      CONFIRMED: "PREPARING",
      PREPARING: "READY",
      READY: "COMPLETED",
    };

    if (allowedTransitions[order.status] !== status) {
      throw new Error(
        `Invalid status transition: ${order.status} to ${status}.`
      );
    }

    if (status === "COMPLETED" && order.paymentStatus !== "PAID") {
      throw new Error("Order must be paid before it can be completed.");
    }

    order.status = status;
  }

  await order.save();
  await order.populate("table", "tableNumber name");

  if (["COMPLETED", "CANCELLED"].includes(status)) {
    await Table.findByIdAndUpdate(order.table._id, {
      status: "available",
    });
  }

  return order;
};

const updatePaymentStatus = async (id, paymentStatus) => {
  const order = await Order.findById(id);

  if (!order) {
    throw new Error("Order not found.");
  }

  if (["COMPLETED", "CANCELLED"].includes(order.status)) {
    throw new Error("Payment cannot be changed for a completed or cancelled order.");
  }

  if (paymentStatus === "PAID" && order.status !== "READY") {
    throw new Error("Payment can only be recorded when an order is READY.");
  }

  order.paymentStatus = paymentStatus;
  await order.save();
  await order.populate("table", "tableNumber name");

  return order;
};

export {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
};
