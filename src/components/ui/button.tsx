import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui Button, adapted to native buttons and the VizeLens palette.
const buttonVariants = cva(
  "inline-flex min-w-11 max-w-full items-center justify-center gap-2 whitespace-normal rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:border-border disabled:bg-muted disabled:text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-accent active:bg-primary",
        outline:
          "border border-border bg-white text-foreground hover:bg-muted active:border-accent",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground active:text-accent",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-11 px-3 py-2 text-xs",
        icon: "size-11 shrink-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
export { Button, buttonVariants };
