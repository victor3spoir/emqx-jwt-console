# Admin layout and page patterns

## Scope and provenance

This guide translates the user-supplied dark admin/user-detail screenshot dated 2026-11-03 into reusable layout rules for EMQX Device Console. It complements [global foundations](../../DESIGN.md); token values live in [the stylesheet](../../src/styles.css).

The source file is `codex-clipboard-096668c1-ad9b-4ccb-a16c-3477e43bcf92.png` (1280 × 576 image pixels). The product is visible approximately from x=250 to x=1145, below y=27. The browser's tab sidebar at x≈128–249, browser toolbar above the application, external black margins, pointer and lower-right video overlay are excluded. The video overlay obscures part of the page and is not a product help widget.

Personal names, email addresses and raw IDs in the source are examples, not fixture content. The reference has not been copied into a public asset directory. A screenshot alone cannot prove the source font, CSS units, breakpoints, save semantics, navigation behavior or hidden content. Distinguish the observations below from adopted rules.

## Visual extraction: observed evidence

| Region | Observation in the screenshot | Structural meaning |
|---|---|---|
| Product rail | x≈250–445, roughly 195 image px wide, full visible height | Stable navigation separate from page content |
| Brand area | Small Admin label with subdued product name | Quiet application identity, no large logo banner |
| Navigation | Small section label, line icons, compact rows; Users has a slightly lighter rectangular background | Section grouping and neutral selection |
| Rail footer | Organization/context entry followed by avatar/name/account control | Persistent account utilities at the bottom |
| Main canvas | Nearly black; content starts around x=469 | Dark canvas with about 24 image px inset from rail |
| Top navigation | A square sidebar toggle and a separate outlined breadcrumb capsule | Lightweight chip header without a full-width bottom rule |
| Back navigation | Small back arrow plus Users, on its own line | Return to the containing directory |
| Identity | Circular avatar, bold name with small green role badge; secondary email below | Entity identity precedes editable content |
| Page actions | Compact ellipsis aligned right of identity | Infrequent contextual actions, visually subordinate |
| Tabs | One compact segmented strip: Profile / Organizations / Providers / Sessions | Peer concerns within the current entity |
| Editable column | Cards around x≈470–903, approximately 433 image px wide | Main work area receives most available width |
| Metadata rail | Starts around x≈928, roughly 180 image px wide | Narrow, unboxed read-only support column |
| Column gap | Approximately 24 image px | Clear division without a vertical separator |
| Settings cards | Avatar card, Name card, partial Email card below viewport | Independent sections on a normally scrolling page |
| Card footer | Lighter charcoal strip, fine top divider, constraint left and Save right | Section-local action rather than one global Save |
| Metadata | Small uppercase labels above ID/date/activity, with horizontal separators | Quiet reference information, not primary form controls |

Representative flat-region colors were sampled: canvas `#090B0A`; rail/card `#15191C`; footer around `#191E21`; inputs around `#1C1F24`; selected navigation around `#1E2326`. Text, borders, badges and antialiased edges are less reliably sampled. The global palette deliberately strengthens field edges and text contrast.

These are measurements of this image, not source CSS. Use the following adopted dimensions instead of assuming the image was captured at a 1:1 CSS-pixel scale.

## Layout hierarchy

Build the shell once around authorized console routes. A page supplies its own title, actions and content; it must not recreate the sidebar or account header.

1. **Shell:** navigation rail plus main region.
2. **Main navigation row:** sidebar toggle plus breadcrumb capsule.
3. **Page identity:** optional back link, identity/title block and contextual actions.
4. **Local navigation:** relevant tabs when there are multiple implemented concerns.
5. **Work area:** editable content alongside optional read-only metadata.
6. **Section:** heading, description, fields/content and local action footer.

This is a detail/settings composition. A device directory uses the same shell but replaces identity/tabs/settings columns with title, toolbar, table and pagination. Do not force every page into a two-column detail layout.

## Adopted shell specification

| Element | Target |
|---|---|
| Sidebar width | 200 px (`--console-sidebar-width: 12.5rem`), growing to 224 px only when real labels require it |
| Sidebar surface | `sidebar`; fine `sidebar-border` edge only if separation needs it |
| Sidebar horizontal padding | 12 px |
| Brand region | About 48–56 px tall; text-first identity |
| Navigation rows | About 32–36 px tall, 8 px icon/text gap, 6 px corners |
| Navigation icons | 16 px line icons from the existing icon library |
| Main desktop inset | 24 px (`--console-gutter`) |
| Content maximum | 1152 px (`--console-content-max-width: 72rem`), shared by breadcrumb and page wrapper |
| Header controls | Around 32 px visual height; provide usable hit areas |
| General vertical rhythm | 16 px within a concern, 24 px between sections |

