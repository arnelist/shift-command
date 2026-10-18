const path = require("path");
const express = require("express");
const cors = require("cors");

const { tickets, chats, workofoSchedule, lookerExport, dayTeamSchedule } = require("./data");
const { agents } = require("./data/mockData");
const { CURRENT_TIME } = require("./config");

const { getLowestSlaTicket } = require("./services/slaService");
const { getWorkflowRate, getShiftEfficiency } = require("./services/performanceService");
const { getChatBreachCount, isChatBreached, getFirstReplySeconds } = require("./services/chatService");
const { getShiftsForDate } = require("./services/shiftService");
const { getLastShiftReport, getMonthlyResults } = require("./services/reportService");
const { getNextDaySchedule } = require("./services/scheduleService");
const { DISPUTE_REASONS, createDispute, getDisputeForChat, isBreachExcused } = require("./services/disputeService");
const { requireSm } = require("./middleware/requireSm");

const app = express();
app.use(cors());
app.use(requireSm);
app.use(express.json());
// Serve the dashboard itself, so it opens at http://localhost:3001
app.use(express.static(path.join(__dirname, "../frontend")));

function getAgentName(agentId) {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : `Agent #${agentId}`;
}

app.get("/api/sla-watch", (req, res) => {
    const lowestSlaTicket = getLowestSlaTicket(tickets, CURRENT_TIME);
    if (!lowestSlaTicket) return res.json(null);

    res.json({ ...lowestSlaTicket, assignedAgentName: getAgentName(lowestSlaTicket.assignedAgentId) });
});

app.get("/api/performance", (req, res) => {
    const efficiency = getShiftEfficiency(tickets, chats, workofoSchedule, CURRENT_TIME);

    const agentStats = getShiftsForDate(workofoSchedule, CURRENT_TIME)
      .map(shift => {
        const workflow = getWorkflowRate(shift.agentId, tickets, chats, workofoSchedule, CURRENT_TIME);
        if (!workflow) return null;

        return {
          agentId: shift.agentId,
          agentName: getAgentName(shift.agentId),
          workflowRate: Math.round(workflow.rate * 100) / 100,
          solvedTickets: workflow.solvedTickets,
          solvedChats: workflow.solvedChats,
          chatBreaches: getChatBreachCount(chats, shift.agentId, CURRENT_TIME, isBreachExcused)
        };
      })
    .filter(a => a !== null);

  res.json({ efficiency, agents: agentStats });
});

app.get("/api/last-shift", (req, res) => {
    const report = getLastShiftReport(lookerExport, CURRENT_TIME);
    if (!report) return res.json(null);

    const agents = report.agents.map(agent => ({ ...agent, agentName: getAgentName(agent.agentId) }));
    res.json({ date: report.date, agents });
});

app.get("/api/monthly", (req, res) => {
    const results = getMonthlyResults(lookerExport, CURRENT_TIME);
    const agents = results.agents.map(agent => ({ ...agent, agentName: getAgentName(agent.agentId) }));
    res.json({ month: results.month, agents });
});

app.get("/api/next-day-schedule", (req, res) => {
    const fullSchedule = [...workofoSchedule, ...dayTeamSchedule];
    const monthly = getMonthlyResults(lookerExport, CURRENT_TIME);
    res.json(getNextDaySchedule(fullSchedule, agents, CURRENT_TIME, monthly.agents));
});

app.get("/api/agents/:agentId/breaches", (req, res) => {
    const agentId = Number(req.params.agentId);

    const breaches = chats
        .filter(chat => chat.assignedAgentId === agentId && isChatBreached(chat, CURRENT_TIME))
        .map(chat => ({
            chatId: chat.id,
            requester: chat.requester,
            transferredAt: chat.transferredToAgentAt,
            firstReplySeconds: getFirstReplySeconds(chat, CURRENT_TIME),
            dispute: getDisputeForChat(chat.id)
        }));

    res.json({ agentId, agentName: getAgentName(agentId), reasons: DISPUTE_REASONS, breaches });
});

app.post("/api/disputes", (req, res) => {
    const { chatId, reason, comment } = req.body;
    const chat = chats.find(c => c.id === chatId);

    if (!chat || !isChatBreached(chat, CURRENT_TIME)) {
        return res.status(404).json({ error: "Breached chat not found" });
    }
    if (!DISPUTE_REASONS.includes(reason)) {
        return res.status(400).json({ error: "Unknown dispute reason" });
    }
    if (getDisputeForChat(chatId)) {
        return res.status(409).json({ error: "This breach has already been disputed" });
    }

    res.status(201).json(createDispute(chat, reason, comment));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
