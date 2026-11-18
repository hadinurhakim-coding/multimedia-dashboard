"use client";

import {
  AlignJustify,
  ChevronDown,
  Grid2x2,
  LayoutGrid,
  LayoutList,
  List,
  Monitor,
  Rows3,
  Square,
  TableProperties,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DRAFT_VIEW_OPTIONS, type DraftViewMode } from "@/lib/lpp/draft-folders";
import { cn } from "@/lib/utils";

const VIEW_ICONS: Record<DraftViewMode, LucideIcon> = {
  "extra-large": Monitor,
  large: Square,
  medium: LayoutGrid,
  small: Grid2x2,
  list: List,
  details: AlignJustify,
  tiles: LayoutList,
  content: Rows3,
};

/** Explorer-style View selector dropdown for switching folder/file layout and detail density. */
export function DraftViewMenu({
  value,
  disabled,
  onChange,
}: {
  value: DraftViewMode;
  disabled?: boolean;
  onChange: (mode: DraftViewMode) => void;
}) {
  const currentOption = DRAFT_VIEW_OPTIONS.find((option) => option.id === value) ?? DRAFT_VIEW_OPTIONS[6];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`Ubah tampilan (${currentOption.label})`}
        title="Sesuaikan tampilan folder atau detail informasi"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 cursor-pointer gap-1.5 border-zinc-200 bg-white px-2.5 text-xs font-medium text-pln-navy shadow-none hover:border-pln-cyan hover:bg-pln-ice/50"
        )}
      >
        <TableProperties className="size-3.5 text-pln-navy" />
        <span>Tampilan</span>
        <ChevronDown className="size-3.5 text-zinc-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tampilan folder &amp; detail</DropdownMenuLabel>
          {DRAFT_VIEW_OPTIONS.slice(0, 4).map((option) => {
            const Icon = VIEW_ICONS[option.id];
            const active = option.id === value;
            return (
              <DropdownMenuItem
                key={option.id}
                aria-current={active ? "true" : undefined}
                onClick={() => onChange(option.id)}
                className={cn(active && "bg-pln-ice text-pln-navy")}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-1.5 shrink-0 rounded-full", active ? "bg-pln-cyan" : "bg-transparent")}
                />
                <Icon className="size-4 shrink-0 text-pln-navy" />
                <div className="min-w-0 flex-1">
                  <div className="leading-tight">{option.label}</div>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          {DRAFT_VIEW_OPTIONS.slice(4).map((option) => {
            const Icon = VIEW_ICONS[option.id];
            const active = option.id === value;
            return (
              <DropdownMenuItem
                key={option.id}
                aria-current={active ? "true" : undefined}
                onClick={() => onChange(option.id)}
                className={cn(active && "bg-pln-ice text-pln-navy")}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-1.5 shrink-0 rounded-full", active ? "bg-pln-cyan" : "bg-transparent")}
                />
                <Icon className="size-4 shrink-0 text-pln-navy" />
                <div className="min-w-0 flex-1">
                  <div className="leading-tight">{option.label}</div>
                  <div className="truncate text-[11px] font-normal text-zinc-500">{option.description}</div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
