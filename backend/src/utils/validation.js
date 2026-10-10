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
