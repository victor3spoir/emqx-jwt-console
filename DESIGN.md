# EMQX Console design system

## Authority and visual reference

The approved direction is the dark admin/user-detail screenshot supplied on 2026-11-03 (`codex-clipboard-096668c1-ad9b-4ccb-a16c-3477e43bcf92.png`). It replaces the previous CorpScale navy palette and serif heading direction.

This file owns global visual foundations and component/color rules. [Admin layout and page patterns](docs/design/admin-layout.md) owns the console shell, directory/detail composition, measured screenshot observations, and responsive adaptations. `src/styles.css` is the executable source of truth for token values; change this document and the stylesheet together.

The reference is visual evidence, not a feature specification. Its browser chrome, browser tab sidebar, cursor, personal data and webcam overlay are not product elements. Its organizations/providers/sessions tabs do not authorize adding those features to this single-organization device product.

This change establishes the shared skin and documents layout targets. The complete reference shell and a new detail page are not implemented merely by updating tokens.

## Direction

Use a near-black canvas, slightly blue charcoal sidebar/cards, modestly lighter field and footer surfaces, off-white text, muted gray supporting text, fine dividers, and restrained mint/green status accents. Structure comes from alignment, spacing, surface levels and text hierarchy. Most of the screen remains neutral.

Use practical sans-serif headings throughout the application. Reserve filled primary buttons for the main next action; most per-section Save, Upload and secondary actions are small neutral outlined buttons. Keep dense information readable without inflating it into decorative metric cards.

## Color foundations

The screenshot's repeated flat regions were sampled directly: canvas around `#090B0A`, sidebar and card body `#15191C`, footer around `#191E21`, field fill around `#1C1F24`, and selected navigation around `#1E2326`. Compression, scaling and antialiasing affect edge/text pixels. The following is an adopted, internally consistent palette, not a claim that every value is the original site's exact CSS.

| Role / CSS variable | Value | Use |
|---|---|---|
| `--background` | `#090B0A` | Main page canvas |
| `--foreground` | `#ECEFEE` | Main body text and headings |
| `--card`, `--sidebar` | `#15191C` | Settings cards and navigation rail |
| `--surface-footer`, `--muted` | `#191E21` | Card action strips, quiet supporting surfaces |
| `--surface-inset` | `#1C1F24` | Text inputs, selects, inset controls |
| `--popover` | `#1B2023` | Menus and modal content |
| `--secondary`, `--sidebar-accent` | `#1E2326` | Neutral buttons and selected navigation |
| `--accent` | `#252D31` | Hover/selected neutral control surface |
| `--muted-foreground` | `#A3AAA7` | Descriptions, metadata labels, placeholders |
| `--border`, `--sidebar-border` | `#2A3035` | Decorative dividers and surface edges |
| `--input` | `#5E6B75` | Interactive field outlines |
| `--ring`, `--sidebar-ring` | `#8ABFA9` | Visible keyboard focus |
| `--primary`, `--sidebar-primary` | `#E4E9E7` | Main action fill and strong neutral emphasis |
| `--primary-foreground` | `#111615` | Text on primary fills |
| `--overlay` | Black at 65% | Modal backdrop only |

The field outline is deliberately stronger than the source screenshot so controls are easier to identify. Decorative card dividers may remain subtle; they do not replace interactive boundaries or focus rings.

### Semantic states

| Meaning | Accent token | Surface token | Text token |
|---|---|---|---|
| Active / success | `success` `#65CBA3` | `success-surface` `#0C392C` | `success-foreground` `#95E1C2` |
| Caution / pending | `warning` `#E4C383` | `warning-surface` `#3A2D16` | `warning-foreground` `#F4D28C` |
| Informational | `info` `#9BBFE0` | `info-surface` `#192D40` | `info-foreground` `#A8C7E8` |
| Error / revoked | `destructive` `#FDA4AF` | `destructive-surface` `#3B1820` | `destructive` `#FDA4AF` |
| Disabled / ordinary classification | Neutral secondary | `secondary` | `secondary-foreground` |

