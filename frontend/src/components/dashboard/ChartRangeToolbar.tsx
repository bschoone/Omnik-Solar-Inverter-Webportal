import { DAY_PRESETS, MAX_CHART_DAYS, type DayPreset } from "../../lib/chartRange.ts";

type Props = {
  days: DayPreset;
  onDaysChange: (days: DayPreset) => void;
  bucketSeconds: number;
};

export function ChartRangeToolbar({ days, onDaysChange, bucketSeconds }: Props) {
  return (
    <div className="chart-range-toolbar">
      <span className="chart-range-label muted">Range</span>
      <div className="chart-range-presets" role="group" aria-label="Chart time range">
        {DAY_PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            className={`chart-range-btn ${days === d ? "active" : ""}`}
            onClick={() => onDaysChange(d)}
          >
            {d}d
          </button>
        ))}
      </div>
      <span className="muted chart-range-meta">
        ≤{MAX_CHART_DAYS}d · bucket {bucketSeconds}s
      </span>
    </div>
  );
}
