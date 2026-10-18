const BREACH_THRESHOLD_SECONDS = 60;

function isChatBreached(chat, currentTime) {
  if (chat.firstAgentReplyAt) {
    const transferredTime = new Date(chat.transferredToAgentAt);
    const firstReplyTime = new Date(chat.firstAgentReplyAt);
    const timeDifferenceSeconds = (firstReplyTime - transferredTime) / 1000;

    return timeDifferenceSeconds > BREACH_THRESHOLD_SECONDS;
  }

  else {
    const transferredTime = new Date(chat.transferredToAgentAt);
    const timeDifferenceSeconds = (currentTime - transferredTime) / 1000;
    
    return timeDifferenceSeconds > BREACH_THRESHOLD_SECONDS;
  }
}

function getChatBreachCount(chats, agentId, currentTime, isExcused = () => false) {
  const agentChats = chats.filter(chat => chat.assignedAgentId === agentId);

  return agentChats.filter(chat => isChatBreached(chat, currentTime) && !isExcused(chat.id)).length;
}

function getFirstReplySeconds(chat, currentTime) {
  const transferredTime = new Date(chat.transferredToAgentAt);
  const replyTime = chat.firstAgentReplyAt ? new Date(chat.firstAgentReplyAt) : currentTime;

  return Math.round((replyTime - transferredTime) / 1000);
}

module.exports = { isChatBreached, getChatBreachCount, getFirstReplySeconds, BREACH_THRESHOLD_SECONDS };