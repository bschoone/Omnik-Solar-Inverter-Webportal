import { describe, expect, it } from "vitest";
import { MESSAGE_START, MESSAGE_END, packInformationRequest, parseInformationReply } from "./binary.js";

describe("packInformationRequest", () => {
  it("starts with 0x68 and ends with 0x16", () => {
    const p = packInformationRequest(0x12345678);
    expect(p[0]).toBe(MESSAGE_START);
    expect(p[p.length - 1]).toBe(MESSAGE_END);
  });

  it("embeds serial little-endian twice", () => {
    const p = packInformationRequest(0x00abcdef);
    const i = p.indexOf(0x68);
    expect(i).toBe(0);
    // After leader: len, sep, type, then 8 bytes serial (4+4 LE)
    expect(p.readUInt32LE(4)).toBe(0x00abcdef);
    expect(p.readUInt32LE(8)).toBe(0x00abcdef);
  });
});

describe("parseInformationReply", () => {
  it("returns null for short buffer", () => {
    expect(parseInformationReply(Buffer.alloc(10))).toBeNull();
  });

  it("parses synthetic frame from first 0x68", () => {
    const buf = Buffer.alloc(80);
    buf.writeUInt8(MESSAGE_START, 0);
    buf.writeUInt32LE(424242, 4);
    buf.writeUInt32LE(424242, 8);
    buf.write("SERIALTESTSTRING", 15, "utf8");
    buf.writeInt16BE(2500, 59);
    buf.writeInt16BE(1234, 69);
    buf.writeInt32BE(98765, 71);
    buf.writeUInt8(0xaa, 78);
    buf.writeUInt8(MESSAGE_END, 79);

    const row = parseInformationReply(buf);
    expect(row).not.toBeNull();
    expect(row!.power_w).toBe(2500);
    expect(row!.energy_today_kwh).toBeCloseTo(12.34);
    expect(row!.energy_total_kwh).toBeCloseTo(9876.5);
    expect(row!.serial).toContain("SERIAL");
    expect(row!.m2m_mid).toBe("424242");
  });
});
