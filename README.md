# DayFlow

DayFlow is a local-first MVP mobile app for AI-assisted todo scheduling. Users can create tasks manually or enter rough plans like `study React, gym, groceries`, then review an AI-generated time-based schedule before saving it locally.

## Tech Stack

- React Native with Expo
- TypeScript
- Zustand for UI/in-memory state
- `expo-sqlite` for local persistence
- `expo-notifications` for scheduled local notifications
- `expo-secure-store` for local OpenAI API key storage
- NativeWind for layout utilities
- React Native Paper for reusable UI controls
- OpenAI Responses API for structured schedule generation

## Project Structure

```text
project-root/
  src/
    components/
    navigation/
    screens/
    services/
    store/
    theme/
    types/
    utils/
  docs/
    POST_MVP_ROADMAP.md
```

## Setup

```bash
npm install
npm run start
```

Then open the app in Expo Go, iOS Simulator, or Android Emulator.

## OpenAI API Key

The app does not ship with an OpenAI API key. Open DayFlow Settings and enter your own key.

The key is stored locally on device using Expo SecureStore. AI generation is disabled until a key is saved.

## Development Testing

```bash
npm run start
npm run ios
npm run android
npm run lint
npm run format:check
```

Recommended MVP testing:

- create, edit, delete a task
- complete and skip active tasks
- generate an AI schedule, edit preview tasks, then confirm
- verify missing API key disables AI generation
- verify scheduled local notifications on a simulator or real device

## Preview Tooling

Actual app screen preview:

- run the Expo app in development
- open `Settings`
- open `UI Preview`

The in-app preview catalog is development-only and hidden from production builds.

## EAS Builds

Install EAS CLI if needed:

```bash
npm install -g eas-cli
```

Create a development build:

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

Create an Android preview APK:

```bash
eas build --profile preview --platform android
```

This MVP is not targeting App Store deployment. Test iOS in the simulator first, then use EAS development builds for real-device notification testing.

## Architecture Notes

- SQLite is the source of truth.
- Zustand mirrors loaded task state for UI rendering only.
- DB writes happen before Zustand state updates.
- AI responses are validated and shown in preview before tasks are saved.
- Local notifications are scheduled for task start times and rescheduled on startup.

Post-MVP features are documented in [docs/POST_MVP_ROADMAP.md](docs/POST_MVP_ROADMAP.md).
