const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const ROOT = `${API_BASE_URL}/api/company-product-prices`;

const authHeaders = () => {
  const tokenCookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith("amini_xls_token="));
  const token = tokenCookie
    ? decodeURIComponent(tokenCookie.split("=").slice(1).join("="))
    : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || "درخواست لیست قیمت شرکت‌ها ناموفق بود.");
  }
  return payload?.data ?? payload;
};

const getList = (data) => {
  if (Array.isArray(data)) return data;
  for (const key of ["products", "history", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const get = async (path, params, signal) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (String(value || "").trim()) query.set(key, String(value).trim());
  });
  const response = await fetch(`${ROOT}${path}${query.size ? `?${query}` : ""}`, {
    headers: authHeaders(),
    signal,
  });
  return getList(await parseResponse(response));
};

export const getCompanyProductPrices = (params = {}, signal) =>
  get("", params, signal);

export const getCompanyProductPriceHistory = (params = {}, signal) =>
  get("/history", params, signal);

export const uploadCompanyProductPrices = async ({ companyName, uploadDate, file }) => {
  const form = new FormData();
  form.append("companyName", companyName.trim());
  form.append("uploadDate", uploadDate);
  form.append("excel", file);
  const response = await fetch(`${ROOT}/upload-excel`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return parseResponse(response);
};
