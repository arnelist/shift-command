const { tickets, chats, workofoSchedule } = require("./data");
const { getWorkflowRate, getShiftEfficiency } = require("./services/performanceService");
const { isChatBreached, getChatBreachCount } = require("./services/chatService");

const testTime = new Date("2026-11-05T20:00:00");

[1, 2, 7, 12, 15, 3].forEach(id => {
  console.log(`Agent ${id}:`, getWorkflowRate(id, tickets, chats, workofoSchedule, testTime));
});

const breachedChats = chats.filter(c => isChatBreached(c, testTime));
console.log(`Chat breaches: ${breachedChats.length} of ${chats.length}`, breachedChats[0]);

console.log("Shift efficiency:", getShiftEfficiency(tickets, chats, workofoSchedule, testTime) + "%");