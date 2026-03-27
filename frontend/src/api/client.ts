function baseUrl(): string {
  const b = import.meta.env.VITE_API_BASE ?? "";
  return b.replace(/\/$/, "");
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
