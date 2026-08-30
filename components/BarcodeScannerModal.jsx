import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera } from "@capacitor/camera";
import {
  BarcodeScanner,
  BarcodeFormat,
} from "@capacitor-mlkit/barcode-scanning";

const isNative = Capacitor.isNativePlatform();

export default function BarcodeScannerModal({ isOpen, onClose, onDetected }) {
  if (!isOpen) return null;

  if (isNative) {
    return (
      <MobileScanner
        onClose={onClose}
        onDetected={onDetected}
        isOpen={isOpen}
      />
    );
  }

  return (
    <WebScanner onClose={onClose} onDetected={onDetected} isOpen={isOpen} />
  );
}

function WebScanner({ onClose, onDetected, isOpen }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let stream;
    let reader;
    let stopped = false;

    const start = async () => {
      try {
        setStatus("loading");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        const video = videoRef.current;
        video.srcObject = stream;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
        await video.play();
        if (stopped) return;
        const hints = new Map();
        reader = new BrowserMultiFormatReader(hints);
        readerRef.current = reader;
        setStatus("scanning");
        reader.decodeFromVideoElement(video, (result) => {
          if (result) {
            const code = result.getText();
            stopped = true;
            try {
              reader.reset();
            } catch {}
            stream.getTracks().forEach((t) => t.stop());
            onDetected(code);
            onClose();
          }
        });
      } catch (e) {
        setStatus("error");
        setError(e.message || "خطای دوربین");
      }
    };

    start();
    return () => {
      stopped = true;
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch {}
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">اسکن بارکد</h3>
          <button onClick={onClose} className="text-gray-500">
            ✕
          </button>
        </div>
        <div className="relative aspect-[4/3] bg-black">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              در حال فعال کردن دوربین...
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4 text-white">
              {error}
            </div>
          )}
          {status === "scanning" && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-32 border-2 border-white rounded-lg" />
            </div>
          )}
        </div>
        <div className="p-3 text-center text-sm text-gray-500">
          بارکد را داخل کادر قرار دهید
        </div>
      </div>
    </div>
  );
}

function MobileScanner({ onClose, onDetected, isOpen }) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let stopped = false;

    const cleanup = () => {
      document.body.classList.remove("barcode-scanner-active");
      BarcodeScanner.removeAllListeners();
      BarcodeScanner.stopScan().catch(() => {});
    };

    const start = async () => {
      try {
        const { camera } = await BarcodeScanner.requestPermissions();
        if (camera !== "granted") {
          setError("دسترسی به دوربین رد شد.");
          return;
        }

        await BarcodeScanner.addListener("barcodeScanned", (event) => {
          if (stopped) return;
          stopped = true;
          cleanup();
          onDetected(event.barcode.rawValue);
          onClose();
        });

        document.body.classList.add("barcode-scanner-active");
        await BarcodeScanner.startScan({
          formats: [
            BarcodeFormat.Code128,
            BarcodeFormat.Code39,
            BarcodeFormat.Ean13,
            BarcodeFormat.Ean8,
            BarcodeFormat.UpcA,
            BarcodeFormat.UpcE,
            BarcodeFormat.Itf,
            BarcodeFormat.Codabar,
          ],
        });
      } catch (e) {
        cleanup();
        setError(e.message || "خطای دوربین");
      }
    };

    start();
    return () => {
      stopped = true;
      cleanup();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]" style={{ visibility: "visible" }}>
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-black/70">
        <h3 className="text-white font-semibold">اسکن بارکد</h3>
        <button
          onClick={() => {
            document.body.classList.remove("barcode-scanner-active");
            onClose();
          }}
          className="text-white text-2xl leading-none"
        >
          ✕
        </button>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" />
        <div
          className="relative z-10 w-72 h-44 rounded-lg"
          style={{
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            border: "2px solid white",
            background: "transparent",
          }}
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-black/70 text-center text-sm text-white">
        {error || "بارکد را مستقیم داخل کادر قرار دهید"}
      </div>
    </div>
  );
}
