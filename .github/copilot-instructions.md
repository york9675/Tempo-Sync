# Tempo Sync – AI Coding Agent Guide

## Project map
- `index.html` is the only entry point; every control is wired by `id` and expected by `Metronome` in `script.js`.
- `script.js` defines the `Metronome` class (≈2100 lines) handling audio, presets, theming, custom dialogs, and is instantiated once at the bottom.
- `styles.css` holds all layout/theming, using CSS variables keyed by `data-theme` on `<html>`; update theme blocks alongside JS catalog changes.
- `404.html` powers the GitHub Pages fallback and reuses shared branding assets from the root.
- `Screenshots/` and static assets live beside the page; no build pipeline generates them.

## Runtime & audio scheduling
- Web Audio is scheduled ahead via `scheduler()` + `setInterval` using `scheduleAheadTime`/`lookahead`; respect these when tweaking timing.
- Visibility changes call `updateSchedulingForVisibility()` to lengthen lookahead in background and resume the `AudioContext`.
- Beats are rendered by `playClick()` (triangle oscillator) and mirrored in the UI through `updateBeatDisplay()` queued with `setTimeout`.
- `togglePlay()` lazily creates the `AudioContext` and resumes it on interaction; avoid creating extra contexts or the browser will block audio.

## State & persistence
- User settings persist in `localStorage` under `tempoSyncSettings`; `saveSettings()` and `loadSettings()` serialize tempo, volume, time signature, theme, presets, and `lastPlayed`.
- When adding new stored fields, update `snapshotCurrentSettings()`, `recordLastPlayed()`, `normalizePreset()`, and `normalizeLastPlayed()` to keep migrations safe.
- Tempo is clamped to 20–300 BPM, beats per measure to 1–16, volumes to 0–100; reuse helper methods instead of bypassing validations.

## UI panels & accessibility
- Preset management lives in the side panel (`presetPanel`) with virtual grouping (`buildPresetSections()`); keep aria attributes (`aria-expanded`, `aria-hidden`) synced when updating markup.
- Theme selection occurs through the modal `themePanel`; buttons expect `data-theme-id` values matching `themeCatalog` entries.
- `showAlert()` renders the custom alert dialog; always resolve via `closeAlert()` to avoid dangling backdrops.
- Keyboard shortcuts are centralized in `setupKeyboardShortcuts()`; ensure new shortcuts respect focus checks and modifier guards.

## Styling & theming
- Each theme has a CSS block keyed by `[data-theme="{name}"]`; add or rename themes in both CSS and `createThemeCatalog()`.
- Component classes follow a BEM-like pattern (`preset-panel__header`, `theme-item__swatch`); keep new selectors consistent for readability.
- CSS transitions assume colors come from variables; prefer introducing new variables over hard-coded colors.

## Developer workflow
- No bundler or test runner exists; open `index.html` directly or serve locally (e.g. `npx serve .` or `python -m http.server`).
- CDN assets (Font Awesome) require an internet connection; offline dev may need a local copy if tooling complains.
- Clear `localStorage` (`tempoSyncSettings`) when validating onboarding flows or preset migrations.

## Extension tips
- New UI controls should be declared in `index.html` with stable `id`s, then captured in the `Metronome` constructor before use.
- Factor reusable logic into `Metronome` methods rather than standalone globals so state (e.g., `isRestoringSettings`) stays centralized.
- For additional audio cues, reuse `masterGain` and `pendingAudioEvents` cleanup helpers to avoid leaks.
- When expanding presets (e.g., swing, subdivisions), ensure `renderPresetItem()` and form validation surface the new fields.
