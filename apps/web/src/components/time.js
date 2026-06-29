const PERIODS = ["AM", "PM"];

export function readTime(value, fallbackPeriod = "", options = {}) {
    const prefer24Hour = options.prefer24Hour === true;
    const rawValue = String(value || "").trim();
    const periodMatch = rawValue.match(/\s*(am|pm)\s*$/i);
    const period = periodMatch?.[1]?.toUpperCase() || fallbackPeriod;
    const rawTime = rawValue.replace(/\s*(am|pm)\s*$/i, "").trim();
    const hasColon = rawTime.includes(":");
    const digits = rawTime.replace(/\D/g, "");
    const match = rawTime.match(/^(\d{1,2})(?::(\d{1,2}))?$/);

    if (!digits) return null;

    const hourValue = hasColon || digits.length <= 2 ? match?.[1] : digits.slice(0, -2);
    const minuteValue = hasColon ? match?.[2] ?? "0" : digits.length <= 2 ? "0" : digits.slice(-2);
    const rawHour = Math.max(Number(hourValue), 0);
    const minute = Math.min(Math.max(Number(minuteValue), 0), 59);
    const hasExplicitPeriod = Boolean(periodMatch);
    const hasPeriodContext = hasExplicitPeriod || (!prefer24Hour && PERIODS.includes(period) && rawHour > 0 && rawHour <= 12);
    const hour12 = Math.min(Math.max(rawHour || 12, 1), 12);
    const isPm = period === "PM";
    let hour24 = Math.min(rawHour, 23);

    if (hasPeriodContext) {
        hour24 = hour12;

        if (isPm && hour12 !== 12) {
            hour24 = hour12 + 12;
        } else if (!isPm && hour12 === 12) {
            hour24 = 0;
        }
    }

    const displayHour12 = hour24 % 12 || 12;

    return {
        time12: `${String(displayHour12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        time24: `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        period: hasPeriodContext ? period : hour24 >= 12 ? "PM" : "AM",
    };
}

export function normalizeTimeInput(value, fallbackPeriod = "AM", timeFormat = "12h") {
    const is24Hour = timeFormat === "24h";
    const parsed = readTime(value, is24Hour ? "" : fallbackPeriod, { prefer24Hour: is24Hour });
    if (!parsed) return { time: String(value || "").trim(), period: fallbackPeriod };

    return {
        time: is24Hour ? parsed.time24 : parsed.time12,
        period: is24Hour ? "" : parsed.period,
    };
}
