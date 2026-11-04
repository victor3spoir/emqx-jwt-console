# Table layout

A reusable layout for directory tables. This description covers the placement, order and presentation of elements, with labels and columns adapted to the records being displayed.

## Page order

Arrange the page from top to bottom:

1. Page heading and description, with the action group alongside them.
2. Search and filter row.
3. Table container, including its column headings and data rows.
4. Result count and pagination row below the table.

Keep a 24 px gap between these sections.

## Heading and actions

Place the heading above a short description on the left. Place the actions on the right, in this order:

1. **Import** — outlined button with an upload icon before its label.
2. **Export** — outlined button with a download icon before its label.
3. **Create** or **Add [record type]** — filled button.

Keep the action buttons together with an 8 px gap. When the heading and actions no longer fit on one line, the action group wraps below the heading block.

## Search and filters

Place the search field first, the filter selectors next, and **Clear** after the selectors when shown. Each field has its label directly above its control. Align the bottoms of the controls.

The search field occupies the full row on narrow screens. On wider screens it sits beside the filters. Additional controls wrap onto the next line within this section.

## Table container and columns

The table sits inside one flat card surface with a thin outline and rounded corners. Column headings form the first row, followed by the data rows. Fine horizontal dividers separate the rows. Use compact cell spacing, with a subtle surface change on hover.

Arrange columns by their role. Omit groups that do not apply to the records:

| Position | Column | How the cell is shown |
| --- | --- | --- |
| 1 | Record identity | Name or primary identifier on the first line; a secondary identifier below in smaller text. |
| 2 | Status | A compact badge containing the status label. |
| 3 | Reference fields | Short identifiers or references on a single line; technical identifiers may use monospace text. |
| 4 | Related attributes | Related values stacked in one cell, with the secondary value smaller. A missing value is shown as an em dash. |
| 5 | Date or activity | A compact date and time, or a short placeholder when no date is present. |
| 6 | Actions | A compact action group aligned to the right edge of the cell. |

Text and column headings are left-aligned. Keep related primary and secondary values stacked within the same cell. Wide content scrolls horizontally inside the table container; the surrounding page keeps its normal width.

## Row actions

Use an outlined, rounded icon group. Place **Edit** first, record-specific actions next, any state-change action after them, and **Delete** last. Place a vertical separator immediately before Delete. Include only the actions available for that record type.

## Empty table

When there are no rows, show a centered heading and a short description inside the same bordered table container. The page heading, action group, filters and pagination remain in their positions.

## Count and pagination

Place this row below the table. Show the record count and **Page X of Y** on the left. Place **Previous** and **Next**, in that order, on the right. On narrow screens these groups wrap onto separate lines.
