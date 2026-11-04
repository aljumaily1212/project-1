"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanLine } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button, Input } from "@/components/common";

// Two ways to read a code:
// 1. A USB barcode scanner. It acts like a keyboard: it "types" the code into the box and presses Enter.
//    Typing a code by hand works the same way.
// 2. The phone or laptop camera, read by the ZXing library.
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const { t } = useT();
  const [typed, setTyped] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  // Keeps the latest onCode, so the camera loop doesn't restart when the parent redraws.
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  });

  useEffect(() => {
    if (!cameraOn || !video.current) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    // Loaded only when the camera is opened, so the stock page stays light for everyone else.
    import("@zxing/browser")
      .then(async ({ BrowserMultiFormatReader }) => {
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(undefined, video.current!, (result) => {
          if (!result || cancelled) return;
          onCodeRef.current(result.getText());
          setCameraOn(false);
        });
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      })
      // No camera, or the browser was refused permission.
      .catch(() => {
        setCameraError(true);
        setCameraOn(false);
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [cameraOn]);

  function submitTyped(event: React.FormEvent) {
    event.preventDefault();
    if (!typed.trim()) return;
    onCode(typed);
    setTyped("");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submitTyped} className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-slate-400" aria-hidden />
          <Input
            autoFocus
            dir="ltr"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t("scan.typeHere")}
            aria-label={t("scan.typeHere")}
            className="h-11 ps-9 font-mono"
          />
        </div>
        <Button type="submit" className="h-11">
          {t("scan.read")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-11"
          onClick={() => {
            setCameraError(false);
            setCameraOn(!cameraOn);
          }}
        >
          {cameraOn ? <CameraOff className="size-4" aria-hidden /> : <Camera className="size-4" aria-hidden />}
          {cameraOn ? t("scan.closeCamera") : t("scan.openCamera")}
        </Button>
      </form>
      {cameraOn && (
        // The video is always shown left to right, like a mirror would confuse the user in Arabic too.
        <video ref={video} dir="ltr" className="aspect-video w-full max-w-md rounded-lg bg-black object-cover" muted playsInline />
      )}
      {cameraError && <p className="text-sm text-red-700">{t("scan.cameraError")}</p>}
    </div>
  );
}
