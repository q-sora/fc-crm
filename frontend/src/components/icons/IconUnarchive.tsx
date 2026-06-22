export default function IconUnarchive({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <polyline points="10 13 12 11 14 13" />
      <line x1="12" y1="11" x2="12" y2="17" />
    </svg>
  )
}
