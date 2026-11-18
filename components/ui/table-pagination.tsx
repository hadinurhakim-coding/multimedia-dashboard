"use client";

import { Check, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGE_SIZE_OPTIONS, visiblePageTokens } from "@/lib/pagination";
import { cn } from "@/lib/utils";

/** Shared Radix/shadcn-style table pagination bar with page numbers and rows-per-page menu. */
export function TablePagination({
  page,
  totalPages,
  pageSize,
  disabled = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  disabled?: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextSize: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}) {
  const tokens = visiblePageTokens(page, totalPages);

  return (
    <div
      data-slot="table-pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-zinc-500",
        className
      )}
    >
      <p className="whitespace-nowrap">
        Halaman <span className="font-semibold text-pln-charcoal">{page}</span> dari{" "}
        <span className="font-semibold text-pln-charcoal">{totalPages}</span>
      </p>

      <nav aria-label="Navigasi halaman tabel" className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Halaman sebelumnya"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="size-8 rounded-md border-zinc-200 bg-white text-zinc-600 shadow-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {tokens.map((token) =>
          typeof token === "number" ? (
            <Button
              key={token}
              type="button"
              variant={token === page ? "outline" : "ghost"}
              size="icon"
              disabled={disabled}
              aria-label={`Halaman ${token}`}
              aria-current={token === page ? "page" : undefined}
              onClick={() => onPageChange(token)}
              className={cn(
                "size-8 rounded-md text-xs font-medium shadow-none",
                token === page
                  ? "border-zinc-300 bg-white font-semibold text-pln-navy"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-pln-navy"
              )}
            >
              {token}
            </Button>
          ) : (
            <span
              key={token}
              aria-hidden="true"
              className="flex size-8 items-center justify-center text-zinc-400"
            >
              <MoreHorizontal className="size-4" />
            </span>
          )
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Halaman berikutnya"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="size-8 rounded-md border-zinc-200 bg-white text-zinc-600 shadow-none disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </Button>
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          aria-label={`Tampilkan ${pageSize} baris per halaman`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 cursor-pointer gap-1.5 rounded-md border-zinc-200 bg-white px-2.5 text-xs font-medium text-pln-charcoal shadow-none hover:border-pln-cyan hover:bg-pln-ice/40"
          )}
        >
          <span>{pageSize} / halaman</span>
          <ChevronDown className="size-3.5 text-zinc-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-36">
          {pageSizeOptions.map((option) => {
            const active = option === pageSize;
            return (
              <DropdownMenuItem
                key={option}
                aria-current={active ? "true" : undefined}
                onClick={() => onPageSizeChange(option)}
                className={cn(
                  "justify-between text-xs",
                  active && "bg-pln-ice font-semibold text-pln-navy"
                )}
              >
                <span>{option} / halaman</span>
                {active && <Check className="size-3.5 text-pln-cyan" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
