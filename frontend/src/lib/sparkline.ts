export function valuesForSparkline(values: (number | null)[] | undefined): number[] {
  if (!values?.length) return [];
  return values.map((v) => (v != null && Number.isFinite(v) ? v : 0));
}
