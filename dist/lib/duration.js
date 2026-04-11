"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLayerOpenDuration = parseLayerOpenDuration;
const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;
/**
 * Parses how long a layer has already been open (in-game), from compact strings such as
 * `1d2h39m`, `18h30m`, `39m`, or shorthand `5h20` meaning 5 hours and 20 minutes.
 */
function parseLayerOpenDuration(input) {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed)
        return null;
    const hmShort = trimmed.match(/^(\d+)\s*h\s*([0-5]?\d)\s*$/);
    if (hmShort) {
        const h = Number(hmShort[1]);
        const mins = Number(hmShort[2]);
        if (!Number.isFinite(h) ||
            !Number.isFinite(mins) ||
            h < 0 ||
            mins < 0 ||
            mins >= 60) {
            return null;
        }
        const total = h * MS_HOUR + mins * MS_MIN;
        return total > 0 ? total : null;
    }
    const compact = trimmed.replace(/\s+/g, "");
    if (!/^(\d+[dhm])+$/i.test(compact))
        return null;
    let total = 0;
    const re = /(\d+)([dhm])/gi;
    let m;
    while ((m = re.exec(compact)) !== null) {
        const n = Number(m[1]);
        const u = m[2].toLowerCase();
        if (!Number.isFinite(n) || n < 0)
            return null;
        if (u === "d")
            total += n * MS_DAY;
        else if (u === "h")
            total += n * MS_HOUR;
        else if (u === "m")
            total += n * MS_MIN;
    }
    return total > 0 ? total : null;
}
