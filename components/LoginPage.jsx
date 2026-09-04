import { useEffect, useRef, useState } from "react";
import { theme } from "../config/theme";
import { checkLoginMethod, login } from "../services/authService";

export default function LoginPage({ onLogin, onOfflineLogin }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loginMethod, setLoginMethod] = useState(null);
  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const offlineLoginTimerRef = useRef(null);

  const isPasswordStep = loginMethod === "password";
  const isOtpStep = loginMethod === "otp";
  const isSecondStep = Boolean(loginMethod);

  const resetToPhoneStep = () => {
    if (offlineLoginTimerRef.current) {
      window.clearTimeout(offlineLoginTimerRef.current);
      offlineLoginTimerRef.current = null;
    }

    setLoginMethod(null);
    setCredential("");
    setError("");
  };

  useEffect(
    () => () => {
      if (offlineLoginTimerRef.current) {
        window.clearTimeout(offlineLoginTimerRef.current);
      }
    },
    [],
  );

  const scheduleOfflineLogin = (fallbackMessage) => {
    if (offlineLoginTimerRef.current) {
      window.clearTimeout(offlineLoginTimerRef.current);
    }

    setError(
      `${fallbackMessage} تا ۵ ثانیه دیگر وارد صفحه اصلی آفلاین می‌شوید.`,
    );

    offlineLoginTimerRef.current = window.setTimeout(() => {
      const result = onOfflineLogin?.(phoneNumber.trim());
      offlineLoginTimerRef.current = null;

      if (result?.ok) {
        setError("");
        return;
      }

      setError(result?.message || fallbackMessage);
    }, 5000);
  };

  const handlePhoneSubmit = async () => {
    const normalizedPhone = phoneNumber.trim();

    if (!normalizedPhone) {
      setError("شماره موبایل الزامی است.");
      return;
    }

    const data = await checkLoginMethod(normalizedPhone);

    if (!data?.exists) {
      setError("کاربری با این شماره موبایل پیدا نشد.");
      return;
    }

    if (data.loginMethod !== "password" && data.loginMethod !== "otp") {
      setError("روش ورود این کاربر پشتیبانی نمی‌شود.");
      return;
    }

    setLoginMethod(data.loginMethod);
    setCredential("");
    setError("");
  };

  const handleLoginSubmit = async () => {
    const normalizedPhone = phoneNumber.trim();
    const normalizedCredential = credential.trim();

    if (!normalizedCredential) {
      setError(isPasswordStep ? "رمز عبور الزامی است." : "کد تایید الزامی است.");
      return;
    }

    const data = await login({
      phoneNumber: normalizedPhone,
      ...(isPasswordStep
        ? { password: normalizedCredential }
        : { otpCode: normalizedCredential }),
    });

    if (!data?.token || !data?.user) {
      setError("اطلاعات ورود از سمت سرور کامل نیست.");
      return;
    }

    const result = onLogin(data.user, data.token);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (isSecondStep) {
        await handleLoginSubmit();
      } else {
        await handlePhoneSubmit();
      }
    } catch (err) {
      if (err.type === "NETWORK") {
        scheduleOfflineLogin(err.message);
        return;
      }

      setError(err.message || "خطایی رخ داد. دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className={`min-h-screen ${theme.colors.background.page} font-['Vazirmatn',_'Noto_Sans_Arabic',_sans-serif] flex items-center justify-center px-4`}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-slate-200 bg-white rounded-lg shadow-sm p-6 space-y-5"
      >
        <div className="space-y-1">
          <h1 className={`text-2xl font-bold ${theme.colors.text.primary}`}>
            ورود به برنامه
          </h1>
          <p className={`text-sm ${theme.colors.text.muted}`}>
            {isSecondStep
              ? "برای ادامه اطلاعات ورود خود را وارد کنید."
              : "برای ادامه شماره موبایل خود را وارد کنید."}
          </p>
        </div>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className={`text-sm font-semibold ${theme.colors.text.primary}`}>
              شماره موبایل
            </span>
            <input
              type="tel"
              inputMode="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              autoComplete="tel"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              disabled={isSubmitting || isSecondStep}
              required
            />
          </label>

          {isSecondStep && (
            <label className="block space-y-1.5">
              <span className={`text-sm font-semibold ${theme.colors.text.primary}`}>
                {isPasswordStep ? "رمز عبور" : "کد تایید"}
              </span>
              <input
                type={isPasswordStep ? "password" : "text"}
                inputMode={isOtpStep ? "numeric" : undefined}
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                autoComplete={isPasswordStep ? "current-password" : "one-time-code"}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                disabled={isSubmitting}
                required
              />
            </label>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full rounded-md px-4 py-2.5 text-sm font-bold transition-colors active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${theme.colors.primary.button} ${theme.colors.primary.buttonFocus}`}
          >
            {isSubmitting ? "در حال ارسال..." : "ارسال"}
          </button>

          {isSecondStep && (
            <button
              type="button"
              onClick={resetToPhoneStep}
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              تغییر شماره موبایل
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
