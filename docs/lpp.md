# LPP: private templates and authenticated exports

The sidebar's **Laporan Pekerjaan → LPP** submenu supports choosing a template, entering data through the pilot
form or worksheet editor, creating/naming/saving/reopening/deleting reports, and exporting Excel. Drafts belong
to the authenticated user. Raw template downloads are not exposed.

Template labels omit a trailing `(New)` while private filenames and template IDs
remain stable, keeping existing drafts compatible. Downloads use
`YYYY-MM-DD LPP <template name>.xlsx`, based on the selected report date (or the
draft creation date in Asia/Jakarta when no report date is set), independent of
the editable draft title. The browser and export endpoint share the naming rule.

The **Draf** button beside the template selector opens a dedicated drafts screen
within the LPP menu, following the dashboard's existing client-side navigation.
It lists the saved report date from the header, rather than the last-save timestamp.
Returning to the editor preserves unsaved form input; opening another draft retains
the existing unsaved-change confirmation. Only the authenticated owner's drafts appear.
Each row also offers **Ekspor Excel**, which exports the saved draft directly without
opening it or saving the current editor. Downloads use the filename returned by the
authenticated export endpoint, including the saved report date and template name.

## Pilot input form

The server-only `LPP_FORM_TEMPLATE_ID` selects one private template by its filename
SHA-256. Only that template uses the new form; other templates retain the grid.
The configured workbook must match the supported two-sheet installation layout
(40 rows on the report and 27 on documentation); otherwise it falls back to the grid.
No template filenames, original values, serials or signatory names are embedded in
source code or public assets. The form descriptor is returned only after LPP authorization.

The form groups report information, device details (edited in a dialog), documentation
photos, and sign-off.
Shared project fields and device descriptions update both worksheets together.
Dates use a date input and are written in the template's Indonesian text format.
Serial numbers remain text, preserving leading zeros. Untouched fields emit no edits.
Incomplete drafts can be saved, but required fields are checked both in the UI and
on the export endpoint. Row order and document structure remain unchanged.
The pilot edits existing device entries; it does not insert/remove rows.

## Documentation photos

The documentation table has a report header with the original workbook logo,
title and project information. The logo is served only through an authenticated,
private/no-store endpoint; it is never copied to public assets.
**Tanggal laporan** defaults to the draft creation day in Asia/Jakarta and can be
edited. Saving and exporting apply that date to both worksheet headers and the
sign-off date, retaining each original prefix and cell style. Later saves keep the
chosen date. The worksheet editor cannot independently change those date cells.
Creation timestamps are assigned by the server and cannot be overwritten by clients.
Legacy drafts without a creation timestamp use their last recorded save date once;
users can correct that date in the header before exporting.

`LPP_DOCUMENTATION_TEMPLATE_ID` selects the additional private documentation-table
layout. Its 7 documentation rows contain 10 picture slots (1, 1, 1, 2, 2, 1, 2),
independent of the 131 serial-numbered entries on the main report. The worksheet
extent includes blank rows through row 56; documentation values occupy rows 13–19.
Slot IDs identify both the documentation row and picture position. The original
installation form remains supported by `LPP_FORM_TEMPLATE_ID`.

`LPP_AUDITORIUM_TEMPLATE_ID` selects the additional Auditorium phase 2 layout:
80 report rows with 51 work entries, and 62 documentation rows with 49 material
photos. The two final work entries have no documentation slots. The header includes
the original phase label; its editable date updates both A10 cells and the sign-off
in C68. It shares the photo table, sheet editor, drafts, authenticated previews,
full-frame uploads and dated watermarks used by the first documentation layout.
Pictures 36 and 37 have distinct drawing IDs but share a starting cell in the
original file. Slot matching includes those IDs so replacing either picture cannot
change its neighbor. All original anchor coordinates and offsets are retained.
Its 49 replacement images use high-quality JPEG with 4:4:4 chroma sampling to
keep the workbook compact; previews use the same encoded bytes as the Excel images.

`LPP_AUDITORIUM_PHASE1_TEMPLATE_ID` selects Auditorium phase 1 with the same
documentation-table workflow: 40 report rows, 27 documentation rows, and 14
devices with one photo each. Its header retains the phase label and updates both
A10 date cells plus the sign-off date in C30. Material names update both sheets;
serial numbers and other report data remain editable through **Edit data laporan**.
It shares the private upload/preview, JPEG watermarks, saved drafts and dated Excel
exports with phase 2. The two phase IDs are configured independently; their
different row counts and picture positions are validated before enabling the form.

`LPP_COLLABORATION_TEMPLATE_ID` selects the collaboration-room layout: 36 report
rows, 23 documentation rows, and 10 materials with 14 photos. Material 7 has four
picture slots and material 10 has two. Their drawing IDs distinguish pictures
sharing the same cell, so each upload replaces only its selected frame. The header
date updates both A10 cells and the sign-off date in C25. This layout has no phase
label. It uses the same documentation table, worksheet editor, private drafts,
full-frame uploads, JPEG watermarks and dated Excel exports as the Auditorium
layouts. Original rows, merges, image positions, logos and print settings remain
unchanged; template values are read only after authorization.

