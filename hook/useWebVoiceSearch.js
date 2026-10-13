import { useEffect, useRef, useState } from "react";

const getSpeechRecognition = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition;

const getErrorMessage = (code) => {
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "برای جست‌وجوی صوتی، دسترسی به میکروفون را فعال کنید.";
  }
  if (code === "no-speech") return "گفتاری تشخیص داده نشد. دوباره تلاش کنید.";
  if (code === "audio-capture") return "میکروفون در دسترس نیست.";
  if (code === "network") return "ارتباط با سرویس تشخیص گفتار برقرار نشد.";
  if (code === "language-not-supported") return "تشخیص گفتار فارسی در این مرورگر پشتیبانی نمی‌شود.";
  return "جست‌وجوی صوتی انجام نشد. دوباره تلاش کنید.";
};

export default function useWebVoiceSearch(onResult) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.abort();
    recognitionRef.current = null;
  }, []);

  const start = () => {
    if (recognitionRef.current) return;
    setError("");

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError("این مرورگر از جست‌وجوی صوتی پشتیبانی نمی‌کند.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fa-IR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) onResult(transcript);
      else setError("گفتاری تشخیص داده نشد. دوباره تلاش کنید.");
    };
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      setError(getErrorMessage(event.error));
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setError("جست‌وجوی صوتی در این مرورگر شروع نشد.");
    }
  };

  const stop = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognitionRef.current = null;
    recognition.abort();
    setListening(false);
  };

  return { listening, error, clearError: () => setError(""), start, stop };
}
