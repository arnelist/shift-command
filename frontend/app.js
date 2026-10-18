const API = "/api";

//Yellow warning if SLA < 4hrs
const WARNING_MS = 4 * 60 * 60 * 1000;

async function fetchJson(path) {
    const response = await fetch(`${API}${path}`);
    if (!response.ok) {
        throw new Error(`${path} returned ${response.status}`);
    }
    return response.json();
}

function formatDuration(ms) {
    const totalMinutes = Math.floor(Math.abs(ms) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDate(isoString) {
    return new Date(isoString).toLocaleString("lt-LT", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function renderSlaWatch() {
    const card = document.getElementById("sla-watch");
    const ticket = await fetchJson("/sla-watch");

    if (!ticket) {
        document.getElementById("sla-ticket-id").textContent = "No tickets";
        return;
    }

    const isBreached = ticket.timeLeft < 0;

    if (isBreached) {
        card.classList.add("is-breached");
    } else if (ticket.timeLeft < WARNING_MS) {
        card.classList.add("is-warning");
    }

    document.getElementById("sla-ticket-id").textContent = `Ticket ${ticket.id}`;
    document.getElementById("sla-countdown").textContent = 
        (isBreached ? "-" : "") + formatDuration(ticket.timeLeft);
    document.getElementById("sla-status").textContent = isBreached
        ? `SLA breached at ${formatDate(ticket.slaDeadline)}`
        : `SLA deadline: ${formatDate(ticket.slaDeadline)}`;

    document.getElementById("sla-requester").textContent = ticket.requester;
    document.getElementById("sla-ticket-status").textContent = ticket.status;
    document.getElementById("sla-subject").textContent = ticket.subject;
    document.getElementById("sla-agent").textContent = ticket.assignedAgentName;
}

const TARGET_WF = 8;

let currentAgents = [];
let sortKey = "workflowRate";
let sortDescending = true;

function addCell(row, text, className) {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    row.appendChild(cell);
}

async function renderPerformance() {
    const { efficiency, agents } = await fetchJson("/performance");

    const totalBreaches = agents.reduce((sum, agent) => sum + agent.chatBreaches, 0);
    const totalSolved = agents.reduce((sum, agent) => sum + agent.solvedTickets + agent.solvedChats, 0);

    document.getElementById("perf-efficiency").textContent = `${efficiency}%`;
    document.getElementById("perf-efficiency-bar").style.width = `${Math.min(efficiency, 100)}%`;
    document.getElementById("perf-breaches").textContent = totalBreaches;
    document.getElementById("perf-solved").textContent = totalSolved;

    currentAgents = agents;
    renderAgentTable();
}

function renderAgentTable() {
    const tbody = document.getElementById("perf-agents");
    tbody.innerHTML = "";

    const sortedAgents = [...currentAgents].sort((a, b) => {
        const result = typeof a[sortKey] === "string"
            ? a[sortKey].localeCompare(b[sortKey])
            : a[sortKey] - b[sortKey];
        return sortDescending ? -result : result;
    });

    sortedAgents.forEach(agent => {
        const row = document.createElement("tr");
        const wfClass = agent.workflowRate >= TARGET_WF ? "on-target" : "below-target";

        addCell(row, agent.agentName);
        addCell(row, agent.workflowRate.toFixed(2), `num ${wfClass}`);
        addCell(row, agent.solvedTickets, "num");
        addCell(row, agent.solvedChats, "num");
        if (agent.chatBreaches > 0) {
            const button = document.createElement("button");
            button.className = "link-button";
            button.textContent = agent.chatBreaches;
            button.addEventListener("click", () => openBreaches(agent.agentId));

            const breachCell = document.createElement("td");
            breachCell.className = "num";
            breachCell.appendChild(button);
            row.appendChild(breachCell);
        } else {
            addCell(row, 0, "num");
        }

        tbody.appendChild(row);
    });

    document.querySelectorAll("#performance th").forEach(th => {
        const isActive = th.dataset.sort === sortKey;
        th.classList.toggle("sorted-desc", isActive && sortDescending);
        th.classList.toggle("sorted-asc", isActive && !sortDescending);
    });
}

function setupSorting() {
    document.querySelectorAll("#performance th").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.dataset.sort;

            if (key === sortKey) {
                sortDescending = !sortDescending;
            }
            else {
                sortKey = key;
                sortDescending = key !== "agentName";
            }

            renderAgentTable();
        });
    });
}

// Worst first, so the SM sees who needs attention at the top
const STATUS_ORDER = { "Needs review": 0, "Watch": 1, "On target": 2 };

function getStatusClass(status) {
    return "status-" + status.toLowerCase().replaceAll(" ", "-");
}

