"use client";

import { useEffect, useRef, useState } from "react";
import { sniffedImageKind } from "@/lib/file-preview";

export function FilePreview({ file, label }: { file: File; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let dead = false;
    let bitmap: ImageBitmap | null = null;
    setShown(false);
    void file.slice(0, 16).arrayBuffer().then(async (header) => {
      if (dead || !sniffedImageKind(new Uint8Array(header))) return;
      bitmap = await createImageBitmap(file);
      if (dead) {
        bitmap.close();
        return;
      }
      const node = canvas.current;
      if (!node) return;
      const scale = Math.min(1, 160 / bitmap.height, 480 / bitmap.width);
      node.width = Math.max(1, Math.round(bitmap.width * scale));
      node.height = Math.max(1, Math.round(bitmap.height * scale));
      node.getContext("2d")?.drawImage(bitmap, 0, 0, node.width, node.height);
      setShown(true);
    }).catch(() => setShown(false));
    return () => {
      dead = true;
      bitmap?.close();
    };
  }, [file]);

  return (
    <div>
      <p className="mt-1 text-xs text-ink-500">{file.name}</p>
      <canvas ref={canvas} role="img" aria-label={label} className={shown ? "mt-2 max-h-40 w-full rounded-xl" : "hidden"} />
    </div>
  );
}
