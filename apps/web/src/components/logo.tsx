export function Logo({ size = 36, light = false }: { size?: number; light?: boolean }) {
  const stroke = light ? "#F8FAFC" : "#17345F";
  const node = light ? "#7CC8D4" : "#1F7A8C";
  const nodes: Array<[number, number, number]> = [
    [32, 8, 4.5],
    [12, 20, 3.8],
    [52, 20, 3.8],
    [4, 38, 3.5],
    [20, 38, 3.5],
    [44, 38, 3.5],
    [60, 38, 3.5],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M12 20L32 8L52 20M12 20H52M32 8V54M21 54H43M12 20L4 38H20ZM52 20L44 38H60Z"
        stroke={stroke}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {nodes.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={node} />
      ))}
    </svg>
  );
}
