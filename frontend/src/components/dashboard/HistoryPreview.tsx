import type { HistoryPoint } from "../../types/api.ts";

type Props = {
  points: HistoryPoint[];
  bucketSeconds: number;
};

export function HistoryPreview({ points, bucketSeconds }: Props) {
  const tail = points.slice(-12).reverse();

  if (tail.length === 0) {
    return (
      <section className="panel">
        <h2>Recent power (bucketed)</h2>
        <p className="muted">No history points in this window.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Recent power (~{bucketSeconds}s buckets)</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bucket start (UTC)</th>
              <th>Avg W</th>
              <th>Max W</th>
              <th>Samples</th>
            </tr>
          </thead>
          <tbody>
            {tail.map((p) => (
              <tr key={p.bucket_start}>
                <td>{new Date(p.bucket_start * 1000).toISOString()}</td>
                <td>{p.power_w_avg.toFixed(1)}</td>
                <td>{p.power_w_max.toFixed(1)}</td>
                <td>{p.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
