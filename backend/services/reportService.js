const { toDateString } = require("./shiftService");

const TARGET_WORKFLOW = 8;

// "On target" / "Watch" / "Needs review", based on workflow and chat breaches
function getAgentStatus(workflowRate, chatBreaches) {
    if (workflowRate < 6 || chatBreaches >= 3) return "Needs review";
    if (workflowRate < TARGET_WORKFLOW || chatBreaches > 0) return "Watch";
    return "On target";
}

function getLastShiftReport(lookerExport, currentTime) {
    const today = toDateString(currentTime);
    const pastDates = lookerExport.map(row => row.date).filter(date => date < today);
    if (pastDates.length === 0) return null;

    const lastDate = pastDates.sort().at(-1);

    const agents = lookerExport
        .filter(row => row.date === lastDate)
        .map(row => ({
            agentId: row.agentId,
            workflowRate: row.workflowRate,
            chatBreaches: row.chatBreaches,
            status: getAgentStatus(row.workflowRate, row.chatBreaches)
        }));

    return { date: lastDate, agents };
}

function average(values) {
     const sum = values.reduce((total, value) => total + value, 0);
    return Math.round((sum / values.length) * 100) / 100;
}

function getMonthlyResults(lookerExport, currentTime) {
    const month = toDateString(currentTime).slice(0, 7);
    const monthRows = lookerExport.filter(row => row.date.startsWith(month));

    const rowsByAgent = {};
    monthRows.forEach(row => {
        if (!rowsByAgent[row.agentId]) rowsByAgent[row.agentId] = [];
        rowsByAgent[row.agentId].push(row);
    });

    const agents = Object.entries(rowsByAgent).map(([agentId, rows]) => ({
        agentId: Number(agentId),
        shifts: rows.length,
        workflowRate: average(rows.map(row => row.workflowRate)),
        csat: average(rows.map(row => row.csat)),
        resolutionRate: average(rows.map(row => row.resolutionRate)),
        avgChatHandleTime: Math.round(average(rows.map(row => row.avgChatHandleTime)))
    }));

    return { month, agents };
}

module.exports = { getLastShiftReport, getMonthlyResults, getAgentStatus };