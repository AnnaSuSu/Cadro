import type { ComponentProps, SVGProps } from "react";

export function CadroMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect
        x="2.75"
        y="2.75"
        width="18.5"
        height="18.5"
        rx="5.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M14.75 8.5H10.5C9.39543 8.5 8.5 9.39543 8.5 10.5V13.5C8.5 14.6046 9.39543 15.5 10.5 15.5H14.75"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15.25" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function CadroWordmark({ className, ...props }: ComponentProps<"span">) {
  return (
    <span className={`font-semibold tracking-tight ${className ?? ""}`} {...props}>
      Cadro
    </span>
  );
}
