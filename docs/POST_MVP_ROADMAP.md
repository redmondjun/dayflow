# DayFlow Post-MVP Roadmap

This document describes future features that should not be implemented in the first MVP. The MVP remains local-first with SQLite as the source of truth, manual tasks, AI schedule generation, active task display, and local notifications.

## 1. Analytics Dashboard

Add analytics after task completion/skip behavior is stable.

- Daily, weekly, and monthly completion stats:
  - completed task count
  - skipped task count
  - completion percentage
  - total planned minutes completed
- Planned time vs actual time:
  - compare `startTime`/`endTime` against `actualStartTime`/`actualEndTime`
  - show overrun/underrun totals by day and week
- Skipped task patterns:
  - skipped tasks by time of day
  - skipped tasks by category, if categories become meaningful
  - repeated skipped task titles such as study, gym, admin, errands

Recommended implementation:

- Keep raw task records in SQLite.
- Add read-only analytics selectors or query helpers.
- Avoid storing derived analytics until the app needs performance optimization.

## 2. AI Summary

Add summaries only after the app has enough reliable completion and skip history.

- End-of-day summary:
  - completed tasks
  - skipped tasks
  - unfinished scheduled tasks
  - total planned vs completed time
- Weekly/monthly productivity summary:
  - completion trends
  - repeated skipped tasks
  - strongest completion windows
  - practical next-week suggestions
- Required data inputs:
  - task title
  - scheduled start/end time
  - status
  - actual start/end time when available
  - optional category/description
- Expected AI response shape:

```json
{
  "headline": "Short summary",
  "wins": ["Completed focused study block"],
  "patterns": ["Skipped workouts after 8 PM"],
  "suggestions": ["Move workouts before dinner"]
}
```

Rules:

- Generate summaries from validated local task data.
- Do not let AI mutate tasks.
- Store summaries only if users need history or offline viewing.

## 3. AI Schedule Suggestions Based On History

Use historical completed and skipped tasks to improve future schedules.

- Inputs:
  - past skipped/completed tasks
  - task titles and optional categories
  - scheduled time slots
  - actual completion times
- Suggestions:
  - better time slots for repeatedly skipped task types
  - shorter duration estimates for tasks that often overrun
  - buffers around tasks that often slip
- Example:
  - "You often skip study tasks at night. Try morning."

Recommended implementation:

- Keep suggestions separate from schedule generation at first.
- Show suggestions as editable recommendations, not automatic rewrites.
- Require user confirmation before saving suggested tasks.

## 4. Cloud Sync / Account System

Add accounts only when users need multi-device continuity.

Possible stack:

- Firebase Auth for email, Apple, or Google sign-in.
- Firestore for task sync.

Migration from local-only data:

- Keep SQLite as an offline cache.
- Add a stable `userId` and sync metadata such as `remoteId`, `dirty`, `deletedAt`, and `lastSyncedAt`.
- On first login, upload local tasks after user confirmation.
- Resolve conflicts by `updatedAt` for MVP sync, then improve if needed.

Rules:

- Do not require login for local use.
- Preserve the local-first flow.
- Treat sync failures as recoverable background errors.

## 5. Advanced Lock Screen Support

The MVP uses scheduled local notifications only. Advanced lock screen support can come later.

- iOS Live Activities:
  - show current task title
  - show scheduled end time
  - update remaining time
  - expose complete/skip actions if supported
- Android foreground notification:
  - persistent current-task notification
  - complete/skip actions
  - careful battery and permission handling

Implementation notes:

- This likely requires native modules or config plugins.
- Use EAS development builds, not Expo Go, for testing.
- Keep normal local notifications as fallback.

## 6. Calendar Integration

Calendar support should start with export before full two-way sync.

- Google Calendar:
  - export generated tasks as calendar events
  - later add OAuth and sync status
- Apple Calendar:
  - export to device calendar where platform APIs allow
  - consider `.ics` export as a simpler first step

Recommended rollout:

- Phase 1: one-time `.ics` export.
- Phase 2: manual push to calendar.
- Phase 3: optional two-way sync with conflict handling.

Rules:

- Do not make calendar events the source of truth.
- Keep DayFlow tasks in SQLite.
- Require confirmation before exporting or syncing tasks.
