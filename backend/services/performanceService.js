const { getNetHoursWorked, getShiftsForDate } = require("./shiftService");

function getWorkflowRate(agentId, tickets, chats, workofoSchedule, currentTime) {
    const shift = getShiftsForDate(workofoSchedule, currentTime).find(s => s.agentId === agentId);
    if (!shift) return null;

    // Only count work done during this shift, up to now
    const shiftStart = new Date(`${shift.date}T${shift.startTime}:00`);
    const isDuringShift = timestamp => {
      const time = new Date(timestamp);
      return time >= shiftStart && time <= currentTime;
    };

    const solvedTickets = tickets.filter(
      t => t.assignedAgentId === agentId && t.status === "solved" && isDuringShift(t.solvedAt)
    ).length;

    // Chats have no solve time; the moment it reached the agent is close enough
    const solvedChats = chats.filter(
      c => c.assignedAgentId === agentId && (c.status === "solved" || c.status === "idle-closed") &&
        isDuringShift(c.transferredToAgentAt)
    ).length;

    const netHours = getNetHoursWorked(shift, currentTime);
    if (netHours === 0) {
      return { rate: 0, solvedTickets, solvedChats };
    }

    const rate = (solvedTickets + solvedChats) / netHours;
    return { rate, solvedTickets, solvedChats };
}

const TARGET_WORKFLOW = 8;

function getShiftEfficiency(tickets, chats, workofoSchedule, currentTime) {
    const workflowResults = getShiftsForDate(workofoSchedule, currentTime)
      .map(shift => getWorkflowRate(shift.agentId, tickets, chats, workofoSchedule, currentTime))
      .filter(result => result !== null);

    if (workflowResults.length === 0) {
      return 0;
    }

    // Average workflow vs target; can exceed 100% when high performers outweigh low ones
    const totalRate = workflowResults.reduce((sum, result) => sum + result.rate, 0);
    const efficiencyPercentage = (totalRate / (TARGET_WORKFLOW * workflowResults.length)) * 100;

    return Math.round(efficiencyPercentage);
}

module.exports = { getWorkflowRate, getShiftEfficiency, TARGET_WORKFLOW };