Pair semantic surface/text tokens as shown. Do not assume a `*-foreground` token is readable on every other fill. The special `destructive-foreground` token is for text on a solid destructive fill, not for text on `destructive-surface`.

Green in the screenshot highlights a privileged role. That is evidence for restrained semantic emphasis, not a rule to make every label green. For this product, active devices use green, disabled devices use neutral styling and revoked devices use destructive styling. A label or icon must accompany the color.

### Enforceable color rules

1. Define all UI colors in `src/styles.css`, then expose them with `@theme inline`. Hex/RGB/OKLCH literals belong only in the token definitions; documentation may quote their values.
2. In components use semantic utilities: `bg-background`, `bg-card`, `bg-surface-footer`, `bg-surface-inset`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`, `ring-ring`, and the sidebar/state tokens.
3. Use role-specific tokens. The old instruction to use only primary colors is superseded: primary does not mean every border, label, selection or status.
4. Do not add palette utilities such as `bg-zinc-900`, hardcoded `bg-white`, `bg-black`, arbitrary color literals, inline color styles, or local `dark:` color replacements. Add a justified semantic token when a new role is needed.
5. Use a neutral selected surface for navigation. Mint is reserved for focus and semantic accents; the old navy/blue navigation highlight is retired.
6. Use `bg-overlay` for backdrops, not a locally chosen black opacity. Use component variants for badges and buttons instead of overriding their colors at call sites.
7. Never reduce text opacity to imitate low-contrast source details. Supporting text uses `muted-foreground`; state text uses its matching semantic pair. Reduced opacity is reserved for truly disabled controls with their actual disabled state.
8. Charts may use `chart-1` through `chart-5` (mint, blue, lavender, amber, slate). Those colors are data encodings, not general UI decoration. Keep labels/legends and do not add charts without real product data.
9. Dark is the reference/default palette. Light mode is a complete role-preserving adaptation defined by `.light`; never implement it through isolated white overrides. The root HTML element carries the saved `.dark` or `.light` class, and each palette declares the matching native `color-scheme`.

## Light mode and appearance preference

The screenshot establishes dark mode. Light mode is a deliberate project extension using the same surface hierarchy, typography, geometry and semantic meanings. White cards sit on an off-white canvas, with subtle gray-green supporting surfaces and dark neutral text/actions. Do not introduce a different layout or a new blue primary brand in light mode.

| Light role | Value |
|---|---|
| Canvas / main text | background `#F7F9F8` / foreground `#17201D` |
| Cards and popovers | `#FFFFFF` |
| Footer / inset field | `#F1F4F2` / `#F8FAF9` |
| Secondary / hover | `#EDF1EF` / `#E2EAE5` |
| Supporting text | `#526159` |
| Divider / interactive edge | `#D5DDD8` / `#7B8981` |
| Primary pair | `#1F3029` / `#F6FAF8` |
| Focus | `#267052` |
| Success surface / text | `#E0F3E9` / `#12603E` |
| Warning surface / text | `#FCF1D7` / `#76500B` |
| Info surface / text | `#E7F0FA` / `#244D72` |
| Destructive surface / text | `#FCE9ED` / `#A51D35` |
| Sidebar / selection | `#F0F3F1` / `#E1E8E3` |

The console header exposes an accessible button naming the next theme (Light theme or Dark theme). Persist the validated choice in the non-sensitive `emqx-console-theme` cookie for one year. SSR reads the same preference before rendering so refreshes and direct links retain the theme without a mismatched first paint. Invalid/missing values default to dark. Theme changes do not alter authentication or device state.

## Typography

The screenshot shows a compact neutral sans-serif; its precise family cannot be reliably identified from pixels. Use the already installed, locally hosted **Instrument Sans Variable** for body and headings. Use the platform monospace stack for machine IDs, identifiers and code. Do not reintroduce serif application headings or load an external font to guess the source family.

| Role | Adopted size / line height | Weight / treatment |
|---|---|---|
| Page / identity title | 24 / 32 px | 600–700, slightly tight tracking |
| Card title | 14 / 20 px | 500–600 |
| Body / editable values | 14 / 20–22 px | 400 |
| Controls / navigation | 13–14 / 20 px | 400–500 |
| Description / helper | 12–13 / 18–20 px | Muted, readable |
| Metadata label | 11–12 / 16 px | Uppercase, modest tracking |
| Machine identifier | 12–13 / 18–20 px | Monospace, copy action when useful |

