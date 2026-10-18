// Mock Looker export: one row per agent per past shift (every day before today).
const { CURRENT_TIME } = require("../config");
const { workofoSchedule } = require("./workofoExport");
const { toDateString } = require("../services/shiftService");
const { createRandom } = require("../utils/random");

const random = createRandom(4112026);

function between(min, max) {
    return min + random() * (max - min);
}

const today = toDateString(CURRENT_TIME);

const lookerExport = workofoSchedule
    .filter(shift => shift.date < today)
    .map(shift => ({
        date: shift.date,
        agentId: shift.agentId,
        workflowRate: Math.round(between(5, 12) * 100) / 100,
        chatBreaches: Math.floor(random() ** 2 * 4),
        csat: Math.round(between(78, 99)),
        resolutionRate: Math.round(between(70, 98)),
        avgChatHandleTime: Math.round(between(3, 60))
    }));

module.exports = { lookerExport };