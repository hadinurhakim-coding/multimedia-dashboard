"use client";

import * as React from "react";

interface CollapsibleContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextType>({
  open: true,
  onOpenChange: () => {},
});

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  asChild?: boolean;
}

export function Collapsible({
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  children,
  className,
  ...props
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div
        data-state={open ? "open" : "closed"}
        className={className}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function CollapsibleTrigger({
  children,
  onClick,
  ...props
}: CollapsibleTriggerProps) {
  const { open, onOpenChange } = React.useContext(CollapsibleContext);

  return (
    <button
      type="button"
      data-state={open ? "open" : "closed"}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(!open);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function CollapsibleContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = React.useContext(CollapsibleContext);

  if (!open) return null;

  return (
    <div
      data-state={open ? "open" : "closed"}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
