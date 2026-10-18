const { toDateString, timeStringToMinutes, BREAK_THRESHOLD_HOURS } = require("./shiftService");

const MIN_AGENTS_PER_SHIFT = 8;
const HANDOVER_TIME = "17:00";
const LUNCH_START = "16:25";
const LUNCH_MINUTES = 30;
const MAX_AGENTS_PER_LUNCH = 2;
const CHAT_PARTS = [
    { name: "1st part", start: "14:55", end: "16:55"},
    { name: "2nd part", start: "16:55", end: "19:55"}, 
    { name: "3rd part", start: "19:55", end: "21:55", excludesAdditionals: true }
];
const ADDITIONAL_TASKS = ["NoSLAs", "JIRAs", "Advanced"];

// Shifts starting before noon are Day (06:30, 09:00), the rest are Evening (13:30, 15:00, 17:00)
function getShiftName(shift) {
    return shift.startTime < "12:00" ? "Day" : "Evening";
}

function getNextWorkDate(schedule, currentTime) {
    const today = toDateString(currentTime);
    const futureDates = schedule.map(shift => shift.date).filter(date => date > today);
    
    return futureDates.length > 0 ? futureDates.sort()[0] : null;
}

function byStartTime(a, b) {
    return a.startTime.localeCompare(b.startTime);
}

function toCoverage(person, role, note) {
    return { agentId: person.agentId, name: person.name, role, note };
}

function pickDayManager(dayPeople) {
    const realSm = dayPeople.find(person => person.role === "SM");
    if (realSm) return [toCoverage(realSm, "SM", "full shift")];

    const tempSm = dayPeople.filter(person => person.tempSMqualified).sort(byStartTime)[0];
    return tempSm ? [toCoverage(tempSm, "Temp-SM", "full shift")] : [];
}
    // Real SM first; then a temp-SM who starts at 13:30 or 15:00.
    // If evening temp-SMs only start at 17:00, someone from Day working until 17:30
    // covers until 17:00 and hands over to the evening temp-SM.

function pickEveningManager(eveningPeople, dayPeople) {
    const realSm = eveningPeople.find(person => person.role === "SM");
    if (realSm) return [toCoverage(realSm, "SM", "full shift")];

    const tempSms = eveningPeople.filter(person => person.tempSMqualified).sort(byStartTime);

    const earlyTempSm = tempSms.find(person => person.startTime < HANDOVER_TIME);
    if (earlyTempSm) return [toCoverage(earlyTempSm, "Temp-SM", "full shift")];

    const coverage = [];

    const dayCover = 
        dayPeople.find(person => person.endTime === "17:30" && person.role === "SM") ||
        dayPeople.find(person => person.endTime === "17:30" && person.tempSMqualified);
    if (dayCover) {
        const role = dayCover.role === "SM" ? "SM" : "Temp-SM";
        coverage.push(toCoverage(dayCover, role, `from Day shift, until ${HANDOVER_TIME}`));
    }

    const lateTempSm = tempSms[0];
    if (lateTempSm) coverage.push(toCoverage(lateTempSm, "Temp-SM", `from ${HANDOVER_TIME}`));

    return coverage;
}

function describeShift(name, people, managerCoverage) {
    const agents = people.filter(person => person.role !== "SM").sort(byStartTime);
    const startTimes = people.map(person => person.startTime).sort();
    const endTimes = people.map(person => person.endTime).sort();

    return {
        name,
        hours: people.length > 0 ? `${startTimes[0]}-${endTimes.at(-1)}` : null,
        agents,
        shortBy: Math.max(0, MIN_AGENTS_PER_SHIFT - agents.length),
        managerCoverage
    };
}

function minutestoTimeString(minutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    return `${hours}:${mins}`;
}

