const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === "true";
const AUTH_BYPASS_ROLE = import.meta.env.VITE_AUTH_BYPASS_ROLE || "admin";

const createBypassUser = (phoneNumber = "") => ({
  id: "local-bypass-user",
  phoneNumber: phoneNumber.trim() || "local-user",
  loginMethod: "bypass",
  role: AUTH_BYPASS_ROLE,
});

const postJson = async (path, body) => {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const networkError = new Error(
      "ارتباط با سرور برقرار نشد. اگر قبلاً وارد شده باشید، می‌توانید اطلاعات ذخیره‌شده را به صورت آفلاین ببینید.",
    );
    networkError.type = "NETWORK";
    throw networkError;
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    if (response.status >= 500) {
      const networkError = new Error(
        "ارتباط با سرور برقرار نشد. اگر قبلاً وارد شده باشید، می‌توانید اطلاعات ذخیره‌شده را به صورت آفلاین ببینید.",
      );
      networkError.type = "NETWORK";
      throw networkError;
    }

    throw new Error(payload?.message || "درخواست ناموفق بود. دوباره تلاش کنید.");
  }

  return payload.data;
};

export const checkLoginMethod = (phoneNumber) =>
  AUTH_BYPASS_ENABLED
    ? Promise.resolve({
        exists: true,
        loginMethod: "password",
      })
    : postJson("/api/auth/login-method", { phoneNumber });

export const login = ({ phoneNumber, password, otpCode }) =>
  AUTH_BYPASS_ENABLED
    ? Promise.resolve({
        token: "local-bypass-token",
        user: createBypassUser(phoneNumber),
      })
    : postJson("/api/auth/login", {
        phoneNumber,
        ...(password ? { password } : {}),
        ...(otpCode ? { otpCode } : {}),
      });
