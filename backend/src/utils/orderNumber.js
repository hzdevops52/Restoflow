const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);

  return `ORD-${timestamp}-${random}`;
};

export default generateOrderNumber;
