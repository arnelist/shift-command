// Mock Workofo export for the day team (agents 16–27): every weekday in November,
// 06:30–15:00 or 09:00–17:30, with random days off. 

const { createRandom } = require("../utils/random");
const { toDateString} = require("../services/shiftService");

const DAY_TEAM_IDS = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
const DAY_SHIFTS = [
    { startTime: "06:30", endTime: "15:00" },
    { startTime: "09:00", endTime: "17:30" }
];

const DAY_OFF_CHANCE = 0.2;

const random = createRandom(123);

function getNovemberWeekdays() {
    const dates = [];

    for (let day = 1; day <= 30; day++) {
        const date = new Date(2026, 10, day);
        const weekday = date.getDay();

        if (weekday !== 0 && weekday !== 6) dates.push(toDateString(date));
    }
    return dates;
}

const dayTeamSchedule = [];

getNovemberWeekdays().forEach(date => {
    DAY_TEAM_IDS.forEach(agentId => {
        if (random() < DAY_OFF_CHANCE) return;

        const shift = random() < 0.5 ? DAY_SHIFTS[0] : DAY_SHIFTS[1];
        dayTeamSchedule.push({ agentId, date, ...shift });
    });
});

module.exports = { dayTeamSchedule };