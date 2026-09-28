import { tv } from "tailwind-variants";

export const buttonVariants = tv({
  base: "group inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 text-button active:scale-[0.95] border-2 border-transparent",
  variants: {
    variant: {
      primary:
        "text-background bg-primary hover:bg-primary-300 focus-visible:ring-primary-300",
      secondary:
        "text-background bg-secondary hover:bg-secondary-400 focus-visible:ring-secondary-500",
      ghost:
        "text-foreground hover:bg-tint-background/10 focus-visible:ring-gray-500 backdrop-blur-xs",
      outline:
        "text-foreground border-secondary/30 hover:bg-tint-background/3 hover:border-secondary/75  focus-visible:ring-secondary backdrop-blur-xs",
      danger:
        "text-danger-light bg-danger hover:bg-danger-light focus-visible:ring-danger hover:text-danger",
      success:
        "text-success-dark bg-success hover:bg-success-lighter focus-visible:ring-success hover:text-success-dark",
      warning:
        "text-warning-light bg-warning hover:bg-warning-lighter focus-visible:ring-warning hover:text-warning-light",
      featured:
        "relative overflow-hidden text-white bg-violet-600 hover:bg-violet-500 focus-visible:ring-violet-500 backdrop-blur-sm",
      "secondary-inverted":
        "border-background bg-background text-secondary hover:bg-background-lighter hover:text-secondary-400 focus-visible:ring-secondary backdrop-blur-xs",
      disabled: "opacity-50 cursor-default",
    },
    intent: {
      button: "px-5 py-2.5",
      cta: "px-8 py-3 text-lg",
      compact: "px-3 py-1.5 text-sm leading-none",
      icon: "p-3",
      "icon-inline": "",
    },
    radius: {
      pill: "rounded-full",
      sharp: "rounded-none",
      squircle: "rounded-2xl corner-shape-squircle",
      rounded: "rounded-lg",
    },
    behavior: {
      button: "",
      toggle: "data-[state=on]:bg-secondary data-[state=on]:text-background",
    },
  },
  defaultVariants: {
    variant: "primary",
    intent: "button",
    radius: "squircle",
    behavior: "button",
  },
});

export type ButtonVariantProps = Parameters<typeof buttonVariants>[0];
