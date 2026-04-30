# Phase 32: Coordination & Transition - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 32-Coordination & Transition
**Areas discussed:** Timing Logic, Transition Animation, macOS Reactivation, Implementation Location

---

## Timing Logic

| Option | Description | Selected |
|--------|-------------|----------|
| Promise.all() pattern | Wait for BOTH: 1s timer AND ready-to-show | ✓ |
| Minimum time only | Always show 1s regardless of readiness | |
| Race pattern | Show whichever comes first | |

**User's choice:** --auto mode selected Promise.all() pattern (recommended default)
**Notes:** Prevents splash flash on fast loads AND ensures splash stays until main ready

---

## Transition Animation

| Option | Description | Selected |
|--------|-------------|----------|
| Simultaneous fade | Splash fade out, main fade in sync — overlap | ✓ |
| Sequential fade | Splash fades → close → main fades in | |
| Instant switch | No fade — show/hide immediately | |

**User's choice:** --auto mode selected Simultaneous fade (recommended default)
**Notes:** Eliminates visible desktop gap between windows; 200ms duration

---

## macOS Reactivation

| Option | Description | Selected |
|--------|-------------|----------|
| Check window count before create | Only create main if 0 windows | ✓ |
| Always recreate splash on activate | Full app restart behavior | |
| Ignore activate event entirely | Break macOS convention | |

**User's choice:** --auto mode selected window count check pattern (recommended default)
**Notes:** Matches existing activate handler pattern; splash is startup-only

---

## Implementation Location

| Option | Description | Selected |
|--------|-------------|----------|
| Main process only (index.ts) | All logic in Electron main — no IPC | ✓ |
| Preload + renderer coordination | Cross-process timing sync | |
| Separate timing module | Extract to splash-timing.ts | |

**User's choice:** --auto mode selected Main process only (recommended default)
**Notes:** Keeps logic centralized; avoids IPC complexity; matches existing code structure

---

## Claude's Discretion

- Exact Promise structure and variable scoping
- Whether to use CSS, Electron opacity API, or combination
- Exact easing curve for fade animations
- Event listener cleanup approach

---

*Discussion log created: 2026-04-30*
*Mode: --auto (automatic discussion with recommended defaults)*