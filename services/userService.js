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

const authHeaders = () => {
  const token = getCookie(TOKEN_COOKIE_NAME);

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fieldLabels = {
  phoneNumber: "شماره موبایل",
  password: "رمز عبور",
  loginMethod: "روش ورود",
  role: "نقش کاربر",
};

const validationMessages = {
  "Phone number must be a valid Iran mobile number":
    "شماره موبایل باید یک شماره معتبر ایران باشد.",
  "Too small: expected string to have >=6 characters":
    "رمز عبور باید حداقل ۶ کاراکتر باشد.",
  "Phone number already exists": "این شماره موبایل قبلاً ثبت شده است.",
};

const getValidationErrorMessage = (errors) => {
  const fieldErrors = errors?.fieldErrors;
  const formErrors = errors?.formErrors;
  const messages = [];

  if (fieldErrors && typeof fieldErrors === "object") {
    Object.entries(fieldErrors).forEach(([fieldName, fieldMessages]) => {
      const label = fieldLabels[fieldName] || fieldName;
      const normalizedMessages = Array.isArray(fieldMessages)
        ? fieldMessages
        : [fieldMessages];

      normalizedMessages.forEach((message) => {
        const translatedMessage = validationMessages[message] || message;
        messages.push(`${label}: ${translatedMessage}`);
      });
    });
  }

  if (Array.isArray(formErrors)) {
    formErrors.forEach((message) => {
      messages.push(validationMessages[message] || message);
    });
  }

  return messages.join(" ");
};

const parseResponse = async (response) => {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    const validationError = getValidationErrorMessage(payload?.errors);

    throw new Error(
      validationError ||
        validationMessages[payload?.message] ||
        payload?.message ||
        "درخواست کاربران ناموفق بود.",
    );
  }

  return payload?.data ?? payload;
};

export const getUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    headers: authHeaders(),
  });

  const data = await parseResponse(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;

  return [];
};

export const createUser = async ({ phoneNumber, password, loginMethod }) => {
  const body = {
    phoneNumber,
    role: "user",
    loginMethod,
    ...(loginMethod === "password" ? { password } : {}),
  };

  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  return parseResponse(response);
};

export const deleteUser = async (userId) => {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  return parseResponse(response);
};
