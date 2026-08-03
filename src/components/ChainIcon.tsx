"use client";

import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

function Base({ children, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" fill="#0e0e0e" />
      {children}
    </svg>
  );
}

/** Xerox sticker glyph — ink square + cream mark */
export function ChainIcon({
  id,
  className = "h-8 w-8",
}: {
  id: string;
  className?: string;
}) {
  switch (id) {
    case "ethereum":
      return (
        <Base className={className}>
          <path d="M16 5.5L15.7 6.5V20.1L16 20.4L22.5 16.6L16 5.5Z" fill="#c8ff00" fillOpacity=".85" />
          <path d="M16 5.5L9.5 16.6L16 20.4V5.5Z" fill="#c8ff00" />
          <path d="M16 21.7L15.8 21.9V26.1L16 26.5L22.5 17.9L16 21.7Z" fill="#c8ff00" fillOpacity=".85" />
          <path d="M16 26.5V21.7L9.5 17.9L16 26.5Z" fill="#c8ff00" />
        </Base>
      );
    case "bnb":
      return (
        <Base className={className}>
          <path
            d="M16 7.2L18.6 9.8L12.2 16.2L9.6 13.6L16 7.2ZM22.4 13.6L19.8 11L16 14.8L12.2 11L9.6 13.6L16 20L22.4 13.6ZM16 21.8L18.6 19.2L22.4 23L19.8 25.6L16 21.8ZM9.6 23L13.4 19.2L16 21.8L12.2 25.6L9.6 23ZM19.8 11L22.4 8.4L25 11L22.4 13.6L19.8 11ZM7 11L9.6 8.4L12.2 11L9.6 13.6L7 11Z"
            fill="#c8ff00"
          />
        </Base>
      );
    case "polygon":
      return (
        <Base className={className}>
          <path
            d="M21.2 12.2c-.3-.2-.7-.2-1 0l-2.3 1.3-1.6.9-2.3 1.3c-.3.2-.7.2-1 0l-1.8-1c-.3-.2-.5-.5-.5-.9v-2.1c0-.3.2-.7.5-.9l1.8-1c.3-.2.7-.2 1 0l1.8 1c.3.2.5.5.5.9v1.3l1.6-.9v-1.4c0-.3-.2-.7-.5-.9l-3.3-1.9c-.3-.2-.7-.2-1 0l-3.4 1.9c-.3.2-.5.5-.5.9v3.9c0 .3.2.7.5.9l3.4 1.9c.3.2.7.2 1 0l2.3-1.3 1.6-.9 2.3-1.3c.3-.2.7-.2 1 0l1.8 1c.3.2.5.5.5.9v2.1c0 .3-.2.7-.5.9l-1.8 1.1c-.3.2-.7.2-1 0l-1.8-1c-.3-.2-.5-.5-.5-.9v-1.3l-1.6.9v1.4c0 .3.2.7.5.9l3.4 1.9c.3.2.7.2 1 0l3.4-1.9c.3-.2.5-.5.5-.9v-3.9c0-.3-.2-.7-.5-.9l-3.4-2z"
            fill="#ff2d55"
          />
        </Base>
      );
    case "solana":
      return (
        <Base className={className}>
          <path
            d="M9.8 19.8c.1-.1.3-.2.5-.2h12.4c.3 0 .5.4.3.6l-1.5 1.5c-.1.1-.3.2-.5.2H8.6c-.3 0-.5-.4-.3-.6l1.5-1.5zm0-9.1c.1-.1.3-.2.5-.2h12.4c.3 0 .5.4.3.6l-1.5 1.5c-.1.1-.3.2-.5.2H8.6c-.3 0-.5-.4-.3-.6l1.5-1.5zm13.2 4.3c-.1-.1-.3-.2-.5-.2H10.1c-.3 0-.5.4-.3.6l1.5 1.5c.1.1.3.2.5.2h12.4c.3 0 .5-.4.3-.6l-1.5-1.5z"
            fill="#c8ff00"
          />
        </Base>
      );
    case "tron":
      return (
        <Base className={className}>
          <path
            d="M8.5 9.2l15.2 4.2-6.4 9.9-8.8-14.1zm2.4 1.8l5.8 9.2 1.3-7.6-7.1-1.6zm9.2 3.2l-1.1 6.4 4.4-6.8-3.3.4z"
            fill="#ff2d55"
          />
        </Base>
      );
    case "xrpl":
      return (
        <Base className={className}>
          <path
            d="M9.2 9.5c.4-.4 1-.4 1.4 0L16 14.9l5.4-5.4c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4L17.4 16.3l5.4 5.4c.4.4.4 1 0 1.4-.4.4-1 .4-1.4 0L16 17.7l-5.4 5.4c-.4.4-1 .4-1.4 0-.4-.4-.4-1 0-1.4l5.4-5.4-5.4-5.4c-.4-.4-.4-1 0-1.4z"
            fill="#f4f0e6"
          />
        </Base>
      );
    default:
      return (
        <Base className={className}>
          <rect x="8" y="8" width="16" height="16" fill="#c8ff00" />
          <text
            x="16"
            y="19"
            textAnchor="middle"
            fill="#0e0e0e"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="700"
          >
            {id.slice(0, 2).toUpperCase()}
          </text>
        </Base>
      );
  }
}
