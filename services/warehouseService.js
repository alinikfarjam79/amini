const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const TOKEN_COOKIE_NAME = "amini_xls_token";

const getCookie = (name) => {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
};

const authHeaders = () => {
  const token = getCookie(TOKEN_COOKIE_NAME);

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseResponse = async (response, fallbackMessage) => {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload?.data ?? payload;
};

const getArrayPayload = (data, keys) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
};

export const getWarehouseId = (warehouse) =>
  warehouse?._id || warehouse?.id || warehouse?.warehouseId;

export const normalizeWarehouse = (warehouse) => ({
  ...warehouse,
  id: getWarehouseId(warehouse),
  name: warehouse?.name || warehouse?.title || "انبار بدون نام",
  isActive: warehouse?.isActive ?? true,
});

export const normalizeWarehouseItem = (item) => ({
  ...item,
  id: item?._id || item?.id || item?.productCode || item?.code,
  title: item?.title || item?.name || item?.["عنوان"] || "",
  code:
    item?.code ||
    item?.productCode ||
    item?.barcode ||
    item?.["کد"] ||
    item?.["کدکالا"] ||
    item?.["کد کالا"] ||
    "",
  quantity:
    item?.quantity ??
    item?.stock ??
    item?.inventory ??
    item?.["موجودی"] ??
    item?.["موجودي"] ??
    0,
});

export const normalizeWarehouseItems = (data) =>
  getArrayPayload(data, ["items", "products", "warehouseItems"]).map(
    normalizeWarehouseItem,
  );

export const getWarehouses = async () => {
  const response = await fetch(`${API_BASE_URL}/api/warehouses`, {
    headers: authHeaders(),
  });
  const data = await parseResponse(response, "دریافت لیست انبارها ناموفق بود.");

  return getArrayPayload(data, ["warehouses", "items", "docs"]).map(
    normalizeWarehouse,
  );
};

export const createWarehouse = async ({ name, isActive = true }) => {
  const response = await fetch(`${API_BASE_URL}/api/warehouses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ name, isActive }),
  });
  const data = await parseResponse(response, "ساخت انبار ناموفق بود.");

  return normalizeWarehouse(data?.warehouse || data);
};

export const getWarehouseItems = async (warehouseId) => {
  const response = await fetch(
    `${API_BASE_URL}/api/warehouses/${warehouseId}/items`,
    {
      headers: authHeaders(),
    },
  );
  const data = await parseResponse(response, "دریافت آیتم‌های انبار ناموفق بود.");

  return normalizeWarehouseItems(data);
};

export const uploadWarehouseProductsExcel = async (warehouseId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/warehouses/${warehouseId}/products/upload-excel`,
    {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    },
  );

  return parseResponse(response, "آپلود فایل موجودی انبار ناموفق بود.");
};
