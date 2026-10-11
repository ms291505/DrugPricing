import { describe, expect, it } from "vitest";
import { dateTicks, fittedPriceAxis, formatPrice, niceStep, priceTickFormatter, zeroBasedAxis } from "./chartScale";
import { MAX_AXIS_EXAGGERATION } from "./constants";

const day = (iso: string) => Date.parse(iso);
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const span = ({ domain: [lo, hi] }: { domain: [number, number] }) => hi - lo;

describe("niceStep", () => {
  it("rounds to 1, 2, 2.5 or 5 times a power of ten", () => {
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(170)).toBe(200);
    expect(niceStep(240)).toBe(250);
    expect(niceStep(3.1)).toBe(5);
    expect(niceStep(0.031)).toBeCloseTo(0.05);
  });
});

describe("fittedPriceAxis", () => {
  it("never exaggerates a change more than MAX_AXIS_EXAGGERATION times", () => {
    // Exaggeration of a change near the top price = max / span; it must be at most the cap.
    for (const max of [0.05, 0.9, 9.69, 120, 3412, 51000]) {
      for (const spread of [0, 0.001, 0.01, 0.05, 0.1, 0.3]) {
        const axis = fittedPriceAxis(max * (1 - spread), max);
        expect(max / span(axis), `max ${max}, spread ${spread}`).toBeLessThanOrEqual(MAX_AXIS_EXAGGERATION + 1e-9);
        expect(axis.domain[0]).toBeGreaterThanOrEqual(0);
        expect(axis.domain[0]).toBeLessThanOrEqual(max * (1 - spread));
        expect(axis.domain[1]).toBeGreaterThanOrEqual(max);
      }
    }
  });

  it("shows humira's ~10% rise at about 40% of the height, not flat and not full", () => {
    const axis = fittedPriceAxis(3105, 3412);
    expect(axis.domain[0]).toBeGreaterThan(0);
    const share = (3412 - 3105) / span(axis);
    expect(share).toBeGreaterThan(0.3);
    expect(share).toBeLessThanOrEqual(0.4);
  });

  it("keeps a 1% wobble small", () => {
    const axis = fittedPriceAxis(9.6, 9.7);
    expect((9.7 - 9.6) / span(axis)).toBeLessThanOrEqual(0.05);
  });

  it("uses a wide range as it is, such as a 43% drop", () => {
    const axis = fittedPriceAxis(5.52, 9.69);
    expect(axis.domain[0]).toBeLessThanOrEqual(5.52);
    expect(axis.domain[1]).toBeGreaterThanOrEqual(9.69);
    expect((9.69 - 5.52) / span(axis)).toBeGreaterThan(0.6);
  });

  it("starts at $0 when the minimum span would reach it", () => {
    expect(fittedPriceAxis(0.01, 0.15).domain[0]).toBe(0);
    expect(fittedPriceAxis(0, 0).domain).toEqual([0, 1]);
  });

  it("puts ticks on the domain ends and an even step", () => {
    const { domain, ticks } = fittedPriceAxis(3105, 3412);
    expect(ticks[0]).toBe(domain[0]);
    expect(ticks[ticks.length - 1]).toBe(domain[1]);
    const steps = new Set(ticks.slice(1).map((tick, i) => Math.round((tick - ticks[i]) * 1e6)));
    expect(steps.size).toBe(1);
  });
});

describe("zeroBasedAxis", () => {
  it("starts at 0 and reaches past the maximum on a round step", () => {
    expect(zeroBasedAxis(3412)).toEqual({ domain: [0, 4000], ticks: [0, 1000, 2000, 3000, 4000] });
  });
});

describe("tick and price formats", () => {
  it("uses thousands with just enough decimals for the step", () => {
    expect(priceTickFormatter([3000, 3250, 3500])(3250)).toBe("$3.25K");
    expect(priceTickFormatter([3000, 3500, 4000])(3500)).toBe("$3.5K");
    expect(priceTickFormatter([0, 2000, 4000])(0)).toBe("$0");
  });

  it("shows cents when the step is under a dollar", () => {
    expect(priceTickFormatter([9, 9.5, 10])(9.5)).toBe("$9.50");
    expect(priceTickFormatter([0.13, 0.135, 0.14])(0.135)).toBe("$0.135");
    expect(priceTickFormatter([0, 5, 10])(5)).toBe("$5");
    expect(priceTickFormatter([0, 2.5, 5, 7.5, 10])(7.5)).toBe("$7.50");
  });

  it("keeps sub-dollar prices readable in full", () => {
    expect(formatPrice(3412.18)).toBe("$3,412.18");
    expect(formatPrice(0.0123)).toBe("$0.0123");
    expect(formatPrice(9.6896)).toBe("$9.69");
  });
});

describe("dateTicks", () => {
  it("puts ticks on month starts with a stride that fits", () => {
    const { ticks, format } = dateTicks(day("2022-01-05"), day("2026-10-07"), 7);
    expect(ticks.length).toBeLessThanOrEqual(7);
    expect(ticks.every(tick => iso(tick).endsWith("-01"))).toBe(true);
    expect(format(ticks[0])).toMatch(/^\d{4}$/);
  });

  it("labels months with a short year on shorter spans", () => {
    const { ticks, format } = dateTicks(day("2025-10-07"), day("2026-04-14"), 7);
    expect(iso(ticks[0])).toBe("2025-11-01");
    expect(format(ticks[0])).toBe("Nov '25");
  });

  it("uses weeks for short spans", () => {
    const { ticks, format } = dateTicks(day("2026-01-06"), day("2026-02-10"), 7);
    expect(ticks.length).toBeLessThanOrEqual(7);
    expect(format(ticks[0])).toBe("Jan 6");
  });
});
