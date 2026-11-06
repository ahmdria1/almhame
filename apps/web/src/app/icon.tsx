import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0B1E3B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="24" height="24" viewBox="0 0 64 64">
          <path d="M12 20L32 8L52 20M12 20H52M32 8V54M21 54H43M12 20L4 38H20ZM52 20L44 38H60Z" stroke="#F6F8FB" strokeWidth="4" fill="none" />
          <circle cx="32" cy="8" r="4" fill="#1F7A8C" />
          <circle cx="12" cy="20" r="3.5" fill="#1F7A8C" />
          <circle cx="52" cy="20" r="3.5" fill="#1F7A8C" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
