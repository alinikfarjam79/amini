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

export const normalizeApiProduct = (product) => ({
  [PRODUCT_COLUMNS.title]: product.title ?? "",
  [PRODUCT_COLUMNS.code]: product.productCode ?? "",
  [PRODUCT_COLUMNS.barcode]: product.barcode ?? product.productCode ?? "",
  [PRODUCT_COLUMNS.price]: product.originalPrice ?? 0,
  alias: product.alias ?? "",
  quantity: product.quantity ?? 0,
  warningThreshold: product.warningThreshold ?? null,
  criticalThreshold: product.criticalThreshold ?? null,
  thresholdEnabled: product.thresholdEnabled ?? false,
  inventoryStatus: product.inventoryStatus ?? "",
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

export const loadProductsByInventoryFilter = async ({
  inventoryStatus,
  thresholdEnabled,
  search,
  signal,
} = {}) => {
  const token = getCookie(TOKEN_COOKIE_NAME);
  const params = new URLSearchParams();

  if (inventoryStatus) params.set("inventoryStatus", inventoryStatus);
  if (thresholdEnabled !== undefined) {
    params.set("thresholdEnabled", String(thresholdEnabled));
  }
  if (search?.trim()) params.set("search", search.trim());

  const response = await fetch(`${PRODUCTS_URL}?${params.toString()}`, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const products = getProductsFromPayload(payload);
  if (!response.ok || payload?.success === false || !products) {
    throw new Error(payload?.message || "دریافت محصولات ناموفق بود.");
  }

  return products.map(normalizeApiProduct);
};

export const updateProductAlias = async (productId, alias) => {
  const token = getCookie(TOKEN_COOKIE_NAME);

  const response = await fetch(`${PRODUCTS_URL}/${productId}/alias`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ alias }),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || "ویرایش اسم مستعار ناموفق بود.");
  }

  const product = payload?.data?.product || payload?.data;

  return product?.alias ?? alias;
};

export const updateProductThresholdStatus = async (
  productId,
  thresholdUpdates,
) => {
  const updates =
    typeof thresholdUpdates === "boolean"
      ? { thresholdEnabled: thresholdUpdates }
      : thresholdUpdates;
  const token = getCookie(TOKEN_COOKIE_NAME);
  const response = await fetch(`${PRODUCTS_URL}/${productId}/thresholds`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(updates),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || "تغییر وضعیت آستانه موجودی ناموفق بود.");
  }

  const product = payload?.data?.product || payload?.data;
  return {
    warningThreshold:
      product?.warningThreshold ?? updates.warningThreshold,
    criticalThreshold:
      product?.criticalThreshold ?? updates.criticalThreshold,
    thresholdEnabled:
      product?.thresholdEnabled ?? updates.thresholdEnabled,
    inventoryStatus: product?.inventoryStatus,
  };
};
