import mongoose from "mongoose";
import environment from "../src/config/environment.js";
import Category from "../src/models/Category.js";
import Product from "../src/models/Product.js";
import Table from "../src/models/Table.js";

const categories = [
  {
    name: "Burgers",
    description: "Freshly prepared burgers",
  },
  {
    name: "Pizza",
    description: "Oven-baked pizzas",
  },
  {
    name: "Sides",
    description: "Snacks and side dishes",
  },
  {
    name: "Drinks",
    description: "Cold beverages",
  },
  {
    name: "Desserts",
    description: "Sweet treats",
  },
];

const products = [
  {
    name: "Classic Beef Burger",
    description: "Beef patty, lettuce, tomato and house sauce",
    price: 650,
    category: "Burgers",
    imageUrl: "/images/menu/classic-burger.webp",
  },
  {
    name: "Crispy Chicken Burger",
    description: "Crispy chicken fillet with creamy sauce",
    price: 550,
    category: "Burgers",
    imageUrl: "/images/menu/crispy-chicken-burger.webp",
  },
  {
    name: "Margherita Pizza",
    description: "Tomato sauce, mozzarella and fresh basil",
    price: 950,
    category: "Pizza",
    imageUrl: "/images/menu/margherita-pizza.webp",
  },
  {
    name: "Chicken Fajita Pizza",
    description: "Chicken, peppers, onions and mozzarella",
    price: 1250,
    category: "Pizza",
    imageUrl: "/images/menu/chicken-fajita-pizza.webp",
  },
  {
    name: "French Fries",
    description: "Golden, crispy fries",
    price: 250,
    category: "Sides",
    imageUrl: "/images/menu/french-fries.webp",
  },
  {
    name: "Chilled Cola",
    description: "Cold carbonated soft drink",
    price: 120,
    category: "Drinks",
    imageUrl: "/images/menu/cola.webp",
  },
  {
    name: "Fresh Lemon Mint",
    description: "Refreshing lemon and mint drink",
    price: 220,
    category: "Drinks",
    imageUrl: "/images/menu/lemon-mint.webp",
  },
  {
    name: "Chocolate Brownie",
    description: "Rich chocolate brownie",
    price: 300,
    category: "Desserts",
    imageUrl: "/images/menu/chocolate-brownie.webp",
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(environment.mongoUri);
    console.log("MongoDB connected successfully.");

    const categoryIds = new Map();

    for (const categoryData of categories) {
      const category = await Category.findOneAndUpdate(
        { name: categoryData.name },
        {
          $set: {
            description: categoryData.description,
            isActive: true,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      categoryIds.set(categoryData.name, category._id);
    }

    for (const productData of products) {
      const { category, ...productFields } = productData;

      await Product.findOneAndUpdate(
        { name: productFields.name },
        {
          $set: {
            ...productFields,
            category: categoryIds.get(category),
            isAvailable: true,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    for (let number = 1; number <= 8; number += 1) {
      await Table.findOneAndUpdate(
        { tableNumber: number },
        {
          $set: {
            name: `Table ${number}`,
            capacity: 4,
            isActive: true,
          },
          $setOnInsert: {
            status: "available",
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    const [categoryCount, productCount, tableCount] = await Promise.all([
      Category.countDocuments({ isActive: true }),
      Product.countDocuments({ isAvailable: true }),
      Table.countDocuments({ isActive: true }),
    ]);

    console.log("Sample menu seed completed successfully.");
    console.log(`Active categories: ${categoryCount}`);
    console.log(`Available products: ${productCount}`);
    console.log(`Active tables: ${tableCount}`);
  } catch (error) {
    console.error("Database seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
