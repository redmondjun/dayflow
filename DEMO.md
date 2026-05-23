# DayFlow Demo Guide

This guide documents the development-only demo tooling added for DayFlow scheduling, weekly insight, and onboarding demos.

## Availability

All demo controls described here are gated behind `__DEV__`.

- They are visible only in development builds.
- They do not change production behavior.
- They do not rewrite notification scheduling behavior at the OS level.

## Where To Find Demo Controls

Open:

1. `Settings`
2. `Developer`

Developer controls include:

- `Demo time`
- `Weekly demo data`
- `Open Weekly Insight`
- `Reset Onboarding`
- `UI Preview`

## Demo Time

`Demo time` lets you override the app’s in-memory notion of the current time while the app is open.

Use it to demo:

- a scheduled task becoming the current active task
- current-task progress and remaining time changing
- the next upcoming task changing
- earlier scheduled tasks automatically appearing as completed once they are fully in the past
- weekly insight calculations using a different effective `now`

### How To Use It

1. Enter a date in `YYYY-MM-DD`
2. Enter a time in `HH:MM`
3. Tap `Set Demo Time`

Tap `Reset` to return the app to live device time.

### Important Limitation

This does **not** change real Expo / iOS / Android local notification delivery.

- In-app task state uses the demo time override.
- Real scheduled OS notifications still use the actual device clock.

For the demo, this means you should keep the app open and use the in-app state transition rather than expecting a fake device notification to fire.

When demo time is active, DayFlow also derives earlier scheduled tasks as completed in-app so the timeline matches the advanced clock. This is display/runtime behavior only and does not rewrite persisted task status in SQLite.

## Weekly Demo Data

`Weekly demo data` switches the Weekly Insight screen to use the existing preview/mock summary instead of live SQLite task history.

Use it when:

- you need a polished weekly dashboard immediately
- you do not want to seed a full week of real task history
- you want predictable weekly insight content for a demo

When enabled:

- the real Weekly Insight screen renders preview/mock weekly content
- no fake tasks are written into SQLite
- AI weekly insight generation is bypassed for that preview state

Use `Open Weekly Insight` to jump directly into the weekly screen after enabling it.

## Reset Onboarding

`Reset Onboarding` clears the saved onboarding profile from SecureStore and immediately returns the current session to the onboarding flow.

Use it to demo:

- first-run onboarding
- onboarding edits from a clean state
- the full onboarding path without reinstalling the app

What it clears:

- onboarding profile only

What it does not clear:

- tasks
- API keys
- other settings

## Suggested Demo Flows

### Scheduling Demo

1. Create or generate a scheduled task
2. Open `Settings` -> `Developer`
3. Set `Demo time` to the task start time
4. Return to `Home`
5. Show the task becoming active
6. Use `Complete early` or `Skip`

### Weekly Insight Demo

1. Open `Settings` -> `Developer`
2. Enable `Weekly demo data`
3. Tap `Open Weekly Insight`
4. Demo the weekly dashboard with stable preview content

### Onboarding Demo

1. Open `Settings` -> `Developer`
2. Tap `Reset Onboarding`
3. Walk through onboarding again

## Notes For Developers

- Demo state is in-memory only and lives in `src/services/devDemo.ts`.
- Onboarding reset uses `clearOnboardingProfile()` in `src/services/onboardingProfile.ts`.
- Weekly demo data reuses the existing preview summary from `src/dev-preview/mockData.ts`.
- Time-sensitive task and weekly calculations now accept an effective `now` so dev-only time override stays scoped to in-app behavior.
