const SLA_HOURS = 24;
const ACTIVE_STATUSES = ["new", "open"];

function getSlaDeadline(ticket) {
  const replyTime = new Date(ticket.lastCustomerReplyAt);
  return new Date(replyTime.getTime() + SLA_HOURS * 60 * 60 * 1000);
}

function isActive(ticket) {
  return ACTIVE_STATUSES.includes(ticket.status);
}

function getLowestSlaTicket(tickets, currentTime) {
  const activeTickets = tickets.filter(isActive);

  if (activeTickets.length === 0) {
    return null;
  }

  const ticketsWithSla = activeTickets.map(ticket => {
    const slaDeadline = getSlaDeadline(ticket);
    const timeLeft = slaDeadline - currentTime;
    return { ...ticket, slaDeadline, timeLeft };
  });

  const lowestSlaTicket = ticketsWithSla.reduce((min, ticket) => {
    return ticket.timeLeft < min.timeLeft ? ticket : min;
  });

  return lowestSlaTicket;
}

module.exports = { getSlaDeadline, isActive, getLowestSlaTicket, SLA_HOURS };