async function renderLastShift() {
    const report = await fetchJson("/last-shift");
    const tbody = document.getElementById("last-shift-agents");
    tbody.innerHTML = "";

    if (!report) {
        document.getElementById("last-shift-date").textContent = "No previous shift.";
        return;
    }

    document.getElementById("last-shift-date").textContent = `Shift of ${report.date}`;

    const sortedAgents = [...report.agents].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    );

    sortedAgents.forEach(agent => {
        const row = document.createElement("tr");
        const wfClass = agent.workflowRate >= TARGET_WF ? "on-target" : "below-target";

        addCell(row, agent.agentName);
        addCell(row, `${agent.workflowRate.toFixed(2)} / ${TARGET_WF}`, `num ${wfClass}`);
        addCell(row, agent.chatBreaches, "num");

        const pill = document.createElement("span");
        pill.className = `status-pill ${getStatusClass(agent.status)}`;
        pill.textContent = agent.status;

        const statusCell = document.createElement("td");
        statusCell.appendChild(pill);
        row.appendChild(statusCell);

        tbody.appendChild(row);
    });
}

async function renderMonthly() {
    const { month, agents } = await fetchJson("/monthly");

    const monthName = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric"
    });
    document.getElementById("monthly-period").textContent = `${monthName}, month to date`;

    const tbody = document.getElementById("monthly-agents");
    tbody.innerHTML = "";

    const sortedAgents = [...agents].sort((a, b) => b.workflowRate - a.workflowRate);

    sortedAgents.forEach(agent => {
         const row = document.createElement("tr");
        const wfClass = agent.workflowRate >= TARGET_WF ? "on-target" : "below-target";

        addCell(row, agent.agentName);
        addCell(row, agent.shifts, "num");
        addCell(row, agent.workflowRate.toFixed(2), `num ${wfClass}`);
        addCell(row, `${Math.round(agent.csat)}%`, "num");
        addCell(row, `${Math.round(agent.resolutionRate)}%`, "num");
        addCell(row, `${agent.avgChatHandleTime} min`, "num");

        tbody.appendChild(row);
    });
}

// ---------- Next-Day Scheduler ----------
let scheduleData = null;

function formatScheduleDate(dateString) {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });
}

function describeCoverage(coverage) {
    return `${coverage.name} (${coverage.role}, ${coverage.note})`;
}

function getShiftWarnings(shift) {
    const warnings = [];

    if (shift.managerCoverage.length === 0) {
        warnings.push({ text: "No manager coverage", level: "danger" });
    }

    if (shift.name === "Evening" && shift.shortBy > 0) {
        const plural = shift.shortBy > 1 ? "s" : "";
        warnings.push({ text: `Short ${shift.shortBy} agent${plural} (minimum ${scheduleData.minAgentsPerShift})`, level: "warning" });
    }

    return warnings;
}

function fillList(listId, items) {
    const list = document.getElementById(listId);
    list.innerHTML = "";

    items.forEach(text => {
        const item = document.createElement("li");
        item.textContent = text;
        list.appendChild(item);
    });
}

function renderShift(shift) {
    const prefix = shift.name.toLowerCase();

    document.getElementById(`${prefix}-hours`).textContent = shift.hours || "";

    const warningsBox = document.getElementById(`${prefix}-warnings`);
    warningsBox.innerHTML = "";
    getShiftWarnings(shift).forEach(warning => {
        const div = document.createElement("div");
        div.className = warning.level === "danger" ? "warning danger" : "warning";
        div.textContent = warning.text;
        warningsBox.appendChild(div);
    });

    fillList(`${prefix}-coverage`, shift.managerCoverage.map(describeCoverage));

    if (document.getElementById(`${prefix}-agents`)) {
        fillList(`${prefix}-agents`, shift.agents.map(agent => `${agent.name} (${agent.startTime}-${agent.endTime})`));
    }
}

function getSmText(managerCoverage) {
    if (managerCoverage.length === 0) return "⚠️ no SM coverage";
    if (managerCoverage.length === 1) return managerCoverage[0].name;

    return managerCoverage.map(coverage => `${coverage.name} (${coverage.note})`).join(" → ");
}

function buildSlackText(data) {
    const evening = data.shifts.find(shift => shift.name === "Evening");
    const plan = data.eveningPlan;
    
    const lines = [
        `${formatScheduleDate(data.date)} Schedule`,
        "",
        `SM - ${getSmText(evening.managerCoverage)}`,
        "",
        "Working agents:"
    ];
    plan.groups.forEach(group => {
        lines.push(`${group.startTime}-${group.endTime} - ${group.agents.join(", ")}`);
    });

    lines.push("", "Lunch breaks:");
    if (plan.lunchBreaks.length === 0) lines.push("None");
    plan.lunchBreaks.forEach(slot => {
        lines.push(`${slot.start}-${slot.end} - ${slot.agents.join(", ")}`);
    });

    plan.chatParts.forEach(part => {
        lines.push("", `${part.name} ${part.start}-${part.end}:`);
        if (part.agents.length === 0) lines.push("-");
        part.agents.forEach(name => lines.push(name));
    });

    lines.push("\nAdditionals:");
    plan.additionals.forEach(item => lines.push(`• ${item.task}: ${item.agent || ""}`));

    return lines.join("\n");
}

