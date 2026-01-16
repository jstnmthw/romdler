You are Claude Code AI acting as a senior TypeScript/Node architect + implementer.

Goal
Build a slim, optimized micro app that downloads ZIP files linked in an archival website’s HTML table directory.

Core behavior
- The user provides 1+ URLs via a config file (easily editable).
- Each URL is an archival directory page containing an HTML <table> that lists links to .zip files.
- Config also specifies the table id (e.g., "list" for <table id="list">).
- For each table row, find the cell <td class="link">, then find its child <a>, and use href as the download link.
- Download each ZIP into a configured folder.
- Print modern colored console output with an init banner, per-URL discovery status, file counts, filtering, and progress.
- Before downloading, compute total rows/files so we can show an overall progress counter and (if feasible) a progress bar.
- Support whitelist and blacklist filtering by keywords:
  - whitelist: only download matches
  - blacklist: exclude matches
  - Default semantics: OR across terms
  - “AND”/“OR” support is ideal: implement a small expression syntax if reasonable (e.g., ["foo AND bar", "baz"] => OR between entries, AND inside an entry). If too complex, do OR only but structure code so expression parsing can be added later.

CLI UX (important)
When running `pnpm start`, the console output should look conceptually like:

- Banner / intro (pretty + modern)
- For each URL:
  - `URL: <...> -> Status 200 (OK)`
  - `Main list found` with green check
  - `Files Found: 500`
  - `Filtered files: 123/500`
  - A blank line
  - Then a “current file” section that updates in-place (do not spam the terminal):
    - `Downloading: Somefile (tag).zip`
    - A per-file download progress bar beneath
    - An overall progress indicator like `12/123` aligned to the right (approx alignment is okay)
  - Each time a file completes, reuse the same terminal lines for the next file.
- After finishing each URL, output stats:
  - total found, filtered, downloaded, skipped (already exists), failed
  - destination folder path

Functional requirements
- Must handle relative and absolute hrefs (resolve against page URL).
- Skip download if file already exists (and optionally verify size if you can read Content-Length; keep it simple).
- Timeouts and retries: implement modest retry policy (e.g., 2 retries with backoff) for network failures.
- Concurrency: default to sequential to keep it slim and polite; allow configurable concurrency (e.g., 2–4) but keep complexity low. If you implement concurrency, keep stable, deterministic logs.
- Use streaming download to disk (do not buffer whole ZIP in memory).
- Provide meaningful exit codes (0 success, 1 if any URL completely fails, etc.)
- Provide a `--dry-run` option (optional but nice): fetch + parse + show what would download without downloading.

Project constraints
- Node + pnpm
- Strict TypeScript
- ESLint (and optionally Prettier)
- Clean architecture / separation of concerns:
  - config loading + validation
  - HTTP fetching
  - HTML parsing
  - filtering logic
  - downloader
  - console UI rendering
- Low cyclomatic complexity; small focused functions; avoid god objects.
- Keep dependency count minimal, but you MAY use a few battle-tested libs:
  - undici (or node’s fetch) for HTTP
  - cheerio for HTML parsing
  - zod for config validation
  - chalk for colors
  - ora for spinners (optional)
  - cli-progress OR a minimal progress renderer for bars
  - tiny libs are fine; avoid heavy frameworks.

Config design
Create a config file at repo root (choose one):
- `app.config.json` OR `app.config.ts` (prefer JSON for easy edit)
It must include:
- urls: string[]
- tableId: string
- downloadDir: string
- whitelist: string[] (default empty)
- blacklist: string[] (default empty)
- concurrency: number (default 1)
- userAgent: string (default something descriptive)
- requestTimeoutMs: number
- retries: number
- logLevel: "info" | "debug" | "silent" (optional)

Filtering semantics
- Decide what string you match against: prefer file name (from href) AND/or link text if available. Document the choice.
- Implement:
  - If whitelist is empty => allow all unless blacklisted.
  - If whitelist has terms => allow only matches in whitelist (respect AND/OR if implemented).
  - If blacklist matches => exclude always.
- For “AND”/“OR” parsing:
  - simplest acceptable: each entry supports “AND” inside, and the entries are OR’ed together.
  - Example: whitelist: ["foo AND bar", "baz"] means (foo && bar) || baz.

