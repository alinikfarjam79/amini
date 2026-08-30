const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";
const TOKEN_COOKIE_NAME = "amini_xls_token";

const getCookie = (name) => {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
};

const uploadExcelFile = async (path, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const token = getCookie(TOKEN_COOKIE_NAME);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || "آپلود فایل ناموفق بود.");
  }

  return payload?.data ?? payload;
};

export const uploadProductsExcel = (file) =>
  uploadExcelFile("/api/products/upload-excel", file);

export const uploadQuantityExcel = (file) =>
  uploadExcelFile("/api/products/upload-quantity-excel", file);
