"use client";

import { useEffect, type ReactNode } from "react";

/**
 * 通用弹窗：遮罩 + 面板 + 标题。
 * 只按 ESC 或点右上角关闭；点击窗体外的遮罩不会关闭，避免误触丢失填写内容。
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className={`bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full ${maxWidth} max-h-[85vh] overflow-y-auto`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
