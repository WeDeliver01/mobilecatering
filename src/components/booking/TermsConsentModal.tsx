"use client";

import { useEffect, useRef, useState } from "react";
import type { ConsentMethod } from "@/lib/types";

export interface ConsentResult {
  method: ConsentMethod;
  signatureDataUrl?: string;
}

export function TermsConsentModal({
  title, body, onAgree, onCancel, busy,
}: {
  title: string;
  body: string;
  onAgree: (consent: ConsentResult) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#15171A";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const p = pos(e);
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const p = pos(e);
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
    setHasSignature(true);
  };
  const end = () => { drawing.current = false; };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  };

  const canAgree = checked || hasSignature;

  const agree = () => {
    if (hasSignature) {
      onAgree({ method: "signature", signatureDataUrl: canvasRef.current?.toDataURL("image/png") });
    } else {
      onAgree({ method: "checkbox" });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[rgba(21,23,26,0.6)]" onClick={onCancel}>
      <div
        className="bg-surface-container-lowest rounded-xl w-full max-w-lg border border-outline-variant flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-outline-variant flex items-start justify-between gap-4">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Before you book</p>
            <h2 className="font-headline-md text-headline-md mt-1">{title}</h2>
          </div>
          <a
            href="/gallery#terms" target="_blank" rel="noreferrer"
            className="text-xs font-bold text-on-surface-variant hover:text-primary whitespace-nowrap"
          >
            Open full version
          </a>
        </div>

        <div className="p-6 overflow-y-auto text-sm text-on-surface-variant whitespace-pre-line leading-relaxed" style={{ maxHeight: "30vh" }}>
          {body}
        </div>

        <div className="p-6 border-t border-outline-variant space-y-4">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox" checked={checked}
              onChange={(e) => { setChecked(e.target.checked); if (e.target.checked) clearSignature(); }}
              className="mt-0.5 rounded border-outline"
            />
            I have read and agree to the Terms &amp; Policies.
          </label>

          <div>
            <p className="text-xs text-on-surface-variant mb-2">Or sign below to agree:</p>
            <canvas
              ref={canvasRef}
              width={440} height={140}
              onPointerDown={(e) => { setChecked(false); start(e); }}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="w-full border border-outline rounded-lg touch-none"
              style={{ height: 140 }}
            />
            <button type="button" onClick={clearSignature} className="text-xs font-bold text-on-surface-variant hover:text-primary mt-2">
              Clear signature
            </button>
          </div>

          <p className="text-[11px] text-on-surface-variant">
            By agreeing, your name, email and the time of agreement are recorded against this booking for our records.
          </p>

          <div className="flex gap-2">
            <button
              type="button" onClick={agree} disabled={!canAgree || busy}
              className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-40"
            >
              {busy ? "Working..." : "Agree & continue"}
            </button>
            <button type="button" onClick={onCancel} className="px-4 border border-outline rounded-lg font-bold hover:bg-surface-container-low transition-all">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
