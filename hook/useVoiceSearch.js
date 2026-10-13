import { useState } from "react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

export default function useVoiceSearch(onResult) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    if (listening) return;

    setListening(true);
    setError("");

    try {
      const { available } = await SpeechRecognition.available();
      if (!available) {
        setError("تشخیص گفتار روی این گوشی در دسترس نیست.");
        return;
      }

      const { speechRecognition } = await SpeechRecognition.requestPermissions();
      if (speechRecognition !== "granted") {
        setError("برای جست‌وجوی صوتی، دسترسی به میکروفون لازم است.");
        return;
      }

      const { matches } = await SpeechRecognition.start({
        language: "fa-IR",
        maxResults: 1,
        partialResults: false,
        popup: true,
        prompt: "نام کالا را بگویید",
      });
      const transcript = matches?.[0]?.trim();
      if (transcript) {
        onResult(transcript);
      } else {
        setError("گفتاری تشخیص داده نشد. دوباره تلاش کنید.");
      }
    } catch (recognitionError) {
      // Android returns result code 0 when the recognition dialog is dismissed.
      if (String(recognitionError?.message || recognitionError).trim() !== "0") {
        setError("جست‌وجوی صوتی انجام نشد. دوباره تلاش کنید.");
      }
    } finally {
      setListening(false);
    }
  };

  return { listening, error, clearError: () => setError(""), start };
}