Keep the sidebar as a flex column spanning the viewport, with the main navigation allowed to scroll and the account footer anchored after it. No floating rail detached from the app frame. Keep the current section selected on its detail pages.

For this deployment there is only one organization. Do not copy an organization picker or a second organization destination solely because the screenshot has them. The footer can show the current admin and a real sign-out/account control. Never create dead menu entries to imitate the source.

### Breadcrumb/header treatment

Use the reference's lightweight chip header: a square outlined sidebar toggle, then a separate outlined capsule containing home, ancestor labels and the current entity. Avoid adding a second full-width branded toolbar or a thick divider under these chips. Page identity belongs below this navigation row.

Prefer human-readable labels resolved from authorized page data. Machine IDs can be truncated visually where necessary, with accessible full text/copy behavior. Ancestors are links and the current item has current-page semantics. Icon-only controls need accessible names.

The source does not prove sticky behavior. Adopt a sticky top navigation row for long pages when useful, using the canvas surface and no conspicuous blur. Keep the row and page content aligned to the same gutter/max-width.

## Appearance and audit navigation

Add an accessible dark/light toggle to the current console header alongside account utilities. In a future chip-header implementation it belongs in the trailing utility area, separate from entity actions. Both themes use the same shell and hierarchy; the screenshot supplies only the dark reference. Theme choice persists across refresh/navigation.

The console navigation includes **Devices** and **Audit log**, with exactly one active destination. Audit log is an admin-only directory at `/console/audit`: newest-first UTC time, action, actor, resource ID and outcome, plus search by action/actor ID/resource ID, outcome filter, refresh and pagination. Use neutral surfaces and the established success/denied state variants. Ordinary users cannot see audit records by navigating or calling the API directly.

Audit entries are read-only here. The current events cover device changes, credential rotation, token issuance/denials and initial admin setup; this page does not imply complete sign-in, broker-connection or Better Auth plugin-action auditing. Actor labels use current names when resolvable and preserve the recorded IDs. Do not present these as historical name snapshots or collect secrets to make the log more detailed.

## Detail-page composition

### Identity block

Start with a quiet back link to the entity directory. Below it place a 40–48 px avatar or hardware identity mark on the left, the entity name/device ID with a small role/status badge beside it, and a muted secondary identifier below. Keep an ellipsis/contextual action at the far right of this block, not next to the sidebar toggle.

People use circular avatars. Devices use a rounded-square device mark or an existing device icon; do not invent personal avatars for hardware. Long names wrap, and the action remains reachable. A back link preserves relevant list search/page state when practical.

The screenshot places tabs under the identity, followed by about 24 px of space before the cards. Its role badge is small and secondary to the name. Do not promote badge color into the navigation palette.

### Local tabs

Use one compact segmented tablist with a neutral track and a slightly more distinct active tab. Keep labels brief and name actual concerns. Provide keyboard navigation, selected-state semantics and a corresponding panel. Keep tab state in the URL when useful for direct links.

The reference's Profile / Organizations / Providers / Sessions are user-page examples. For devices, add tabs only if corresponding real sections exist; do not add broker sessions, integrations or fake activity solely to fill the tablist. A one-concern page needs no tabs.

### Editable content and metadata

At wide widths use a flexible editable column plus a 200–240 px metadata rail, with a 24 px gap. Start with `minmax(0, 1fr)` for the main track so long values cannot force page overflow. Constrain the combined work area to the main max-width. The screenshot's roughly 70:30 split is a useful proportion, not a mandatory percentage.

Align the top of the metadata rail with the first settings card, below the tabs. The metadata rail has no card background, large heading, metric grid or decorative illustration. Use plain stacked label/value groups with subtle dividers and 16–24 px spacing.

Useful device metadata: copyable device ID/internal UUID, MQTT username, creation time, last token issuance, status, and revocation time when relevant. Display **Last token issued**, not **Last seen** or **Online**, because token issuance is the available signal. Show missing values truthfully. Device secrets and their hashes never belong here.