Deliverables (must do these in this order)
1) Create a comprehensive Markdown document named `ARCHITECTURE.md` that includes:
   - Overview and design goals (slim, optimized, deterministic logging)
   - High-level architecture diagram (ASCII is fine)
   - Module breakdown & responsibilities
   - Data flow for: fetch -> parse -> filter -> download -> stats
   - Console UI strategy (in-place updates, progress bars, spinners)
   - Error handling strategy (timeouts, retries, partial failures)
   - Performance considerations (streaming, concurrency, minimal dependencies)
   - Security considerations (path traversal prevention, URL validation, safe filenames)
   - Phased implementation plan (Phase 0…N) with acceptance criteria per phase
   - Test strategy (unit tests for filtering/parser; integration test idea)
   - Future enhancements (resume, checksum, etag, manifest)

2) Implement the project:
   - Provide file/folder structure
   - Include package.json scripts:
     - `pnpm start` (runs the app)
     - `pnpm lint`
     - `pnpm typecheck`
     - `pnpm test` (optional)
   - Provide README.md with usage examples and config description.
   - Include .eslintrc (or eslint config) and tsconfig with strict settings.
   - Add minimal but meaningful tests for:
     - filter parsing + matching
     - href resolution (relative -> absolute)
     - html parsing of a sample table snippet

Implementation notes (important)
- Use Node’s WHATWG URL to resolve hrefs.
- Sanitize filenames: prevent writing outside downloadDir; strip path separators; decode URL components carefully.
- Use streaming: fetch -> readable stream -> fs.createWriteStream
- Use atomic download if possible: write to temp then rename on success (recommended).
- Keep logs clean: a small “console renderer” module that owns stdout updates so other modules don’t print directly.
- Keep functions small; avoid deeply nested loops; prefer early returns.

Inputs you may assume
- The table’s rows include a <td class="link"><a href="...">file.zip</a></td>
- Not all rows may have valid links; skip gracefully.
- Some pages may have hundreds of files.

Output expectations
- At the end of each run, print a summary table of per-URL results and the final download directory.
- Ensure the app runs on Node 20+.

Now do it:
- First write ARCHITECTURE.md.
- Then generate the full repo with code blocks for each file.
- Keep it production-quality and concise—this is a micro app, not a framework.

Example HTML:
```
<table id="list"><thead><tr><th style="width:55%"><a href="?C=N&amp;O=A">File Name</a>&nbsp;<a href="?C=N&amp;O=D">&nbsp;↓&nbsp;</a></th><th style="width:20%"><a href="?C=S&amp;O=A">File Size</a>&nbsp;<a href="?C=S&amp;O=D">&nbsp;↓&nbsp;</a></th><th style="width:25%"><a href="?C=M&amp;O=A">Date</a>&nbsp;<a href="?C=M&amp;O=D">&nbsp;↓&nbsp;</a></th></tr></thead>
<tbody><tr><td class="link"><a href="../">Parent directory/</a></td><td class="size">-</td><td class="date">-</td></tr>
<tr><td class="link"><a href="./" title=".">./</a></td><td class="size">-</td><td class="date">16-Oct-2025 09:38</td></tr>
<tr><td class="link"><a href="../" title="..">../</a></td><td class="size">-</td><td class="date">16-Oct-2025 09:38</td></tr>
<tr><td class="link"><a href="avoid.zip" title="acrush.zip">acrush.zip</a></td><td class="size">155.7 KiB</td><td class="date">28-Sep-2025 00:26</td></tr>
<tr><td class="link"><a href="advislnd.zip" title="advislnd.zip">advislnd.zip</a></td><td class="size">320.7 KiB</td><td class="date">28-Sep-2025 00:26</td></tr>
<tr><td class="link"><a href="aeroblst.zip" title="aeroblst.zip">aeroblst.zip</a></td><td class="size">286.0 KiB</td><td class="date">28-Sep-2025 00:26</td></tr>
<tr><td class="link"><a href="airzonk.zip" title="airzonk.zip">airzonk.zip</a></td><td class="size">316.8 KiB</td><td class="date">28-Sep-2025 00:26</td></tr>
<tr><td class="link"><a href="ballistx.zip" title="ballistx.zip">ballistx.zip</a></td><td class="size">107.4 KiB</td><td class="date">28-Sep-2025 00:26</td></tr>
<tr><td class="link"><a href="batlroyl.zip" title="batlroyl.zip">batlroyl.zip</a></td><td class="size">312.0 KiB</td><td class="date">28-Sep-2025 00:26</td></tr>
</tbody></table>
```