The source's rendered text appears smaller because the screenshot is scaled. These values preserve hierarchy with readable application text. Use 16 px text inputs on touch devices where needed to avoid browser auto-zoom.

## Geometry, spacing and motion

Use a 4 px base grid: 4, 8, 12, 16, 24 and 32 px. Typical card interior is 16 px; gaps between settings cards and between main content/metadata are 24 px. Main desktop gutters are 24 px, reduced to 16 px on narrow screens.

Use 4–6 px control/chip corners and 8 px card/dialog corners. Rounded avatars are appropriate for people; use a modest rounded square or a device icon for hardware. Small status badges use modest corners, not oversized pills. The stylesheet base radius is 6 px, with derived radii supplied to the existing components.

Separate surfaces primarily with fills and 1 px edges. Avoid heavy shadows on ordinary cards. Stronger elevation belongs to floating menus and dialogs. Animation should explain a state change, generally 100–160 ms, with no waiting for decorative motion. Respect the shared reduced-motion stylesheet.

## Component rules

### Settings cards

Use header/title, concise description, editable body, and a full-width footer separated by a fine top edge. The footer uses `surface-footer`, puts a relevant constraint/hint on the left and a local Save action on the right. Cards form a vertical sequence; the metadata column is not a stack of duplicate cards.

Save only the section being edited. Keep current values on failure and show the error nearby. A disabled Save means no change or an operation in progress; do not render a permanently disabled decorative control. See the layout guide for exact anatomy and responsive stacking.

### Fields and actions

Use existing Field/Input/Select components with labels, explicit optional markers, matching helper/error IDs and visible focus. Inputs use `surface-inset` and `input` borders. Keep form fields constrained to useful reading widths. Standard desktop controls are 32–36 px tall; expand targets to about 44 px for touch where needed.

Secondary controls use neutral outlined/secondary variants. A primary button is reserved for the main page/form action. Destructive controls use semantic variants and consequences in plain language. Menus may hold infrequent actions; the main task must remain discoverable.

### Status, tables and feedback

Use a compact badge or status dot plus text. Status is not the primary CTA. Tables have flat header/body structure, subtle dividers and real search/pagination where needed. Do not require bulk actions, inline editing or analytics on every list; implement only useful, authorized behavior.

Support loading, no records, no filter matches, errors, success and insufficient permissions without fabricated counts or placeholder controls. Preserve related query/list position after changes. Keep mutation feedback close to its action.

### Device dialogs: explicit dismissal

The project's confirmed behavior overrides generic modal defaults: device creation/editing and one-time credentials use AlertDialog. Outside clicks and Escape must not dismiss them. Save success changes the content inside the same open dialog; the user closes it through **Close** or **I have saved the secret**. Copying a secret must not dismiss it. Disable duplicate submission and close controls while a save is pending. Keep large forms internally scrollable, trap focus, and restore focus to the trigger on explicit close.

Never expose credentials in metadata, table cells, URLs, screenshots for delivery, logs or reusable design fixtures. One-time provisioning secrets are an explicitly authorized, transient exception inside their dialog.

## Accessibility and implementation checks

- Use at least 4.5:1 for normal text and 3:1 for large text. Use distinguishable interactive edges and clear keyboard focus. Do not claim WCAG conformance from palette checks alone.
- Token contrast checks cover main text/canvas, muted text/cards, primary pairs and semantic badge pairs. Test the actual rendered opacity/composition too.
- Keep semantic landmarks, links, headings, table headers and labeled icon actions. A clickable row is an enhancement to an actual link.
- Check 320–390 px widths, desktop, long names/IDs, zoom and keyboard navigation. Do not allow the whole page to scroll horizontally.
- Keep browser/account state, authorization and feature availability truthful. Visual permissions do not replace server checks.
- Update this file, the layout guide and token definitions together when the approved direction changes.
