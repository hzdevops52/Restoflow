import Product from "../models/Product.js";

const getAvailableProducts = async () => {
  return Product.find({ isAvailable: true })
    .populate("category", "name")
    .sort({ name: 1 });
};

export { getAvailableProducts };
