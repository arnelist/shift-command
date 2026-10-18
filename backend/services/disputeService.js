// Breach disputes sent to the Data team.
// Kept in memory only, so they reset whenever the server restarts.
const DISPUTE_REASONS = [
  "Agent failed to respond within the SLA timeframe",
  "Agent took too long to respond to the customer's message",
  "Agent transferred the chat without proper handling",
  "Chat remained unassigned for too long",
  "Chat was assigned to an unavailable agent",
  "Technical issues prevented the agent from responding within the SLA",
  "High chat volume caused response delays",
  "Chat was incorrectly prioritized, causing an SLA breach",
];
const DATA_TEAM_RESPONSE_MS = 5000;
const APPROVAL_CHANCE = 0.8;

const disputes = [];
let nextDisputeId = 1;

function getDisputeForChat(chatId) {
    return disputes.find(dispute => dispute.chatId === chatId) || null;
}

// An approved dispute means the breach no longer counts against the agent
function isBreachExcused(chatId) {
    const dispute = getDisputeForChat(chatId);

    return dispute !== null && dispute.status === "approved";
}

function simulateDataTeamReview(dispute) {
    setTimeout(() => {
        dispute.status = Math.random() < APPROVAL_CHANCE ? "approved" : "rejected";
        dispute.resolvedAt = new Date().toISOString();
    }, DATA_TEAM_RESPONSE_MS);
}

function createDispute(chat, reason, comment) {
    const dispute = {
        id: nextDisputeId++,
        chatId: chat.id,
        agentId: chat.assingedAgentId,
        reason,
        comment: comment || "",
        status: "pending",
        sentAt: new Date().toISOString(),
        resolvedAt: null
    };

    disputes.push(dispute);
    simulateDataTeamReview(dispute);
    
    return dispute;
}

module.exports = { DISPUTE_REASONS, createDispute, getDisputeForChat, isBreachExcused };