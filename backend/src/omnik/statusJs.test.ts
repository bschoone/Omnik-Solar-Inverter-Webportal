import { describe, expect, it } from "vitest";
import { parseStatusJs } from "./statusJs.js";

const FIXTURE = `var version="H4.01.38Y1.0.08W1.0.07";var m2mMid="1604854761";var webData="SN123,fw1,fw2,modelX,3000,106,61,475406,,2,";`;

describe("parseStatusJs", () => {
  it("returns null without webData", () => {
    expect(parseStatusJs("var foo=1;")).toBeNull();
  });

  it("parses webData csv and vars", () => {
    const s = parseStatusJs(FIXTURE);
    expect(s).not.toBeNull();
    expect(s!.serial).toBe("SN123");
    expect(s!.rated_power_w).toBe(3000);
    expect(s!.power_w).toBe(106);
    expect(s!.energy_today_kwh).toBeCloseTo(0.61);
    expect(s!.energy_total_kwh).toBeCloseTo(47540.6);
    expect(s!.version).toBe("H4.01.38Y1.0.08W1.0.07");
    expect(s!.m2m_mid).toBe("1604854761");
  });
});
