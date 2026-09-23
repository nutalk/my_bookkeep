"use client";

/** 表格下方的分页控件，totalPages <= 1 时不渲染 */
export function Pagination({
  total,
  page,
  totalPages,
  onChange,
}: {
  total: number;
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800">
      <span className="text-xs text-neutral-500">共 {total} 条</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="text-xs text-neutral-400 hover:text-white disabled:opacity-30 px-2 py-1 rounded transition-colors"
        >
          上一页
        </button>
        <span className="text-xs text-neutral-500">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="text-xs text-neutral-400 hover:text-white disabled:opacity-30 px-2 py-1 rounded transition-colors"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
