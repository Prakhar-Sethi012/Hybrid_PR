# HybridMemoryLab — Design System Master Specification
**Document Version:** 3.0.0  
**Authority:** UI/UX Pro Max Design Intelligence (`ui-ux-pro-max`)  
**Product Class:** Interactive Operating Systems Research Simulator & Memory Observatory  
**Target Architecture:** Desktop, Tablet, Mobile (React 19 + Tailwind CSS + Lucide + Recharts)

---

## 1. Product Positioning & Target Audience

### 1.1 Product Positioning
**HybridMemoryLab** is a specialized scientific instrument and memory observatory for evaluating, analyzing, and demonstrating the **Adaptive Hybrid Page Replacement Algorithm** alongside classic operating systems memory policies (FIFO, LRU, LFU).

Unlike consumer SaaS dashboards or recreational "hacker/dark gaming terminals," HybridMemoryLab adopts an **editorial research-tool aesthetic**:
- A warm, softly tinted light canvas reminiscent of high-precision research apparatus and scientific papers.
- Crisp, near-ink typography with strict proportional sans-serif for interface text and selective monospace solely for machine data (page numbers, ticks, frame indices, nanosecond latencies).
- Clear cause-and-effect observability: every memory access immediately communicates its target, whether it hit or faulted, which victim was evicted, whether a dirty write-back penalty ($\delta$) was incurred, and how the physical frame map updated.
- Strictly honest, data-derived performance reporting without artificial marketing jargon or hardcoded claims.

### 1.2 Target Audience & User Personas
1. **Operating Systems Students**: Need to step through reference traces tick-by-tick, see exactly why an eviction occurred, understand recursive LRFU decay $S(p)$, and observe why dirty pages incur an eviction cost $C(p) = S(p) + \delta$.
2. **OS Instructors & Researchers**: Require synchronized side-by-side divergence analysis (running FIFO, LRU, LFU, and AdaptiveHybrid on the exact same trace) to demonstrate locality failure modes (such as cyclic loop thrashing) and benchmark metrics across workloads.
3. **Systems Engineers**: Demand fast reproducible simulations across synthetic patterns (Sequential, Loop, Random, Zipf 80/20) with precise Effective Access Time (EAT) calculations down to nanosecond precision.

---

## 2. Information Architecture & User Journeys

### 2.1 Core Information Architecture
The application is structured into three primary observatory lenses accessible via top-level tab navigation:

```
HybridMemoryLab
├── Header & Global Status Strip (System Version, Port Health, Trace Context)
├── Scenario Composer (Algorithm, Workload, Frames, References, Write %, Seed, Presets)
└── Primary Observatory Workspaces (Tabbed Views)
    ├── Lens 1: Simulation Lab (Default Stepper)
    │   ├── Performance Metric Ribbon (Hit Ratio, Faults, Dirty Writes, Thrash Suspends, EAT)
    │   ├── Hero Memory Request Stream (Current Access, Action, Target, Eviction & Dirty Flag)
    │   ├── Scrubbable Timeline Player & Keyboard Transport Controls
    │   ├── Algorithmic Decision Narrative (Live reasoning from decision_log)
    │   ├── Physical Memory Map (RAM frame matrix, Clean/Dirty states, Selection Drawer)
    │   └── Frame Inspector Drawer (Deep dive into resident page, score, load time, dirty bit)
    │
    ├── Lens 2: Synchronized Divergence Analysis (4-Way Comparison)
    │   ├── Divergence Alert & Concordance Banner
    │   ├── Synchronized Step Transport
    │   └── 4-Way Algorithmic Comparison Grid (AdaptiveHybrid, LRU, LFU, FIFO)
    │       ├── Current Step Action & Latency
    │       ├── Resident Memory State Micro-Map
    │       └── Running Cumulative Metrics (Hits, Faults, Hit %, Dirty Writes, EAT)
    │
    └── Lens 3: Benchmark Suite Analysis
        ├── Metric Lens Toggle: Effective Access Time (ms) | Hit Ratio (%) | Dirty Writes
        ├── Recharts Comparative Clustered Column Chart (4 Workloads × 4 Algorithms)
        ├── Dynamic Matrix Data Table with Sorting and Delta Comparison
        └── Data-Derived Analytical Takeaways (Empirically computed, zero hardcoded claims)
```

