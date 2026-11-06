import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0B1E3B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="120" height="120" viewBox="0 0 64 64">
          <path d="M12 20L32 8L52 20M12 20H52M32 8V54M21 54H43M12 20L4 38H20ZM52 20L44 38H60Z" stroke="#F6F8FB" strokeWidth="3.5" fill="none" />
          <circle cx="32" cy="8" r="4.5" fill="#7CC8D4" />
          <circle cx="12" cy="20" r="3.8" fill="#7CC8D4" />
          <circle cx="52" cy="20" r="3.8" fill="#7CC8D4" />
          <circle cx="4" cy="38" r="3.5" fill="#7CC8D4" />
          <circle cx="20" cy="38" r="3.5" fill="#7CC8D4" />
          <circle cx="44" cy="38" r="3.5" fill="#7CC8D4" />
          <circle cx="60" cy="38" r="3.5" fill="#7CC8D4" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
