# Design Guidelines: Browser Automation System

## Design Approach: Utility-First Dashboard System

**Selected Approach**: Modern productivity tool aesthetic inspired by Linear, Vercel Dashboard, and Railway.app
- Clean, information-dense layouts optimized for workflow efficiency
- Minimal visual distractions to support technical tasks
- Clear hierarchy between primary actions and secondary information

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts) - excellent for UI density and readability
- **Monospace Font**: JetBrains Mono - for Chromium paths, URLs, logs
- **Hierarchy**:
  - Page titles: text-2xl font-semibold
  - Section headers: text-lg font-medium
  - Body text: text-sm
  - Labels/metadata: text-xs text-muted-foreground
  - Code/paths: text-sm font-mono

### Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 or p-6
- Section spacing: space-y-4 or space-y-6
- Card spacing: p-4 internal, gap-4 between elements
- Form inputs: space-y-2 for label/input pairs

**Grid Structure**:
- Main dashboard: Sidebar (240px fixed) + Main content area (flex-1)
- URL list: Single column with full-width cards
- Settings: Two-column form layout (md:grid-cols-2)
- Screenshot gallery: Responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

### Component Library

**Navigation Sidebar** (Fixed left, always visible):
- Logo/app name at top
- Primary nav items: Dashboard, History, Settings
- Active state indicator (border-l-2 accent)
- Memory usage badge at bottom
- Icon library: Heroicons

**URL Management Cards**:
- Card component with clear sections: URL display, action buttons, status badge
- Inline edit mode with text input + save/cancel
- Quick actions: Edit, Delete, Settings, Play icons
- Status indicators: Badge components (Active, Paused, Error states)

**Recording Interface**:
- Split view: Browser preview (60%) + Action timeline (40%)
- Control bar: Record/Stop/Save buttons with clear states
- Action timeline: Table component showing sequence with timestamps
- Event types: Visual icons (mouse, keyboard, scroll) + descriptions

**Settings Panels**:
- Grouped form sections with clear headers
- Chromium path: Input with "Browse" and "Test" buttons side-by-side
- Interval controls: Slider component with numeric input sync
- Toggle switches: Screenshot capture, auto-cleanup options
- Test results: Alert component showing success/error states

**History/Logs View**:
- Table component with sortable columns: Timestamp, URL, Status, Duration
- Expandable rows showing execution details
- Filter dropdown: Date range, status filter
- Screenshot thumbnails in hover cards

**Screenshot Gallery**:
- Card grid with thumbnail images
- Image metadata overlay: Timestamp, URL name
- Bulk actions toolbar: "Delete All" destructive button
- Modal for full-size image view

### Visual Patterns

**Information Density**:
- Compact table rows (py-2) for log entries
- Dense form layouts with minimal spacing
- Collapsible sections for advanced settings
- Inline actions (icons only) vs. expanded buttons

**Status Communication**:
- Badge variants: Success (green), Error (red), Active (blue), Paused (gray)
- Progress indicators for running playbacks
- Toast notifications for background operations
- Memory usage meter: Progress bar with percentage

**Interactive States**:
- Buttons: Clear hover states (subtle bg change), no animations
- Inputs: Focus rings, validation states inline
- Tables: Row hover highlighting
- Cards: No hover effects (static, information-focused)

### Animations
**Minimal approach** due to memory constraints:
- No page transitions
- No scroll animations
- Basic state changes only: fade-in for toasts (200ms)
- Loading spinners: Simple CSS rotation

### Responsive Behavior
- **Desktop (1024px+)**: Sidebar + main content, two-column forms, grid galleries
- **Tablet (768px-1023px)**: Collapsible sidebar, single-column forms, two-column gallery
- **Mobile (<768px)**: Hidden sidebar (hamburger menu), stacked layouts, single-column gallery

### Key Design Principles
1. **Clarity Over Style**: Information must be instantly scannable
2. **Action Proximity**: Controls near related content (inline edit buttons, row actions)
3. **Progressive Disclosure**: Advanced settings behind tabs/accordions
4. **Persistent Context**: Sidebar always shows system status (memory usage)
5. **Error Prevention**: Destructive actions require confirmation dialogs

This utility-first approach prioritizes workflow efficiency, information density, and system reliability - perfectly aligned with a technical automation tool running on resource-constrained infrastructure.