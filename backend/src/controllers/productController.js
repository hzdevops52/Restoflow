import Product from "../models/Product.js";
import { getAvailableProducts } from "../services/productService.js";

const getProducts = async (req, res, next) => {
  try {
    const products =
      req.query.includeUnavailable === "true"
        ? await Product.find()
            .populate("category", "name")
            .sort({ name: 1 })
        : await getAvailableProducts();

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
    const { name, description, price, category, imageUrl, isAvailable } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      category,
      imageUrl: imageUrl || "",
      ...(typeof isAvailable === "boolean" ? { isAvailable } : {}),
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
