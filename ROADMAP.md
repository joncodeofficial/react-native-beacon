# Roadmap

## Reliability and validation

### Cross-platform confidence

- [ ] Add iOS build validation in CI
- [ ] Validate on real iPhone hardware
- [ ] Test with multiple beacon vendors:
  - Estimote
  - Kontakt.io
  - Minew

## Background reliability (Android)

Ordered by value vs. cost/risk, scored 0–10. Score reflects whether it's worth
building as-is, not raw demand for it.

- [ ] **Lifecycle events: `onForegroundServiceStart` / `onForegroundServiceStop` / `onBackgroundStateChange`** — **9/10**
  Cheap, fits the existing event-emitter pattern (`onRangingFailed`,
  `onScannerStateChanged`, ...). Gives production apps visibility into *when
  and why* scanning stopped — the actual pain point behind most of the other
  items below.

- [ ] **Config & region persistence** (auto-save `configure()` + active regions,
  restore after process restart) — **8/10**
  Fixes a real race condition: today, if the OS kills and restarts the
  process, `configure()` and ranging state are gone until JS re-runs.
  Prerequisite for boot auto-start to actually restore the right state.

- [ ] **Auto-resume scanning after device reboot** (`BOOT_COMPLETED` +
  foreground service) — **7/10**
  `BOOT_COMPLETED` is an explicit, documented exemption to Android 12+'s
  foreground-service background-start restrictions — technically sound.
  Two hard limits no library code can remove, must be documented rather than
  "solved":
  - Does nothing if the app is in Android's force-stopped state — no
    broadcast fires until the user reopens the app.
  - On Xiaomi/MIUI/HyperOS, also needs the OEM's own "Autostart" permission
    granted ahead of time (`openAutostartSettings()` opens that screen but
    can't grant it).
  Skip `directBootAware`/Direct Boot — storage is inaccessible pre-unlock
  without extra complexity, and there's no real need to scan beacons in the
  ~10s before a worker unlocks their phone.

- [x] **Enhanced foreground-service notification** (channel, icon, color,
  actions, dynamic text update) — **6/10**
  Backward-compatible UX polish for any app using `foregroundService: true`,
  not niche to one use case. Action buttons need a PendingIntent → JS event
  round-trip — moderate native work, well-trodden pattern.
  Shipped: `foregroundServiceNotification.color/showStopAction/stopActionText`,
  a fixed default notification icon, `Beacon.updateNotification()` for live
  text/title updates, and `Beacon.onForegroundServiceStopPressed()` fired
  after the native side stops all active regions and the foreground service.

- [ ] **Motion-adaptive scan duty cycling (research spike)** — **6/10**
  Lower scan frequency (never to zero) when stationary *and* no beacon
  currently in range; raise it on movement or once a beacon is in range.
  Must never fully stop scanning while stationary — that's often the exact
  moment detection matters (e.g. a worker standing next to fixed equipment).
  Touches two separate native motion APIs (iOS `CMMotionActivityManager`,
  Android significant-motion sensor / ActivityRecognition) — prototype
  before committing.

- [ ] **OEM compatibility check, verifiable state only** (wraps
  `isIgnoringBatteryOptimizations()` + manufacturer string) — **5/10**
  Thin convenience wrapper around what already exists; low risk, modest
  value.

- [ ] **Unified `backgroundMode` enum** (`"foreground-service" | "aggressive" |
  "balanced" | "none"`) — **4/10**
  Pure ergonomics — same capability as today's `foregroundService` +
  `aggressiveBackground` flags, just renamed/bundled. Adds a second way to
  say the same thing unless the old flags are deprecated, which is its own
  migration cost for little new value.
  If ever built: ship `backgroundMode` additively first and mark
  `foregroundService`/`aggressiveBackground` `@deprecated` in JSDoc/types
  without breaking them (`feat:`, minor bump) — only remove the old flags in
  a later release with its own `BREAKING CHANGE:` commit. Note this package
  is still `0.x`, so per the existing precedent (`openAutostartSettings()`,
  0.10.2 → 0.11.0) a breaking change bumps the minor version, not `1.0.0`.

