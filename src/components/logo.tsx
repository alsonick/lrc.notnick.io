import type { ComponentProps } from "react";

/**
 * The app mark: a green tile with a lyric list and the current-line dot.
 * Same artwork as the favicon in `src/app/icon.svg`.
 */
export function Logo(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      aria-hidden
      {...props}
    >
      <rect width="64" height="64" rx="14" fill="#30d158" />
      <rect
        x="22"
        y="17"
        width="26"
        height="7"
        rx="3.5"
        fill="#fff"
        fillOpacity="0.9"
      />
      <circle cx="15" cy="32" r="4" fill="#fff" />
      <rect x="22" y="28.5" width="18" height="7" rx="3.5" fill="#fff" />
      <rect
        x="22"
        y="40"
        width="23"
        height="7"
        rx="3.5"
        fill="#fff"
        fillOpacity="0.9"
      />
    </svg>
  );
}
