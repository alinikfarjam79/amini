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

const parseResponse = async (response) => {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || "دریافت لیست شرکت‌ها ناموفق بود.");
  }

  return payload?.data ?? payload;
};

const toAbsoluteUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

export const normalizeCompanyUploads = (data) => {
  const uploads =
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.uploads) && data.uploads) ||
    (Array.isArray(data?.files) && data.files) ||
    (Array.isArray(data?.documents) && data.documents) ||
    (Array.isArray(data?.priceLists) && data.priceLists) ||
    (Array.isArray(data?.items) && data.items) ||
    [];

  return uploads.map((upload) => {
    const url =
      upload.url ||
      upload.fileUrl ||
      upload.downloadUrl ||
      upload.path ||
      upload.filePath ||
      "";

    return {
      ...upload,
      id: upload._id || upload.id || upload.key || url,
      title:
        upload.title ||
        upload.name ||
        upload.fileName ||
        upload.originalName ||
        upload.originalname ||
        "فایل بدون نام",
      url: toAbsoluteUrl(url),
      mimeType:
        upload.mimeType ||
        upload.mimetype ||
        upload.contentType ||
        upload.type ||
        "",
    };
  });
};

export const searchCompanies = async (search = "") => {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const queryString = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/companies${queryString ? `?${queryString}` : ""}`,
    {
      headers: authHeaders(),
    },
  );
  const data = await parseResponse(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.companies)) return data.companies;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.docs)) return data.docs;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

export const uploadCompanyFile = async ({
  companyName,
  title,
  publishDate,
  file,
}) => {
  const formData = new FormData();
  formData.append("companyName", companyName);
  formData.append("title", title);
  formData.append("publishDate", publishDate);
  formData.append("files", file);

  const response = await fetch(`${API_BASE_URL}/api/companies/files`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  return parseResponse(response);
};