### 2.2 Primary User Journeys
1. **Single Policy Deep Dive (Simulation Lab)**:
   - Configure a workload (e.g., Zipf Hot/Cold with 10 frames and 20% writes) or pick a preset.
   - Click "Execute Simulation".
   - Step tick-by-tick using Space / Arrow keys or scrubber.
   - Inspect frame 4 to see its hybrid score $S(p)$ decay over idle ticks and observe how dirty flag updates on write access.
2. **Locality Divergence Discovery (Comparison Mode)**:
   - Run a Loop workload exceeding memory capacity (e.g., 15-page loop on 10 frames).
   - Advance synchronized steps to the point where FIFO and LRU begin cascading misses, while AdaptiveHybrid retains high-frequency core pages.
3. **Hardware Latency Evaluation (Benchmark Suite)**:
   - Switch to Benchmark View to inspect full $4 \times 4$ testing matrix.
   - Switch between EAT (which heavily penalizes dirty write-backs at 10ms each) and raw Hit Ratio to see how write-back avoidance improves real-world access time.

---

## 3. Visual Direction & Spatial System

### 3.1 Design Principles
- **Editorial Clarity over Dark Clutter**: Abandon the dense black-on-black terminal look in favor of a warm parchment/stone research environment with high-contrast text and crisp mechanical outlines.
- **Data-First Visual Hierarchy**: Interface chrome recedes into muted warm grays; active memory events (hits, faults, write-backs) emerge with unmistakable semantic clarity.
- **Restraint**: Zero gratuitous gradients, zero neon glows, zero decorative glassmorphism. Rounded corners are modest (6px to 10px) to maintain a calibrated scientific instrument appearance.
- **Proportional vs. Monospace Discipline**: Proportional sans-serif (`Inter`) is used for all UI copy, labels, descriptions, and narratives. Monospace (`JetBrains Mono`) is reserved strictly for numerical values, addresses, page/frame IDs, timestamps, and memory dumps.

### 3.2 Spacing & Layout Grid
Built on a standard 4px/8px modular scale:
- `--space-1` = `4px` (hairline offsets, tight pill gaps)
- `--space-2` = `8px` (button internal padding, compact card gaps)
- `--space-3` = `12px` (standard input/badge padding)
- `--space-4` = `16px` (card content padding, toolbar spacing)
- `--space-5` = `20px` (component separation)
- `--space-6` = `24px` (major section gutters)
- `--space-8` = `32px` (workspace boundary margins)

### 3.3 Radii & Borders
- `--radius-sm`: `4px` (micro badges, frame sub-cells)
- `--radius-md`: `6px` (buttons, select controls, small cards)
- `--radius-lg`: `10px` (major panels, physical frame visualizer container)
- `--border-subtle`: `1px solid #E4E4E7` (Zinc-200)
- `--border-strong`: `1px solid #CBD5E1` (Slate-300)
- `--border-active`: `2px solid #2563EB` (Cobalt focus/active state)

---

## 4. Color System & Semantic Tokens

### 4.1 Structural Neutral Palette (Warm Stone / Research Paper)
```css
:root {
  /* Canvas & Containers */
  --bg-app: #F8F9FA;              /* Soft warm research canvas */
  --bg-surface: #FFFFFF;          /* Pure white instrument panels */
  --bg-subtle: #F1F3F5;           /* Recessed toolbars, input backgrounds */
  --bg-muted: #E9ECEF;            /* Inactive tabs, divider zones */

  /* Text & Inks */
  --text-primary: #18191B;        /* Near-ink charcoal, contrast > 14:1 */
  --text-secondary: #495057;      /* Precise secondary body text, contrast > 7:1 */
  --text-muted: #6C757D;          /* Micro captions, helper text, contrast > 4.5:1 */
  --text-subtle: #ADB5BD;         /* Disabled text, inactive indicators */

  /* Structural Dividers */
  --border-light: #E9ECEF;        /* Subtle table rules */
  --border-default: #DEE2E6;      /* Panel containers, card edges */
  --border-strong: #CED4DA;       /* Interactive input borders */

  /* Primary Accent: Technical Cobalt */
  --primary: #1D4ED8;             /* Blue-700 */
  --primary-hover: #1E40AF;       /* Blue-800 */
  --primary-subtle: #EFF6FF;      /* Blue-50 */
  --primary-border: #BFDBFE;      /* Blue-200 */
}
```

