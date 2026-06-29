import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTimeInput, readTime } from "../time.js";

test("24-hour noon stays noon even with stale AM period context", () => {
    const parsed = readTime("12:00", "AM", { prefer24Hour: true });

    assert.ok(parsed);
    assert.equal(parsed.time24, "12:00");
    assert.equal(parsed.period, "PM");
});

test("24-hour normalization keeps 12 as 12:00", () => {
    assert.deepEqual(normalizeTimeInput("12", "AM", "24h"), {
        time: "12:00",
        period: "",
    });
});

test("12-hour normalization still maps 12 AM to midnight", () => {
    assert.deepEqual(normalizeTimeInput("12:00", "AM", "12h"), {
        time: "12:00",
        period: "AM",
    });
});
