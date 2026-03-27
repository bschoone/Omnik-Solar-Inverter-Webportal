type Props = {
  ok: boolean | undefined;
  pending: boolean;
};

export function ApiStatusPill({ ok, pending }: Props) {
  if (pending) {
    return <span className="pill pill-pending">API …</span>;
  }
  if (ok === true) {
    return <span className="pill pill-ok">API ok</span>;
  }
  if (ok === false) {
    return <span className="pill pill-bad">API down</span>;
  }
  return <span className="pill pill-pending">API</span>;
}
