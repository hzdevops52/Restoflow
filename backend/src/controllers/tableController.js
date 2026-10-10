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