### 4.2 Semantic Memory Event Palette
Every memory event has a dedicated 3-tier token set (Text, Surface, Border):

| Event Role | Hex Base | Text Color | Surface Tint | Border Tint | Usage |
|:---|:---|:---|:---|:---|:---|
| **Hit** | `#059669` | `#065F46` | `#ECFDF5` | `#A7F3D0` | Page already resident in physical RAM |
| **Fault** | `#DC2626` | `#991B1B` | `#FEF2F2` | `#FECACA` | Page missing; triggers 10ms disk read |
| **Dirty Page** | `#D97706` | `#92400E` | `#FFFBEB` | `#FDE68A` | Modified frame; eviction triggers 10ms disk write |
| **Clean Page** | `#0284C7` | `#0369A1` | `#F0F9FF` | `#BAE6FD` | Unmodified frame; eviction is instant (0ms penalty) |
| **Empty Frame** | `#64748B` | `#475569` | `#F8FAFC` | `#E2E8F0` | Unallocated physical slot (dashed border) |
| **Write Reference** | `#D97706` | `#B45309` | `#FEF3C7` | `#FCD34D` | Store instruction (`is_write: true`) |
| **Read Reference** | `#475569` | `#334155` | `#F1F5F9` | `#E2E8F0` | Load instruction (`is_write: false`) |
| **Thrashing Alert**| `#E11D48` | `#9F1239` | `#FFF1F2` | `#FECDD3` | Process suspended for cooling interval |

### 4.3 Algorithm Identity Palette
Used consistently in comparisons, benchmarks, and legends:
- **AdaptiveHybrid**: Emerald Teal (`#0D9488`, tint `#F0FDFA`, border `#99F6E4`)
- **FIFO**: Warm Ochre Amber (`#D97706`, tint `#FFFBEB`, border `#FDE68A`)
- **LRU**: Precision Indigo (`#3B82F6`, tint `#EFF6FF`, border `#BFDBFE`)
- **LFU**: Royal Violet (`#8B5CF6`, tint `#F5F3FF`, border `#DDD6FE`)

---

## 5. Typography Specification

### 5.1 Font Families
- **Interface & Prose Font**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Data & Metric Font**: `"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace`

### 5.2 Type Scale
- **Display / Masthead**: 20px / 1.3 font-bold, tracking -0.02em (Inter)
- **Section Heading**: 15px / 1.4 font-semibold, tracking -0.01em (Inter)
- **Subheading / Panel Title**: 13px / 1.4 font-medium, tracking 0.01em (Inter)
- **Body Text**: 13px / 1.5 font-normal (Inter)
- **UI Labels & Buttons**: 12px / 1.4 font-medium (Inter)
- **Numeric Values / Latency / Metrics**: 14px–24px font-semibold (JetBrains Mono)
- **Micro Code / Page IDs / Badges**: 11px font-mono, tracking 0.02em

---

## 6. Physical Memory (RAM) Map Visualization Rules

1. **Physical Layout Representation**:
   - Frames must be organized in an intuitive 2-column, 4-column, or auto-fit grid labeled with explicit physical indices (`Frame 00`, `Frame 01`, etc.).
   - Occupied frames must prominently show the **Resident Page Number** in high-contrast monospaced type (`P04`).
