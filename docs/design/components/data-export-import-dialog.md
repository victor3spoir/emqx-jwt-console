# Data import and export dialog layouts

Reusable layouts for importing and exporting tabular records. Both dialogs share a panel, heading, stacked fields, notices and footer. The import dialog has a wider body for the file preview. Adapt record names and field labels to the dataset.

## Shared arrangement

Show a centered panel over a dimmed page overlay. The panel has rounded corners, a thin outline and a distinct surface. Use a compact heading above smaller descriptive text.

Arrange the contents in this order:

1. Title, followed by a short description.
2. Fields, each with its label above its control and any supporting text below it.
3. Additional content such as notices, errors or a preview.
4. Footer containing the secondary action and the main action.

Use 16 px panel padding and 16 px spacing between sections. The footer extends to the panel edges, with a top divider and a contrasting footer surface. On wider screens, its buttons sit at the right, with Cancel before the main action. On narrow screens, the buttons stack with the main action above Cancel.

## Export dialog

Use a compact panel, approximately 384 px wide on desktop and constrained to the available screen width on smaller screens.

| Order | Element | Placement and presentation |
| --- | --- | --- |
| 1 | Title | **Export [record type]**, at the top of the panel. |
| 2 | Description | Directly below the title; shows the scope of the export and its row count. |
| 3 | File format | Label above a full-width selector. The options appear as **CSV (.csv)**, then **Excel (.xlsx)**. |
| 4 | Optional export fields, when applicable | Label above a switch, with supporting text below it. Additional field options follow the format selector. |
| 5 | Additional notice, when shown | A full-width notice below the fields. |
| 6 | Error, when shown | A full-width error notice below the other content and above the footer. |
| 7 | Footer | **Cancel**, then **Download file**. |

The close icon occupies the panel's upper-right corner. While an export is in progress, **Exporting…** replaces the main button label in place and the close icon is hidden.

## Import dialog

Use the same centered panel arrangement, expanded to approximately 768 px on desktop to hold the preview table. Limit the panel to 85% of the viewport height; overflowing contents scroll vertically within it.

| Order | Element | Placement and presentation |
| --- | --- | --- |
| 1 | Title | **Import [record type]**, at the top of the panel. |
| 2 | Description | Directly below the title, spanning the content width. |
| 3 | File picker | Label above the control, with the file-format and column information underneath. |
| 4 | Template row | **Download a template:** followed by **CSV template** and **Excel template**, in that order. The buttons wrap when needed. |
| 5 | File or import error, when shown | A full-width error notice below the template row. |
| 6 | Preview summary | A line showing the number of rows and the validation summary. |
| 7 | Row errors, when shown | A list inside an error notice, directly below the preview summary. |
| 8 | Valid preview | A bordered table below the summary, followed by a short line when additional rows are outside the preview. |
| 9 | Footer | **Cancel**, then **Import N records** when a valid preview is present. Adapt the record label to the dataset. |

The import panel has no upper-right close icon. Its explicit Cancel action stays in the footer. While reading or importing, **Please wait…** replaces the main action label in place.

## Preview table

Use the presentation described in [Table layout](tables.md). Order preview columns to match the destination table: record identity first, reference fields and related attributes next, then status when applicable. Omit the row-action column.

Show up to five rows beneath the column headings. Keep the preview inside its own bordered, rounded container, with horizontal scrolling confined to the table. Place the remaining-row note immediately below it. Keep sensitive fields outside the preview columns.