`LPP_PBH_TEMPLATE_ID` selects the 11-material videowall layout: 38 report rows,
24 documentation rows, and 11 materials with 13 photos. Materials 5 and 11 each
have two picture slots sharing a cell; their drawing IDs isolate each frame so
an upload replaces only the selected photo. The header date updates both A10
cells and the sign-off date in C27. Non-picture shape annotations (`oneCellAnchor`
without images) and print settings are preserved untouched.

`LPP_SOC_TEMPLATE_ID` selects the 24-material SOC videowall layout: 49 report
rows, 37 documentation rows, and 24 materials with 25 photos. Material 10 has two
picture slots sharing a cell, isolated by drawing ID. The header date updates
both A10 cells and the sign-off date in D39. Rows with blank installation
location remain exportable, and non-picture shape annotations remain untouched.

`LPP_COMMAND_CENTER_TEMPLATE_ID` (141 report rows, sign-off cell `C126`),
`LPP_TASK_FORCE_TEMPLATE_ID` (271 report rows, sign-off cell `C256`), and
`LPP_HC_OPERATION_TEMPLATE_ID` (104 report rows, sign-off cell `C89`) select the
three 15-row standalone-documentation layouts (28 documentation rows each). Their
Sheet 2 placeholder rows (`B14:C28`) start blank and optional; header/report
dates synchronize both A10 cells and preserve the sign-off city prefix
(`Jakarta, <date>`). Documentation photo slots start empty without requesting
missing template thumbnails, and uploaded photos insert cell-fitted JPEG frames
(`twoCellAnchor`) with burned-in watermarks while leaving existing non-picture
shape annotations and print settings intact.

Only copies placed directly in the private `data-lpp/` directory appear in the
catalog; the nested template archive stays hidden. Provision the chosen original
there without changing its bytes, then set its filename SHA-256 in the server
environment. Do not add template contents or names to public assets or source code.

