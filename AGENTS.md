# AGENTS.md — Dayflow Code Style Guidelines

## Pattern 1: Use lookup objects instead of chained ternaries / if-else

When dispatching behavior based on a string key (e.g. provider type), use a `Record<string, ...>` object instead of chained ternaries or if-else blocks.

**Bad:**

```ts
const label =
  selectedProvider === 'openai'
    ? 'sk-proj-...'
    : selectedProvider === 'google'
      ? 'AIza...'
      : 'nvapi-...';
```

**Good:**

```ts
const PLACEHOLDERS: Record<AiProvider, string> = {
  openai: 'sk-proj-...',
  google: 'AIza...',
  nvidia: 'nvapi-...',
};
const label = PLACEHOLDERS[selectedProvider];
```

This pattern applies to:

- Provider-specific copy (placeholders, help text)
- Dispatch maps (which function to call per provider)
- State lookups (which state variable maps to each provider)
- Nested ternaries for any key-based branching

## Pattern 2: Use `&&` for conditional rendering, not `?: null`

For JSX conditional rendering, prefer short-circuit `&&` over ternary with `null`.

**Bad:** `{condition ? <Component /> : null}`

**Good:** `{condition && <Component />}`

## Pattern 3: Render lists with `array.map`, not repeated inline elements

When rendering a list of similar UI elements (tabs, dropdown options, menu items), define a data array and call `.map()`. This reduces duplication and makes adding/removing items trivial.

**Bad:**

```tsx
<Pressable onPress={() => onSelect('google')} ...>Google</Pressable>
<Pressable onPress={() => onSelect('openai')} ...>OpenAI</Pressable>
<Pressable onPress={() => onSelect('nvidia')} ...>NVIDIA</Pressable>
```

**Good:**

```tsx
const providers = [
  { key: 'google', label: 'Google' },
  { key: 'openai', label: 'OpenAI' },
  { key: 'nvidia', label: 'NVIDIA' },
];
return providers.map(({ key, label }) => (
  <Pressable key={key} onPress={() => onSelect(key)} ...>{label}</Pressable>
));
```

## Pattern 4: Match existing code style when adding new files

When creating a service module (e.g. `nvidia.ts`) that mirrors existing ones (`openai.ts`, `gemini.ts`), match the exact conventions:

- Same system prompt wording ("Return JSON only.")
- Same error handling patterns
- Same import style for re-exported types
- Same `export type { ... }` pattern

Don't add extra instructions or divergent patterns unless the API forces them. JSON fence stripping is handled in the parser — the prompt doesn't need to mention it.

## Pattern 4a: Centralize shared constants, don't duplicate them

When multiple provider files use the same strings (system prompts, error messages, etc.), define them once in a shared module and import everywhere. Don't copy-paste the same constant across files — it creates drift.

**Bad:** `openai.ts`, `gemini.ts`, and `nvidia.ts` each define their own `SCHEDULE_SYSTEM_PROMPT` constant with slightly different wording.

**Good:**

```ts
// src/services/ai/prompts.ts
export const SCHEDULE_SYSTEM_PROMPT =
  'You are a scheduling assistant. Build a realistic daily schedule with logical start times and durations for each task. Use the user profile windows and constraints. Return JSON only.';

// src/services/openai.ts, gemini.ts, nvidia.ts
import { SCHEDULE_SYSTEM_PROMPT } from './ai/prompts';
```

One authoritative source means one place to update, zero drift, and no guessing which variant is canonical.

## Pattern 5: Avoid `extraSlot ? extraSlot : null` — use `extraSlot || null`

React renders `undefined`, `null`, and `false` identically (nothing), so `|| null` is cleaner and functionally identical.

## Pattern 6: Declare variables before consuming them

When using an object map that references functions/variables, define the functions first, then the map that references them. TypeScript will error on `used before its declaration` if the order is wrong.

## Verification checklist

After any code change:

1. `npx tsc --noEmit` — 0 errors
2. `npx eslint --cache <changed-files>` — 0 errors (pre-existing warnings OK)
3. `npx jest --silent` — all suites pass
