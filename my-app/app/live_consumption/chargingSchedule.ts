export type HourStatus = "past" | "current" | "future" | "none";

export function buildChargingSchedule(
  chargingHours: number[],
  currentHour: number,
  sessionStartHour: number
): Record<number, HourStatus> {
  const schedule: Record<number, HourStatus> = {};

  for (let hour = 0; hour < 24; hour++) {
    if (!chargingHours.includes(hour)) {
      schedule[hour] = "none";
      continue;
    }

    // compute distance from session start, modulo 24 to handle wrap-around
    const distanceFromStart = (hour - sessionStartHour + 24) % 24;
    const distanceCurrent = (currentHour - sessionStartHour + 24) % 24;

    if (distanceFromStart < distanceCurrent) {
      schedule[hour] = "past";
    } else if (distanceFromStart === distanceCurrent) {
      schedule[hour] = "current";
    } else {
      schedule[hour] = "future";
    }
  }

  return schedule;
}