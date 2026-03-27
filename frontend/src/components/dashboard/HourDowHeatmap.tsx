import { Fragment } from "react";
import type { DashboardHourlyCell } from "../../types/api.ts";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type Props = {
  cells: DashboardHourlyCell[];
};

export function HourDowHeatmap({ cells }: Props) {
  const map = new Map<string, DashboardHourlyCell>();
  for (const c of cells) {
    map.set(`${c.dow}-${c.hour}`, c);
  }

  let min = Infinity;
  let max = -Infinity;
  for (const c of cells) {
    if (c.avg_power_w < min) min = c.avg_power_w;
    if (c.avg_power_w > max) max = c.avg_power_w;
  }
  const hasScale = Number.isFinite(min) && Number.isFinite(max) && max > min;

  if (cells.length === 0) {
    return (
      <section className="panel chart-panel">
        <h2>Avg power by weekday and hour</h2>
        <p className="muted">No samples in this range.</p>
      </section>
    );
  }

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <section className="panel chart-panel">
      <h2>Avg power by weekday and hour (UTC)</h2>
      <p className="muted chart-footnote">Darker green = higher average W in that slot.</p>
      <div className="heatmap-scroll">
        <div
          className="heatmap-grid"
          style={{
            display: "grid",
            gridTemplateColumns: `72px repeat(24, minmax(14px, 1fr))`,
            gap: "2px",
          }}
        >
          <div className="heatmap-corner" />
          {hours.map((h) => (
            <div key={`ch-${h}`} className="heatmap-col-head muted">
              {h}
            </div>
          ))}
          {DOW_LABELS.map((label, dow) => (
            <Fragment key={label}>
              <div className="heatmap-row-label muted">{label}</div>
              {hours.map((hour) => {
                const cell = map.get(`${dow}-${hour}`);
                const v = cell?.avg_power_w ?? null;
                const title = cell
                  ? `${label} ${hour}:00 UTC · avg ${v!.toFixed(0)} W · n=${cell.n}`
                  : `${label} ${hour}:00 UTC · no data`;
                return (
                  <div
                    key={`${dow}-${hour}`}
                    className="heatmap-cell"
                    title={title}
                    style={{
                      background: cellColor(v, hasScale ? min : 0, hasScale ? max : 1),
                    }}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function cellColor(value: number | null, min: number, max: number): string {
  if (value == null) return "rgba(48, 54, 61, 0.6)";
  if (max <= min) return "rgba(63, 185, 80, 0.4)";
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const alpha = 0.2 + t * 0.75;
  return `rgba(63, 185, 80, ${alpha})`;
}
