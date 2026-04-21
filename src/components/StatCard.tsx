interface Props {
  label: string;
  value: string;
  color?: string;
}

export default function StatCard({ label, value, color }: Props) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2"
      style={{ background: '#181c2a', border: '1px solid #1e2130' }}
    >
      <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#4b5563' }}>
        {label}
      </span>
      <span className="text-lg font-semibold" style={{ color: color ?? '#e2e8f0' }}>
        {value}
      </span>
    </div>
  );
}
