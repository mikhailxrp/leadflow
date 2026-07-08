const MS_PER_MINUTE = 60_000;

export function minutesSinceCreated(
  createdAt: Date,
  now: Date,
  workHoursOnly: boolean,
): number {
  // Phase 6: workHoursOnly = true uses the same simplified calculation.
  // Full work-hours subtraction is implemented in Phase 17.
  void workHoursOnly;

  return (now.getTime() - createdAt.getTime()) / MS_PER_MINUTE;
}
