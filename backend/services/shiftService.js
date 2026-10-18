const BREAK_THRESHOLD_HOURS = 6;
const BREAK_MINUTES = 30;
const MIN_SHIFT_HOURS = 5;

function timeStringToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// "YYYY-MM-DD" in local time, matching the date format used in the Workofo export
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getShiftsForDate(workofoSchedule, currentTime) {
  const today = toDateString(currentTime);
  return workofoSchedule.filter(shift => shift.date === today);
}

function getNetHoursWorked(shift, currentTime) {
  const startTime = timeStringToMinutes(shift.startTime);
  const endTime = timeStringToMinutes(shift.endTime);

  const currentMinutes = timeStringToMinutes(`${currentTime.getHours()}:${currentTime.getMinutes()}`);
  const elapsedMinutes = Math.max(0, Math.min(currentMinutes, endTime) - startTime);

  let netHours = elapsedMinutes / 60;

  if (netHours > BREAK_THRESHOLD_HOURS) {
    netHours -= BREAK_MINUTES / 60;
  }

  return netHours;
}

module.exports = { getNetHoursWorked, getShiftsForDate, toDateString, timeStringToMinutes, BREAK_THRESHOLD_HOURS, BREAK_MINUTES, MIN_SHIFT_HOURS };