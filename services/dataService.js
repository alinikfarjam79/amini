const baseApi = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const PRODUCTS_URL = `${baseApi}/api/products`;

const TOKEN_COOKIE_NAME = "amini_xls_token";

const PRODUCT_COLUMNS = {
  title: "عنوان کالا",
  code: "کد کالا",
  barcode: "بارکد کالا",
  price: "قیمت اصلی",
};

const getCookie = (name) => {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
};

const normalizeApiProduct = (product) => ({
  [PRODUCT_COLUMNS.title]: product.title ?? "",
  [PRODUCT_COLUMNS.code]: product.productCode ?? "",
  [PRODUCT_COLUMNS.barcode]: product.barcode ?? product.productCode ?? "",
  [PRODUCT_COLUMNS.price]: product.originalPrice ?? 0,
  quantity: product.quantity ?? 0,
  _id: product._id,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const getProductsFromPayload = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  return null;
};

export const loadProducts = async () => {
  const token = getCookie(TOKEN_COOKIE_NAME);

  const response = await fetch(PRODUCTS_URL, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw Object.assign(new Error(`خطای ارتباط با سرور (${response.status})`), {
      type: "NETWORK",
    });
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw Object.assign(new Error("پاسخ سرور قابل خواندن نیست."), {
      type: "PARSE",
    });
  }

  const products = getProductsFromPayload(payload);

  if (!payload?.success || !products) {
    throw Object.assign(new Error("ساختار پاسخ محصولات معتبر نیست."), {
      type: "PARSE",
    });
  }

  return {
    products: products.map(normalizeApiProduct),
  };
};
