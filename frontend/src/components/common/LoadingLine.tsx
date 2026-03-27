type Props = { label?: string };

export function LoadingLine({ label = "Loading…" }: Props) {
  return <p className="muted">{label}</p>;
}
