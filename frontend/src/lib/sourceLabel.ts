const LABELS: Record<string, string> = {
  tcp_push: "TCP push",
  tcp_pull: "TCP pull",
  http_fallback: "HTTP",
};

export function formatSourceLabel(key: string): string {
  return LABELS[key] ?? key;
}
