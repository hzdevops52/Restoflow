#!/usr/bin/env bash

set -e

BACKEND_DIR="$HOME/restaurant-order-system/backend"

echo "=========================================="
echo " Restaurant Order System - Backend Setup"
echo "=========================================="

cd "$BACKEND_DIR"

echo "[1/10] Creating backend directories..."

mkdir -p src/{config,controllers,middleware,models,routes,services,utils}

echo "[2/10] Creating environment configuration..."

cat > src/config/environment.js <<'EOL'
import dotenv from "dotenv";

dotenv.config();

const environment = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  mongoUri:
    process.env.MONGO_URI || "mongodb://localhost:27017/restaurant_orders",
};

export default environment;
EOL

cat > src/config/database.js <<'EOL'
import mongoose from "mongoose";
import environment from "./environment.js";

const connectDatabase = async () => {
  try {
    await mongoose.connect(environment.mongoUri);

    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDatabase;
EOL

echo "[3/10] Creating database models..."

cat > src/models/Category.js <<'EOL'
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;
EOL

cat > src/models/Product.js <<'EOL'
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
EOL

cat > src/models/Table.js <<'EOL'
import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    capacity: {
      type: Number,
      min: 1,
      default: 4,
    },
    status: {
      type: String,
      enum: ["available", "occupied"],
      default: "available",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Table = mongoose.model("Table", tableSchema);

export default Table;
EOL

cat > src/models/Order.js <<'EOL'
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item.",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "NEW",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "NEW",
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID"],
      default: "UNPAID",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
EOL

echo "[4/10] Creating utilities..."

cat > src/utils/orderNumber.js <<'EOL'
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);

  return `ORD-${timestamp}-${random}`;
};

export default generateOrderNumber;
EOL

cat > src/utils/validation.js <<'EOL'
const isValidObjectId = (value) => {
  return /^[a-fA-F0-9]{24}$/.test(value);
};

const validateOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "Order must contain at least one item.";
  }

  for (const item of items) {
    if (!isValidObjectId(item.product)) {
      return "Invalid product ID.";
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return "Each item quantity must be at least 1.";
    }
  }

  return null;
};

export { isValidObjectId, validateOrderItems };
EOL

echo "[5/10] Creating services..."

cat > src/services/productService.js <<'EOL'
import Product from "../models/Product.js";

const getAvailableProducts = async () => {
  return Product.find({ isAvailable: true })
    .populate("category", "name")
    .sort({ name: 1 });
};

export { getAvailableProducts };
EOL

cat > src/services/orderService.js <<'EOL'
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
  const order = await Order.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).populate("table", "tableNumber name");

  if (!order) {
    throw new Error("Order not found.");
  }

  if (status === "COMPLETED" || status === "CANCELLED") {
    await Table.findByIdAndUpdate(order.table._id, {
      status: "available",
    });
  }

  return order;
};

const updatePaymentStatus = async (id, paymentStatus) => {
  const order = await Order.findByIdAndUpdate(
    id,
    { paymentStatus },
    { new: true, runValidators: true }
  ).populate("table", "tableNumber name");

  if (!order) {
    throw new Error("Order not found.");
  }

  return order;
};

export {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
};
EOL

echo "[6/10] Creating controllers..."

cat > src/controllers/categoryController.js <<'EOL'
import Category from "../models/Category.js";

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      name: 1,
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create({
      name: req.body.name,
      description: req.body.description,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export { getCategories, createCategory };
EOL

cat > src/controllers/productController.js <<'EOL'
import Product from "../models/Product.js";
import { getAvailableProducts } from "../services/productService.js";

const getProducts = async (req, res, next) => {
  try {
    const products = await getAvailableProducts();

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      category,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export { getProducts, createProduct, updateProduct };
EOL

cat > src/controllers/tableController.js <<'EOL'
import Table from "../models/Table.js";

const getTables = async (req, res, next) => {
  try {
    const tables = await Table.find({ isActive: true }).sort({
      tableNumber: 1,
    });

    res.json({
      success: true,
      data: tables,
    });
  } catch (error) {
    next(error);
  }
};

const createTable = async (req, res, next) => {
  try {
    const { tableNumber, name, capacity } = req.body;

    const table = await Table.create({
      tableNumber,
      name,
      capacity,
    });

    res.status(201).json({
      success: true,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

export { getTables, createTable };
EOL

cat > src/controllers/orderController.js <<'EOL'
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
EOL

echo "[7/10] Creating routes..."

cat > src/routes/categoryRoutes.js <<'EOL'
import express from "express";
import {
  getCategories,
  createCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

router.get("/", getCategories);
router.post("/", createCategory);

export default router;
EOL

cat > src/routes/productRoutes.js <<'EOL'
import express from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", getProducts);
router.post("/", createProduct);
router.patch("/:id", updateProduct);

export default router;
EOL

cat > src/routes/tableRoutes.js <<'EOL'
import express from "express";
import {
  getTables,
  createTable,
} from "../controllers/tableController.js";

const router = express.Router();

router.get("/", getTables);
router.post("/", createTable);

export default router;
EOL

cat > src/routes/orderRoutes.js <<'EOL'
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
EOL

echo "[8/10] Creating middleware..."

cat > src/middleware/notFound.js <<'EOL'
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export default notFound;
EOL

cat > src/middleware/errorHandler.js <<'EOL'
const errorHandler = (error, req, res, next) => {
  console.error(error);

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error.",
  });
};

export default errorHandler;
EOL

echo "[9/10] Creating Express application and server..."

cat > src/app.js <<'EOL'
import express from "express";
import cors from "cors";

import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "restaurant-order-system-backend",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Restaurant Order System API",
  });
});

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/orders", orderRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
EOL

cat > src/server.js <<'EOL'
import app from "./app.js";
import connectDatabase from "./config/database.js";
import environment from "./config/environment.js";

const startServer = async () => {
  await connectDatabase();

  app.listen(environment.port, "0.0.0.0", () => {
    console.log(
      `Restaurant Order System API running on port ${environment.port}`
    );
  });
};

startServer();
EOL

echo "[10/10] Creating backend environment template..."

cat > .env.example <<'EOL'
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb://localhost:27017/restaurant_orders
EOL

echo ""
echo "=========================================="
echo " Running backend syntax check..."
echo "=========================================="

node --check src/server.js
node --check src/app.js
node --check src/config/database.js
node --check src/config/environment.js
node --check src/controllers/categoryController.js
node --check src/controllers/productController.js
node --check src/controllers/tableController.js
node --check src/controllers/orderController.js
node --check src/models/Category.js
node --check src/models/Product.js
node --check src/models/Table.js
node --check src/models/Order.js
node --check src/routes/categoryRoutes.js
node --check src/routes/productRoutes.js
node --check src/routes/tableRoutes.js
node --check src/routes/orderRoutes.js
node --check src/services/orderService.js
node --check src/services/productService.js
node --check src/utils/orderNumber.js
node --check src/utils/validation.js
node --check src/middleware/errorHandler.js
node --check src/middleware/notFound.js

echo ""
echo "=========================================="
echo " Backend setup completed successfully."
echo "=========================================="
echo ""
echo "Backend location:"
echo "$BACKEND_DIR"
echo ""
echo "Next:"
echo "  cd $BACKEND_DIR"
echo "  npm run dev"
echo ""