Use absolute dates with an explicit timezone or accessible full date alongside a relative value. Do not copy the source's example activity values or imply live MQTT connection data.

### Settings-card anatomy

Each card is a local form for one coherent concern:

- **Header:** 14 px medium title and optional muted description, aligned to the same left inset.
- **Body:** the specific field(s), preview or structured value; use about 16 px padding and 12–16 px internal gaps.
- **Footer:** full-width `surface-footer`, a fine top divider, helper/constraint on the left and a small Save/action on the right; use about 12–16 px horizontal padding.

The screenshot's Avatar section places the explanation left and current avatar/upload control right. Its Name section has a single constrained input under the explanation. Its Email section continues below the viewport. This is a repeating section pattern, not three differently styled card designs.

For devices, group editable serial/model/firmware information according to actual save boundaries. Do not split every single field into its own card when they must be committed atomically. Mark immutable broker identity fields as read-only and explain why instead of offering a Save button that cannot work.

Independent sections save independently. Show pending feedback on the affected section, prevent duplicate writes, preserve entered values on failure and leave unrelated sections usable. A design reference does not require inventing separate APIs for fields already saved together.

## Directory/list pattern

Use a clear page title, optional real result count and one primary Register device action. Place search, status filter and clear-filter behavior in a consistent toolbar below. The table starts below that toolbar and ends with range/count and pagination.

Use a flat, subtly bordered table. The first column identifies the device and its secondary serial number; subsequent columns show relevant status, MQTT username, model/firmware and token activity. Active uses a restrained green badge, disabled is neutral and revoked is destructive. Avoid bright fills across entire rows.

Provide real labels and predictable keyboard interaction. A device detail destination should be an actual link if/when such a page exists. Keep the existing list workflow working until a detail page is implemented. Destructive actions must remain understandable; infrequent row actions can move into a labeled menu only if this does not hide the primary task.

## Responsive adaptations

These behaviors are project decisions; the source contains only a desktop view.

| Available space | Adaptation |
|---|---|
| Wide desktop, roughly 1200 px and above | Full rail; editable and metadata columns side by side |
| Intermediate widths | Keep rail while content fits; move metadata into a compact summary above the editable column when necessary |
| Around 900 px and below | Collapse rail into an accessible navigation drawer; one main column |
| Narrow phones, 320–390 px | 16 px gutters, wrapping title/actions, stacked card footer helper/action, no fixed minimum form width |

Treat breakpoints as fit-based targets: prefer earlier collapse to cramped text. Keep metadata identity/context visible before editing, but preserve the order of editable sections. Never render a duplicate metadata rail in addition to the mobile summary.

Allow horizontal scrolling only inside genuinely wide tables or a bounded tablist when necessary. The page itself must not overflow horizontally. Wrap long values or use visual truncation with accessible full text. Keep controls reachable at 200% zoom.

Use normal main-page scrolling so cards below the fold remain discoverable. A persistent rail or sticky navigation row must not clip the work area. Internally scroll only drawers, long dialog bodies, menus and table viewports where required.

## Dialogs and consequential actions

Short create/edit workflows use the project's AlertDialog pattern. Clicking outside and Escape leave the dialog open. Saving does not dismiss it: the same dialog shows success or its one-time credential view. Only an explicit close/acknowledgement dismisses it. Keep copy errors in place, return focus on close, and prevent dismissal/duplicate submission while saving.

Keep credential rotation/revocation consequences explicit. Current product behavior allows a revoked device to be reactivated; do not call revocation permanent. Restoring access clears the current revocation timestamp while retaining audit history. Existing JWTs/MQTT connections are not terminated by dashboard revocation.

## Review checklist

- One sidebar and one chip header; no copied browser chrome or webcam box.
- Main navigation, page identity and local tabs are visually distinct rows.
- Cards and metadata align below tabs, with consistent 24 px gaps.
- Footer hints/actions belong to their own section and match its save boundary.
- Sans-serif headings, neutral chrome, restrained semantic green and no legacy navy accent.
- Role/status never depends on color alone; input and focus states remain distinguishable.
- No invented organizations, user tabs, broker activity, counts or security features.
- Narrow screens stack gracefully, retain primary actions and avoid page overflow.
- Empty, loading, save failure, permission denial and long-content states are designed.
- Existing authorization, secrets, token endpoint and device lifecycle behavior remain intact.

The guide defines the target layout for future shell/detail work. A palette update alone does not mean those structural changes have already shipped.
