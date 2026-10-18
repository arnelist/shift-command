// Single entry point for all mock data: open tickets + generated solved tickets and chats.
const { tickets: openTickets } = require("./mockTickets");
const { solvedTickets, solvedChats } = require("./solvedWork");
const { workofoSchedule } = require("./workofoExport");
const { lookerExport } = require("./lookerExport");
const { dayTeamSchedule } = require("./dayTeamSchedule");

const tickets = [...openTickets, ...solvedTickets];
const chats = solvedChats;

module.exports = { tickets, chats, workofoSchedule, lookerExport, dayTeamSchedule };