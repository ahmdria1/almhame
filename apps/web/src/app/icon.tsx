import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#17345F", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 14, height: 14, borderRadius: 7, background: "#1F7A8C" }} />
      </div>
    ),
    { ...size },
  );
}
