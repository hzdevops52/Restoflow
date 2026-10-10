import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export const getCategories = async () => {
  const response = await api.get("/categories");
  return response.data.data;
};

export const getProducts = async (includeUnavailable = false) => {
  const response = await api.get("/products", {
    params: includeUnavailable ? { includeUnavailable: "true" } : {},
  });
  return response.data.data;
};

export const getTables = async () => {
  const response = await api.get("/tables");
  return response.data.data;
};

export const getOrders = async () => {
  const response = await api.get("/orders");
  return response.data.data;
};

export const createOrder = async (orderData) => {
  const response = await api.post("/orders", orderData);
  return response.data.data;
};

export default api;

export const updateOrderStatus = async (orderId, status) => {
  const response = await api.patch(`/orders/${orderId}/status`, { status });
  return response.data.data;
};

export const updatePaymentStatus = async (orderId, paymentStatus) => {
  const response = await api.patch(`/orders/${orderId}/payment`, {
    paymentStatus,
  });
  return response.data.data;
};

export const createCategory = async (categoryData) => {
  const response = await api.post("/categories", categoryData);
  return response.data.data;
};

export const createProduct = async (productData) => {
  const response = await api.post("/products", productData);
  return response.data.data;
};

export const updateProduct = async (productId, productData) => {
  const response = await api.patch(`/products/${productId}`, productData);
  return response.data.data;
};

export const createTable = async (tableData) => {
  const response = await api.post("/tables", tableData);
  return response.data.data;
};


export const uploadProductImage = async (imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);
  const response = await api.post("/products/upload-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });
  return response.data.data;
};
