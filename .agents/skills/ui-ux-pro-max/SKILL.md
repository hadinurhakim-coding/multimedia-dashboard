---
name: ui-ux-pro-max
description: "Clean, audited UI/UX design intelligence system for PLN Icon Plus multimedia and 3D web applications. Enforces strict anti-slop standards, enterprise typography hierarchy, data-dense dashboard layouts, and official PLN corporate color tokens."
---

# UI/UX Pro Max — PLN Icon Plus Enterprise Design System

This skill enforces a professional, high-fidelity, and domain-authentic design system for PLN Icon Plus web applications and 3D dashboards. It completely eliminates generic AI design clichés ("AI slop") and standardizes corporate brand tokens.

---

## 1. Official PLN Corporate Palette & Tokens

| Token Name | Hex Code | RGB | Semantic UI Function |
| :--- | :--- | :--- | :--- |
| `--pln-cyan` (Biru Cyan PLN) | `#00A2E9` | `0, 162, 233` | Primary interactive elements, active links, brand icons, primary buttons |
| `--pln-navy` (Biru Navy) | `#003B5C` | `0, 59, 92` | Visual anchor: header bar, navigation backgrounds, footers, high-contrast badges |
| `--pln-yellow` (Kuning Energi) | `#FFD100` | `255, 209, 0` | Visual highlights, active status badges, warning states, attention accents |
| `--pln-red` (Merah Petir) | `#ED1C24` | `237, 28, 36` | Critical telemetry warnings, emergency alerts, destructive actions |
| `--pln-ice` (Abu-abu Es) | `#F4F7FA` | `244, 247, 250` | Light mode section backgrounds, neutral surfaces, card containers |
| `--pln-charcoal` (Abu-abu Arang)| `#1E293B` | `30, 41, 59` | High-contrast typography (titles, body text in light mode), slate dark-mode borders |

### Dark Mode Semantic Mapping:
* **Background Canvas:** Deep charcoal / slate graphite (`#0B0F17` / `#0F172A`), never pure pitch black `#000000`.
* **Surface Containers:** Dark Navy tint (`#0F1D2B` or `#142334`) with subtle `#1E3A5F` border stroke.
* **Text:** `#F4F7FA` (ice neutral) for headlines; `#94A3B8` (slate neutral) for secondary metadata.

---

## 2. Visual Rules & Contrast Guidelines

1. **Contrast Balancing:** 
   * Never place Biru Cyan (`#00A2E9`) directly as small body text against white or ice-gray backgrounds (insufficient WCAG AA ratio). 
   * Always use Biru Navy (`#003B5C`) or Abu-abu Arang (`#1E293B`) for legible typography, reserving Cyan for borders, icons, filled buttons, and interactive active-states.
2. **Measured Accents (Zero Over-saturation):**
   * Kuning Energi (`#FFD100`) and Merah Petir (`#ED1C24`) have extremely high saturation. Use them exclusively as thin border highlights, status dot indicators, or small badges—never as large background blocks.
3. **Corporate Technology Mood:**
   * Gradients must transition naturally from **Biru Cyan (`#00A2E9`)** to **Biru Navy (`#003B5C`)**, evoking clean energy, enterprise stability, and digital telecommunication.

---

## 3. Strict Anti-Slop Directives (AI Tells Banned)

* **BANNED:** Neon purple/violet/magenta gradients (`from-purple-600 to-indigo-600`).
* **BANNED:** Identical 3-card grid feature sections with generic `Rocket`, `Zap`, `Shield` icons.
* **BANNED:** Single-word italicized headline accents (e.g. *"Empowering your enterprise with _intelligent_ systems"*).
* **BANNED:** Gratuitous decorative neon glow circles or excessive blur backdrops that degrade GPU rendering performance.
* **BANNED:** All-caps low-contrast micro-labels ("AI-POWERED PLATFORM").

---

## 4. 3D Model Studio & Dashboard Hierarchy

When generating or refactoring 3D dashboards:
1. **Viewport as the Hero:** The 3D WebGL Canvas is a functional work area, not a background decorative gimmick. It must have explicit dimension boundaries, subtle grid or ambient lighting, and interactive controls (Orbit, Geometry, Material, Wireframe).
2. **Telemetry & HUD:** Metrics must be data-dense (Render FPS, Draw Calls, Poly Count, VRAM) presented in compact, structured cards.
3. **Control Ergonomics:** Group interactive controls (sliders, color toggles, mode switches) cleanly on a dedicated side dock or bottom toolbar.
4. **Source Code Ownership:** Use Tailwind CSS utility classes and audited primitives (shadcn / Radix / Base UI). Avoid unnecessary 3rd party blackbox wrapper libraries.