// Only shifts longer than 6h get lunch (13:30 and 15:00 starts), 2 agents per 30-min slot
function planLunchBreaks(agents) {
    const eligible = agents.filter(agent => {
        const shiftHours = (timeStringToMinutes(agent.endTime) - timeStringToMinutes(agent.startTime)) / 60;
        return shiftHours > BREAK_THRESHOLD_HOURS;
    });

    const slots = [];
    eligible.forEach((agent, index) => {
        const slotIndex = Math.floor(index / MAX_AGENTS_PER_LUNCH);

        if (!slots[slotIndex]) {
            const start = timeStringToMinutes(LUNCH_START) + slotIndex * LUNCH_MINUTES;
            slots[slotIndex] = {
                start: minutestoTimeString(start),
                end: minutestoTimeString(start + LUNCH_MINUTES),
                agents: []
            };
        }
        slots[slotIndex].agents.push(agent);
    });

    return slots;
}

function planEvening(eveningPeople, wfByAgent) {
    const agents = eveningPeople.filter(person => person.role !== "SM").sort(byStartTime);
    const getWf = agent => wfByAgent[agent.agentId] || 0;
    const toNames = list => list.map(agent => agent.name);

    const groups = [];
    agents.forEach(agent => {
        let group = groups.find(g => g.startTime === agent.startTime && g.endTime === agent.endTime);
        if (!group) {
            group = { startTime: agent.startTime, endTime: agent.endTime, agents: [] };
            groups.push(group);
        }
        group.agents.push(agent);
    });

    const lunchBreaks = planLunchBreaks(agents);

    const lunchByAgent = {};
    lunchBreaks.forEach(slot => {
        slot.agents.forEach(agent => {
            lunchByAgent[agent.agentId] = slot; });
    });

    // Highest monthly WF agents take the extra tasks instead of chatting in the 3rd part
    const topAgents = [...agents].sort((a, b) => getWf(b) - getWf(a));
    const additionals = ADDITIONAL_TASKS.map((task, index) => ({ task, agent: topAgents[index] || null }));
    const additionalIds = additionals.filter(item => item.agent).map(item => item.agent.agentId);

    const chatParts = CHAT_PARTS.map(part => {
        const partAgents = agents
            .filter(agent => agent.startTime < part.end && agent.endTime > part.start)
            .filter(agent => {
                const lunch = lunchByAgent[agent.agentId];
                return !(lunch && lunch.start < part.end && lunch.end > part.start);
            })
            .filter(agent => !(part.excludesAdditionals && additionalIds.includes(agent.agentId)))
            .sort((a, b) => getWf(a) - getWf(b));

        return { name: part.name, start: part.start, end: part.end, agents: toNames(partAgents) };

    });

    return  { 
        groups: groups.map(group => ({ ...group, agents: toNames(group.agents) })),
        lunchBreaks: lunchBreaks.map(slot => ({ ...slot, agents: toNames(slot.agents) })),
        chatParts,
        additionals: additionals.map(item => ({ task: item.task, agent: item.agent ? item.agent.name : null }))
    };
}

function getNextDaySchedule(schedule, agents, currentTime, monthlyAgents) {
    const date = getNextWorkDate(schedule, currentTime);
    if (!date) return null;

    // Join each shift with the agent's details
    const people = schedule
        .filter(shift => shift.date === date)
        .map(shift => {
            const agent = agents.find(a => a.id === shift.agentId);
        return {
            agentId: shift.agentId,
            name: agent ? agent.name : `Agent #${shift.agentId}`,
            role: agent ? agent.role : undefined,
            tempSMqualified: agent ? agent.tempSMqualified : false,
            startTime: shift.startTime,
            endTime: shift.endTime
        };
    });

    const wfByAgent = {};
    monthlyAgents.forEach(agent => { wfByAgent[agent.agentId] = agent.workflowRate; });

    const dayPeople = people.filter(person => getShiftName(person) === "Day");
    const eveningPeople = people.filter(person => getShiftName(person) === "Evening");

    return {
        date,
        minAgentsPerShift: MIN_AGENTS_PER_SHIFT,
        shifts: [
            describeShift("Day", dayPeople, pickDayManager(dayPeople)),
            describeShift("Evening", eveningPeople, pickEveningManager(eveningPeople, dayPeople))
        ],
        eveningPlan: planEvening(eveningPeople, wfByAgent)
    };
}

module.exports = { getNextDaySchedule, MIN_AGENTS_PER_SHIFT };