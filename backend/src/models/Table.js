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