async function renderScheduler() {
    scheduleData = await fetchJson("/next-day-schedule");

    if (!scheduleData) {
        document.getElementById("scheduler-date").textContent = "No upcoming shifts.";
        return;
    }

    document.getElementById("scheduler-date").textContent = 
        `${formatScheduleDate(scheduleData.date)}, from Workofo availability.`;

    const evening = scheduleData.shifts.find(shift => shift.name === "Evening");
    renderShift(evening);
    document.getElementById("schedule-text").value = buildSlackText(scheduleData);
}

function setupSchedulerButtons() {
    document.getElementById("regenerate-btn").addEventListener("click", () => {
        if (scheduleData) {
            document.getElementById("schedule-text").value = buildSlackText(scheduleData);
        }
    });
       
    document.getElementById("copy-btn").addEventListener("click", async () => {
        const status = document.getElementById("copy-status");
        try {
            await navigator.clipboard.writeText(document.getElementById("schedule-text").value);
            status.textContent = "Copied!";
        } catch (error) {
            status.textContent = "Could not copy, select the text and press Ctrl/Cmd + C";
        }
        setTimeout(() => { status.textContent = ""; }, 2000 );
    });
}

// ---------- Breach disputes ----------
const DISPUTE_STATUS_CLASS = { pending: "status-watch", approved: "status-on-target", rejected: "status-needs-review" };
const DATA_TEAM_WAIT_MS = 6000;

let breachAgentId = null;
let disputeChatId = null;

async function postJson(path, body) {
    const response = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `${path} returned ${response.status}`);
    }
    return data;
}

function showDisputeForm(breach) {
    disputeChatId = breach.chatId;
    document.getElementById("dispute-form-title").textContent = `Dispute ${breach.chatId} (${breach.requester})`;
    document.getElementById("dispute-comment").value = "";
    document.getElementById("dispute-status").textContent = "";
    document.getElementById("dispute-form").hidden = false;
}

async function openBreaches(agentId) {
    breachAgentId = agentId;
    const { agentName, reasons, breaches } = await fetchJson(`/agents/${agentId}/breaches`);

    document.getElementById("breach-dialog-title").textContent = `Chat breaches: ${agentName}`;

    const reasonSelect = document.getElementById("dispute-reason");
    reasonSelect.innerHTML = "";
    reasons.forEach(reason => {
        const option = document.createElement("option");
        option.value = reason;
        option.textContent = reason;
        reasonSelect.appendChild(option);
    });

    const tbody = document.getElementById("breach-list");
    tbody.innerHTML = "";

    breaches.forEach(breach => {
        const row = document.createElement("tr");
        addCell(row, breach.chatId, "num");
        addCell(row, breach.requester);
        addCell(row, formatDate(breach.transferredAt), "num");
        addCell(row, `${breach.firstReplySeconds}s`, "num below-target");

        const disputeCell = document.createElement("td");
        if (breach.dispute) {
            const pill = document.createElement("span");
            pill.className = `status-pill ${DISPUTE_STATUS_CLASS[breach.dispute.status]}`;
            pill.textContent = breach.dispute.status;
            pill.title = breach.dispute.reason;
            disputeCell.appendChild(pill);
        } else {
            const button = document.createElement("button");
            button.className = "btn";
            button.textContent = "Dispute";
            button.addEventListener("click", () => showDisputeForm(breach));
            disputeCell.appendChild(button);
        }
        row.appendChild(disputeCell);

        tbody.appendChild(row);
    });

    const dialog = document.getElementById("breach-dialog");
    if (!dialog.open) {
        document.getElementById("dispute-form").hidden = true;
        dialog.showModal();
    }
}

function setupDisputes() {
    const dialog = document.getElementById("breach-dialog");
    const form = document.getElementById("dispute-form");
    const status = document.getElementById("dispute-status");

    document.getElementById("breach-dialog-close").addEventListener("click", () => dialog.close())
    document.getElementById("dispute-cancel").addEventListener("click", () => { form.hidden = true });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        status.textContent = "Sending...";

        try {
            await postJson("/disputes", {
                chatId: disputeChatId,
                reason: document.getElementById("dispute-reason").value,
                comment: document.getElementById("dispute-comment").value
            });
            form.hidden = true;
            await openBreaches(breachAgentId);

            // The Data team answers after a few seconds: refresh the list and the breach counts
            const agentId = breachAgentId;
            setTimeout(async () => {
                if (dialog.open && breachAgentId === agentId) await openBreaches(agentId);
                await renderPerformance();
            }, DATA_TEAM_WAIT_MS);
        } catch(error) {
            status.textContent = error.message;
        }
    });
}

async function init() {
    setupSorting();
    setupSchedulerButtons();
    setupDisputes();

    try {
        await Promise.all([renderSlaWatch(), renderPerformance(), renderLastShift(), renderMonthly(), renderScheduler()]);
    } catch (error) {
        console.error(error);
        document.getElementById("sla-ticket-id").textContent = "Could not load data — is the server running?";
    }
}

init();