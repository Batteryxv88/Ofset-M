const SIZE = 120;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  progress: number; // 0–1
  done: number;
  plan: number;
  loading?: boolean;
};

function getColor(progress: number) {
  if (progress >= 1) return '#4caf50';
  if (progress >= 0.7) return '#ff9800';
  return '#f44336';
}

const RingProgress = ({ progress, done, plan, loading = false }: Props) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = CIRCUMFERENCE * (1 - clamped);
  const color = getColor(clamped);
  const pct = loading ? '…' : `${Math.round(clamped * 100)}%`;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ display: 'block', margin: '0 auto' }}
    >
      {/* track */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={STROKE}
      />
      {/* progress arc */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={loading ? CIRCUMFERENCE : offset}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
      />
      {/* percent */}
      <text
        x="50%"
        y="46%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill={color}
        style={{ transition: 'fill 0.4s ease' }}
      >
        {pct}
      </text>
      {/* done / plan */}
      <text
        x="50%"
        y="68%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="10"
        fill="rgba(255,255,255,0.45)"
      >
        {loading ? '…' : `${done} / ${plan}`}
      </text>
    </svg>
  );
};

export default RingProgress;
