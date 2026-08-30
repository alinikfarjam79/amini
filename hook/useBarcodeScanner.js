import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser";

export function useBarcodeScanner(onDetected) {
  const [isOpen, setIsOpen] = useState(false);

  const openScanner = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeScanner = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    openScanner,
    closeScanner,
    onDetected,
  };
}

export default useBarcodeScanner;
