/** Omnik / Solarman-style binary frames on port 8899 (push + pull). */

export const MESSAGE_START = 0x68;
export const MESSAGE_END = 0x16;
const MESSAGE_SEND_SEP = 0x40;
const MESSAGE_TYPE_INFORMATION_REQUEST = 0x30;
const MIN_PARSE_LEN = 76;

export function packInformationRequest(serialNumber: number): Buffer {
  const msg = Buffer.from([0x01, 0x00]);
  const requestData = Buffer.concat([
    Buffer.from([msg.length, MESSAGE_SEND_SEP, MESSAGE_TYPE_INFORMATION_REQUEST]),
    Buffer.from(serializeU32Le(serialNumber)),
    Buffer.from(serializeU32Le(serialNumber)),
    msg,
  ]);
  let checksum = 0;
  for (let i = 0; i < requestData.length; i++) checksum = (checksum + requestData[i]!) & 0xff;
  return Buffer.concat([Buffer.from([MESSAGE_START]), requestData, Buffer.from([checksum, MESSAGE_END])]);
}

function serializeU32Le(n: number): Uint8Array {
  const b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, n >>> 0, true);
  return new Uint8Array(b);
}

function frameAfter0x68(data: Buffer): Buffer | null {
  const i = data.indexOf(MESSAGE_START);
  if (i < 0) return null;
  return data.subarray(i);
}

export type InformationRow = {
  serial: string;
  model: string | null;
  firmware_main: string | null;
  firmware_slave: string | null;
  rated_power_w: number | null;
  power_w: number;
  energy_today_kwh: number;
  energy_total_kwh: number;
  alarm_raw: string | null;
  version: string | null;
  m2m_mid: string;
  wan_ip: string | null;
  wlan_mac: string | null;
  rssi: string | null;
};

export function parseInformationReply(data: Buffer): InformationRow | null {
  const buf = frameAfter0x68(data);
  if (!buf || buf.length < MIN_PARSE_LEN) return null;

  const powerRaw = buf.readInt16BE(59);
  const energyTodayRaw = buf.readInt16BE(69);
  const energyTotalRaw = buf.readInt32BE(71);
  const wifiSn = buf.readUInt32LE(4);

  let serial: string | null = null;
  if (buf.length >= 31) {
    const raw = buf.subarray(15, 31).toString("utf8").replace(/\0/g, "").trim();
    if (raw) serial = raw;
  }
  if (serial === null) serial = String(wifiSn);

  let alarmRaw: string | null = null;
  if (buf.length >= 170) {
    const a = buf.subarray(155, 170).toString("utf8").replace(/\0/g, "").trim();
    alarmRaw = a || null;
  }

  return {
    serial,
    model: null,
    firmware_main: null,
    firmware_slave: null,
    rated_power_w: null,
    power_w: Math.max(powerRaw, 0),
    energy_today_kwh: energyTodayRaw / 100.0,
    energy_total_kwh: energyTotalRaw / 10.0,
    alarm_raw: alarmRaw,
    version: null,
    m2m_mid: String(wifiSn),
    wan_ip: null,
    wlan_mac: null,
    rssi: null,
  };
}