2. **State Differentiation Without Color Blindness Failure**:
   - **Clean Frames**: Blue/cyan subtle badge, solid border, clear `CLEAN` text tag, eviction disk cost: `0ms`.
   - **Dirty Frames**: Amber/orange badge with flame icon, distinct dashed-or-solid amber border, clear `DIRTY` tag, eviction disk cost: `+10ms`.
   - **Empty Frames**: Muted dashed border, light diagonal hash pattern or `VACANT` label.
3. **Active Eviction & Target Marker**:
   - The frame affected by the current access displays an active highlight ring (`ring-2 ring-primary ring-offset-2`).
   - If an eviction occurred, a prominent badge indicates `EVICTED P[x]`.
4. **Interactive Detail Inspection Drawer**:
   - Clicking any frame opens or updates the **Physical Frame Inspector**:
     - Frame ID, Resident Page, Owning Process ID.
     - LRFU Hybrid Score $S(p)$ formatted to 4 decimals.
     - Eviction Cost $C(p) = S(p) + (\delta \text{ if dirty else } 0)$.
     - Access Count (LFU frequency component).
     - Last Referenced Tick $\Delta t$ (LRU recency component).
     - Load Tick (FIFO arrival timestamp).
     - Dirty Bit status with hardware write-back explanation.

---

## 7. Responsiveness & Breakpoint Architecture

| Breakpoint | Width | Layout Behavior |
|:---|:---|:---|
| **Mobile (`sm`)** | `< 640px` (375px min) | Single column layout. Scenario Composer collapsible. Timeline controls wrap into stacked rows. Comparison mode displays stacked cards with swipe/selector. RAM frames display in 2-column grid. |
| **Tablet (`md`)** | `640px – 1023px` | Two-column stacked layout. Scenario Composer on top or collapsible. Comparison mode 2×2 grid. RAM frames in 4-column grid. |
| **Desktop (`lg`)** | `1024px – 1439px` | Fixed-width sidebar Scenario Composer (320px) + flexible main observatory canvas. Comparison mode 2×2 or 4-row view with full synchronized stats. |
| **Wide Desktop (`xl`)** | `≥ 1440px` | 360px sidebar + expansive observatory workspace with side-by-side RAM map and live decision narrative. |

---

## 8. Accessibility & Interaction Contracts

1. **Contrast Compliance**:
   - All text achieves a minimum contrast ratio of **4.5:1** against its immediate background. High-emphasis text exceeds **7:1**.
   - No data state relies solely on hue; every state pairs a distinct color with an unambiguous textual label or symbol (e.g., `HIT` vs `FAULT`, `CLEAN` vs `DIRTY`).
2. **Keyboard Navigation & Transports**:
   - `[Space]`: Toggle Play / Pause simulation playback.
   - `[ArrowLeft]`: Step backward 1 reference tick.
   - `[ArrowRight]`: Step forward 1 reference tick.
   - `[Home]`: Jump to start (Tick 0).
   - `[End]`: Jump to final step.
   - Form inputs and scrubber maintain visible focus rings (`focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2`).
3. **Motion Sensitivity (`prefers-reduced-motion`)**:
   - All auto-play intervals transition immediately without bouncy or sliding transitions when `prefers-reduced-motion: reduce` is active.
4. **Screen Reader Semantic Roles**:
   - Interactive timeline scrubber uses standard semantic `<input type="range" aria-label="Simulation trace scrubber" ... />`.
   - Action badges provide descriptive `aria-label`s (e.g., `aria-label="Access outcome: Page Hit"`).

---

## 9. Algorithmic Comparison & Benchmark Principles

1. **No Hardcoded Bias**:
   - Never declare an algorithm "immune" or "best" in static text.
   - Observations must be derived programmatically from the received API payload:
     - Compare actual `hit_ratio` and `eat` between algorithms.
     - Note when AdaptiveHybrid achieves a lower EAT specifically due to dirty page write-back avoidance or when frequency-protection retains a looping set.
2. **Synchronous Divergence**:
   - At each tick, compare the actions of all four algorithms.
   - When one algorithm hits while another faults, prominently badge the step as a **Divergence Moment** to help students identify policy differences.
