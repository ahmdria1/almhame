"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return twMerge(clsx(parts));
}

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-navy-700 text-white hover:bg-navy-800",
        secondary: "border border-ink-200 bg-white text-navy-700 hover:bg-ink-100 dark:border-white/10 dark:bg-navy-800 dark:text-white",
        ghost: "text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-white/5",
        danger: "bg-danger text-white",
      },
      size: {
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        sm: "h-9 px-3 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-12 w-full rounded-xl border border-ink-200 bg-white px-3 text-base outline-none focus:border-teal-600 dark:border-white/10 dark:bg-navy-900",
        props.className,
      )}
    />
  );
}

export function Modal({
  open,
  title,
  body,
  action,
  onClose,
  testId,
}: {
  open: boolean;
  title: string;
  body: string;
  action?: React.ReactNode;
  onClose: () => void;
  testId?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-900/40" />
        <Dialog.Content
          data-testid={testId}
          className="paper fixed left-1/2 top-1/2 z-50 w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 shadow-card"
        >
          <Dialog.Title className="text-xl font-semibold leading-8 text-navy-700 dark:text-white">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-7 text-ink-500">{body}</Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">{action}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
