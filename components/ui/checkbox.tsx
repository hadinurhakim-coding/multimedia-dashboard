"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, indeterminate, ...props }: CheckboxPrimitive.Root.Props) {
  return <CheckboxPrimitive.Root data-slot="checkbox" indeterminate={indeterminate} className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded border border-input bg-background shadow-xs outline-none transition-colors data-checked:border-pln-navy data-checked:bg-pln-navy data-checked:text-white data-indeterminate:border-pln-navy data-indeterminate:bg-pln-navy data-indeterminate:text-white focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:opacity-50", className)} {...props}>
    <CheckboxPrimitive.Indicator>{indeterminate ? <Minus className="size-3" /> : <Check className="size-3" />}</CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>;
}
