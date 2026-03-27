type Row = { label: string; value: string };

type Props = { rows: Row[] };

export function MetricGrid({ rows }: Props) {
  return (
    <dl className="metric-grid">
      {rows.map(({ label, value }) => (
        <div key={label} className="metric-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
