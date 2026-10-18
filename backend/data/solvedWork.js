// Generated solved tickets and chats for the current shift, so each agent lands near
// the workflow rate set in TARGET_WORKFLOW_RATES.

const { CURRENT_TIME } = require("../config");
const { workofoSchedule } = require("./workofoExport");
const { getShiftsForDate, getNetHoursWorked, toDateString } = require("../services/shiftService");
const { createRandom } = require("../utils/random")

// Desired workflow (solved items per net hour) for each agent on today's shift.
// Change these to reshape the dashboard; agents not listed get 0.
const TARGET_WORKFLOW_RATES = {
  1: 8.2,
  2: 8.5,
  3: 3.5,
  4: 8.5,
  6: 12.5,
  7: 8.2,
  8: 4,
  9: 7,
  10: 9,
  12: 13,
  13: 8.5,
  14: 7.5,
  15: 8.2
};

const CHAT_SHARE = 0.4;          // roughly 40% of solved work comes from chats
const IDLE_CLOSED_SHARE = 0.15;  // part of solved chats closed due to customer inactivity
const CHAT_BREACH_SHARE = 0.06;  // exact share of chats with first reply slower than 60 s

const REQUESTERS = [
  "Justina K.", "Tomas B.", "Rasa P.", "Andrius M.", "Egle S.", "James W.", "Milda V.",
  "Lukas B.", "Sophie B.", "Mohammed A.", "Gintarė K.", "Diego F.", "Amara O.", "Yuki T.",
  "Rimas K.", "Vilma P.", "Darius M.", "Simona T.", "Paulius A.", "Greta J.", "Nerijus B.",
  "Ausra V.", "Laura G.", "Marius D.", "Anna L.", "Kevin R.", "Ieva Š.", "Oliver H."
];

const SUBJECTS = [
  "VPN connection keeps dropping", "Unable to reset password", "Outlook not syncing",
  "Two-factor code not received", "Printer offline on office network", "Shared drive access denied",
  "Laptop won't boot after update", "Teams microphone not detected", "Software install request",
  "Account locked after failed logins", "VPN certificate expired", "Slow Wi-Fi in meeting room",
  "Email attachments not sending", "License activation failed", "New hire equipment setup",
  "Remote desktop timeout", "Browser keeps crashing", "Monitor not detected via dock",
  "Calendar invites not arriving", "Mobile device enrollment failed"
];

// Local "YYYY-MM-DDTHH:MM:SS", matching the rest of the mock data
function toLocalTimestamp(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${toDateString(date)}T${hh}:${mm}:${ss}`;
}

function generateSolvedWork() {
  const random = createRandom(20261105);
  const pick = list => list[Math.floor(random() * list.length)];

  const generatedTickets = [];
  const generatedChats = [];
  let ticketNumber = 48221;
  let chatNumber = 1;

  getShiftsForDate(workofoSchedule, CURRENT_TIME).forEach(shift => {
    const targetRate = TARGET_WORKFLOW_RATES[shift.agentId] || 0;
    const netHours = getNetHoursWorked(shift, CURRENT_TIME);

    const toGenerate = Math.round(targetRate * netHours);

    // Spread solved items evenly between shift start and now
    const shiftStart = new Date(`${shift.date}T${shift.startTime}:00`);
    const span = Math.min(CURRENT_TIME, new Date(`${shift.date}T${shift.endTime}:00`)) - shiftStart;

    for (let i = 0; i < toGenerate; i++) {
      const jitter = (random() - 0.5) * (span / (toGenerate + 1));
      const solvedAt = new Date(shiftStart.getTime() + ((i + 1) * span) / (toGenerate + 1) + jitter);

      if (random() < CHAT_SHARE) {
        const transferredAt = new Date(Math.max(shiftStart, solvedAt.getTime() - (5 + random() * 15) * 60 * 1000));
        const replySeconds = 8 + random() * 48;

        generatedChats.push({
          id: `chat-${String(chatNumber++).padStart(3, "0")}`,
          requester: pick(REQUESTERS),
          assignedAgentId: shift.agentId,
          status: random() < IDLE_CLOSED_SHARE ? "idle-closed" : "solved",
          transferredToAgentAt: toLocalTimestamp(transferredAt),
          firstAgentReplyAt: toLocalTimestamp(new Date(transferredAt.getTime() + replySeconds * 1000))
        });
      } else {
        generatedTickets.push({
          id: `#${ticketNumber++}`,
          requester: pick(REQUESTERS),
          subject: pick(SUBJECTS),
          assignedAgentId: shift.agentId,
          status: "solved",
          solvedAt: toLocalTimestamp(solvedAt)
        });
      }
    }
  });

  // Turn exactly CHAT_BREACH_SHARE of the chats into breaches (first reply after 60 s)
  const breachCount = Math.round(generatedChats.length * CHAT_BREACH_SHARE);
  const chatIndexes = generatedChats.map((_, i) => i).sort(() => random() - 0.5);
  chatIndexes.slice(0, breachCount).forEach(i => {
    const chat = generatedChats[i];
    const replySeconds = 61 + random() * 90;
    const firstReply = new Date(new Date(chat.transferredToAgentAt).getTime() + replySeconds * 1000);
    chat.firstAgentReplyAt = toLocalTimestamp(firstReply);
  });

  return { generatedTickets, generatedChats };
}

const { generatedTickets, generatedChats } = generateSolvedWork();

module.exports = { solvedTickets: generatedTickets, solvedChats: generatedChats, TARGET_WORKFLOW_RATES };
