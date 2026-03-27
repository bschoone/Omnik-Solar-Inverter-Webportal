/** Parse Omnik js/status.js (webData CSV + simple var assignments). */

export type StatusSnapshot = {
  serial: string | null;
  model: string | null;
  firmware_main: string | null;
  firmware_slave: string | null;
  rated_power_w: number | null;
  power_w: number | null;
  energy_today_kwh: number | null;
  energy_total_kwh: number | null;
  alarm_raw: string | null;
  version: string | null;
  m2m_mid: string | null;
  wan_ip: string | null;
  wlan_mac: string | null;
  rssi: string | null;
};

function varString(text: string, name: string): string | null {
  const m = new RegExp(`var\\s+${name}\\s*=\\s*"([^"]*)"`, "m").exec(text);
  return m ? m[1]! : null;
}

function toInt(s: string): number | null {
  const t = s.trim();
  if (!t || !/^\d+$/.test(t)) return null;
  return parseInt(t, 10);
}

export function parseStatusJs(text: string): StatusSnapshot | null {
  const m = /var\s+webData\s*=\s*"([\s\S]*?)"\s*;/.exec(text);
  if (!m) return null;
  const rawCsv = m[1]!.replace(/\r/g, "").trim();
  const parts = rawCsv.split(",");
  if (parts.length < 8) return null;

  const p = (i: number) => (i < parts.length ? parts[i]!.trim() : "");

  const rated = toInt(p(4));
  const power = toInt(p(5));
  const todayRaw = toInt(p(6));
  const totalRaw = toInt(p(7));
  const energyToday = todayRaw !== null ? todayRaw / 100.0 : null;
  const energyTotal = totalRaw !== null ? totalRaw / 10.0 : null;
  const alarm = parts.length > 8 ? p(8) : "";

  return {
    serial: p(0) || null,
    firmware_main: p(1) || null,
    firmware_slave: p(2) || null,
    model: p(3) || null,
    rated_power_w: rated,
    power_w: power,
    energy_today_kwh: energyToday,
    energy_total_kwh: energyTotal,
    alarm_raw: alarm || null,
    version: varString(text, "version"),
    m2m_mid: varString(text, "m2mMid"),
    wan_ip: varString(text, "wanIp"),
    wlan_mac: varString(text, "wlanMac"),
    rssi: varString(text, "m2mRssi"),
  };
}

export function snapshotToRow(s: StatusSnapshot): Record<string, unknown> {
  return {
    serial: s.serial,
    model: s.model,
    firmware_main: s.firmware_main,
    firmware_slave: s.firmware_slave,
    rated_power_w: s.rated_power_w,
    power_w: s.power_w,
    energy_today_kwh: s.energy_today_kwh,
    energy_total_kwh: s.energy_total_kwh,
    alarm_raw: s.alarm_raw,
    version: s.version,
    m2m_mid: s.m2m_mid,
    wan_ip: s.wan_ip,
    wlan_mac: s.wlan_mac,
    rssi: s.rssi,
  };
}