The table follows the Base UI [shadcn Studio table-16](https://shadcnstudio.com/docs/components/table?base=base)
pattern: thumbnail and material description, location, replacement-photo status,
row selection and contextual actions. Pencil opens independent uploads for each
picture in that row; preview, search, changed-photo filtering and restoring the
selected rows are supported. The underlying worksheet editor remains available
through **Edit data laporan** in the photo search/filter toolbar. Opening it reveals
the two worksheet buttons to its right and replaces the photo table with the selected
worksheet editor in the same panel. Closing it restores the photo table and its search,
filter and selection state. Cell edits and photo references remain in the shared draft.
No product demo data or external image URLs are used.
Thumbnails use the same authenticated private endpoints with a fixed 120-pixel
preview size; originals and uploaded photos never use a public optimizer cache.

The installation pilot supports one replacement photo per device; the documentation
table supports every existing picture slot. Both offer a private preview and restoring
the template photo. Accepts static JPG/PNG/WebP, up to 4 MiB and 40 megapixels.
The server validates the actual decoded image format, applies camera orientation,
reduces the longest edge to at most 1600 pixels, strips EXIF/GPS metadata and encodes
JPEG. Raw upload names and unprocessed files are not stored.

Uploads are immutable content-addressed objects under
`lpp-photos/<hashed-authenticated-user-id>/<image-sha256>.jpg` in private storage.
Drafts save only the device-to-photo references. Uploads, original photo previews,
photo retrieval, draft writes and export all require LPP authorization; reads and
references are resolved within the authenticated owner's namespace. No public image
optimizer or signed public URL is used. Responses are `private, no-store`.
Photo references are saved when the user saves or exports the report. Unreferenced
uploads are retained privately; any future cleanup must account for all draft references.

During export, a new media part and relationship are created for each changed slot.
This prevents an edit from altering another device that shares an original image.
Only the selected picture reference/crop is changed; its anchor, geometry and all
worksheet/print settings remain intact. Uploaded photos fill the original frame
edge to edge with a proportional center crop, without padding or stretching. Excess
image edges are cropped before the watermark is applied, so the label stays visible.
Previews follow the rendered image's aspect ratio without adding blank side areas.
Original media parts and the original template file
remain unchanged. Restoring a photo removes its upload reference.

### Documentation photo watermarks

For templates with the editable report-date header, every documentation picture
in the export receives a burned-in footer: the clean template name and the selected
report date in Indonesian (for example, `LPP Videowall P2IS · 1 Maret 2026`).
This includes retained template photos as well as uploads, including both pictures
of materials with two photo slots. Company logos are excluded. The preview dialog
uses the same rendering pipeline and exact image bytes as export.

Watermarks are generated from the current header date for previews and from the
saved draft date for exports, including direct exports from the draft list. Original
uploads remain private and unstamped so changing the date never leaves an old date
or stacks multiple watermarks. Original template files and media remain untouched;
exports add new documentation media/references while retaining frames, logos, cell
formatting and print settings. Existing crops are flattened into the new pixels.

Preview requests require the same LPP authorization and owner-scoped upload lookup
as export; the server derives the template name and validates the preview date.
Roboto is bundled under `assets/fonts/` with its OFL license and included in server
traces, so rendering needs no external font service at runtime.

## Access setup

Enable Managed Better Auth on the existing Neon branch and configure
`NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` (a random secret of 32+ characters).
The old `NEXT_PUBLIC_NEON_AUTH_URL` / `NEON_AUTH_SECRET` placeholders are not used.
Provision internal accounts through Neon, verify their emails, and put their exact
emails in `LPP_ALLOWED_EMAILS` (comma-separated). An empty list denies all access.
For an explicitly approved account that does not require email OTP, set
`LPP_MANUALLY_APPROVED_ACCOUNTS` to a JSON object mapping its exact lowercase email
to its Neon Auth user ID. Store this server-side in the private environment file.
This exemption requires both the matching account ID and an allowlisted email;
it does not mark the email as verified or allow a different account with that email.
Set `APP_ORIGIN` to the site's exact origin and register that origin in Neon Auth.
Sign-in is centralized at the main page and sign-out is in the application header.
LPP inherits the application session and also enforces its own email allowlist.
It does not expose public registration. See [central authentication](authentication.md)
for the shared API gateway, database rate limiter, and deployment requirements.

All LPP handlers check the provider session, email allowlist, and either email
verification or explicit manual account enrollment before
reading any template or draft. Draft ownership is enforced by a server-derived user
namespace, never by a user ID supplied by the browser. Writes/exports check Origin.
All responses use `private, no-store`. No development authentication bypass exists.

## Private storage

Local development reads `private/data-lpp/*.xlsx` and saves draft reports in
`private/lpp-drafts/`. Original templates are never modified. A server with a
persistent private disk can use `LPP_PRIVATE_DIR` pointing to that private root.
Local file mode is intended for a single application process.

Vercel does not receive `private/`. Configure `LPP_S3_BUCKET` and server-side
`AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
for a private S3-compatible bucket. An administrator must provision it, ensure
anonymous reads and listing are denied, and upload the originals under
`data-lpp/<original filename>.xlsx`. No public ACLs, public bucket policies,
presigned URLs, or client-side storage credentials are used by the application.
Draft writes use conditional object ETags to prevent conflicting saves.
Keep object versioning/backups; replacing a template changes its hash and blocks
exports of older drafts until the original template is restored.

Neon Auth was enabled for development on the `codex/lpp` branch of the existing
`multimedia-dashboard` project. Its URL and cookie secret are stored in `.env.local`.
The internal email allowlist and any manual account enrollment are configured only
in the private environment file, never in the repository.
This change does not upload templates or deploy the application. Missing
authentication/storage configuration produces a closed/error state, never public
fallback access. On Vercel, do not add `private/` to tracing includes to work around
missing storage. Provision private storage separately.

## Export fidelity

All 9 local workbooks were inspected: 2 worksheets each, merged cells, styles,
print settings, embedded images; no cell formulas were found. Exports patch only
the edited cell elements in the original OOXML ZIP, preserving other workbook
parts byte-for-byte when uncompressed. The workbook patcher returns the exact
original bytes when given no edits; documentation reports automatically include
their three report-date cell edits and watermarked documentation pictures. Styles on existing cells, original media, sheet names, merges,
relationships, page breaks, print areas and margins are retained.

The browser offers an input form for the pilot and a data grid for other templates;
neither is a print preview. The pilot displays individual documentation photo previews.
Editing text can affect Excel wrapping/pagination just as a manual Excel edit does.
Rows/columns cannot be added/deleted because the template layout is fixed.
Existing formulas (if future templates include them) are read-only; this editor
does not recalculate formula results. Dates/numbers retain the original cell style;
use Excel's numeric serial for numeric date cells. Strings are stored literally,
including strings beginning with `=`, so user input cannot create formulas.

## Publication controls and verification

`private/` is excluded by Git, git archives, npm packaging, Docker build contexts,
Vercel uploads and Next.js server file tracing. `package.json` is also private.
CI and `prebuild` reject tracked private/spreadsheet files and public workbook copies.
Post-build checks reject private paths in server traces. These checks do not erase
previous leaks, downloads, third-party backups or artifacts outside this checkout.

Run `pnpm privacy:check`, `pnpm test:lpp`, `pnpm typecheck`, `pnpm lint`, and
`pnpm build`; then `node scripts/check-private.mjs --build`. Workbook tests use
synthetic data on CI and additionally cover all local templates when present,
without writing or logging template contents. Set `LPP_TEST_TEMPLATE_DIR` to a private
source directory to run regression tests against originals stored outside the checkout.

Before going live, verify: unauthenticated endpoints return 401; unapproved users
return 403; an approved user can sign in, restore the session, edit/save/reopen and
export; another user cannot access the first user's draft; anonymous bucket requests
are denied. No file may be added to `public/`, a public URL, GitHub release or CI
artifact to provide template access.
