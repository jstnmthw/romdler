# ROM Downloader Architecture

## Overview

A slim, optimized Node.js micro app that downloads ZIP files from archival website HTML table directories. Designed for deterministic logging, minimal dependencies, and polite network behavior.

### Design Goals

1. **Slim**: Minimal dependencies, small codebase, focused functionality
2. **Optimized**: Streaming downloads, configurable concurrency, efficient memory usage
3. **Deterministic Logging**: Clean, in-place terminal updates without spam
4. **Polite**: Sequential by default, respects servers with configurable delays
5. **Robust**: Retry logic, timeout handling, graceful error recovery

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI Entry Point                                │
│                            (src/index.ts)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   Config    │───>│  Fetcher    │───>│   Parser    │───>│   Filter    │   │
│  │   Loader    │    │   (HTTP)    │    │   (HTML)    │    │  (W/B list) │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│         │                                                        │          │
│         │                                                        ▼          │
│         │           ┌─────────────────────────────────────────────────┐     │
│         │           │              Downloader                         │     │
│         │           │  (Streaming, Atomic Writes, Progress Tracking)  │     │
│         │           └─────────────────────────────────────────────────┘     │
│         │                              │                                    │
│         ▼                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Console UI Renderer                          │    │
│  │         (Banner, Progress Bars, Stats, In-Place Updates)            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Breakdown

### 1. Config Loader (`src/config/`)

**Responsibilities:**
- Load and parse `app.config.json`
- Validate schema using Zod
- Provide typed configuration object
- Handle missing/invalid config gracefully

**Files:**
- `schema.ts` - Zod schema definition
- `loader.ts` - File loading and validation
- `index.ts` - Public exports

### 2. HTTP Fetcher (`src/http/`)

**Responsibilities:**
- Fetch HTML pages and file downloads
- Implement retry logic with exponential backoff
- Handle timeouts gracefully
- Provide consistent error types

**Files:**
- `fetcher.ts` - Core fetch wrapper with retries
- `types.ts` - Response types and errors

### 3. HTML Parser (`src/parser/`)

**Responsibilities:**
- Parse HTML using Cheerio
- Extract table rows by table ID
- Extract links from `<td class="link">` cells
- Handle malformed HTML gracefully

**Files:**
- `table-parser.ts` - Table extraction logic
- `types.ts` - Parsed file entry types

### 4. Filter (`src/filter/`)

**Responsibilities:**
- Parse filter expressions (AND/OR syntax)
- Apply whitelist/blacklist rules
- Match against filename AND link text
- Return filtered file list

**Files:**
- `expression-parser.ts` - AND/OR expression parsing
- `matcher.ts` - Apply filters to file list
- `types.ts` - Filter types

**Filter Semantics:**
- Match target: filename (from href) + link text (visible text)
- Whitelist empty = allow all (unless blacklisted)
- Whitelist non-empty = allow only matches
- Blacklist always excludes
- Expression syntax: `["foo AND bar", "baz"]` = `(foo && bar) || baz`

### 5. Downloader (`src/downloader/`)

**Responsibilities:**
- Stream downloads to disk
- Atomic writes (temp file → rename)
- Skip existing files (with optional size check)
- Track progress per file
- Emit progress events

**Files:**
- `downloader.ts` - Core download logic
- `atomic-write.ts` - Temp file handling
- `types.ts` - Download result types

### 6. Console UI (`src/ui/`)

**Responsibilities:**
- Render banner/intro
- Display URL fetch status
- Show file counts and filter stats
- Render in-place progress (file name + bar + counter)
- Print final summary table
- Own all stdout writes (single point of control)

**Files:**
- `renderer.ts` - Main UI controller
- `banner.ts` - Intro banner
- `progress.ts` - Progress bar rendering
- `summary.ts` - Final stats table
- `colors.ts` - Chalk color helpers

### 7. Utils (`src/utils/`)

**Responsibilities:**
- URL resolution (relative → absolute)
- Filename sanitization (prevent path traversal)
- Safe path joining

**Files:**
- `url.ts` - URL utilities
- `filename.ts` - Sanitization
- `fs.ts` - File system helpers

### 8. Types (`src/types/`)

**Files:**
- `index.ts` - Shared type definitions

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. STARTUP                                                               │
├──────────────────────────────────────────────────────────────────────────┤
│  Load Config ─> Validate ─> Parse CLI Args ─> Initialize UI              │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. FOR EACH URL                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │  Fetch  │───>│  Parse   │───>│  Filter  │───>│  Count   │             │
│  │  HTML   │    │  Table   │    │  Files   │    │  Total   │             │
│  └─────────┘    └──────────┘    └──────────┘    └──────────┘             │
│       │                                               │                  │
│       ▼                                               ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                    Display Discovery Stats                       │    │
│  │     URL status, table found, files found, filtered count         │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                 FOR EACH FILE (sequential/concurrent)            │    │
│  │                                                                  │    │
│  │   ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │    │
│  │   │  Check  │───>│ Download │───>│  Atomic  │───>│  Update  │    │    │
│  │   │ Exists  │    │  Stream  │    │  Rename  │    │ Progress │    │    │
│  │   └─────────┘    └──────────┘    └──────────┘    └──────────┘    │    │
│  │                                                                  │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                      Print URL Summary                           │    │
│  │      found, filtered, downloaded, skipped, failed, dest path     │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. FINISH                                                                │
├──────────────────────────────────────────────────────────────────────────┤
│  Print Final Summary ─> Exit with Code (0=success, 1=failures)           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Console UI Strategy

### In-Place Updates

The UI renderer maintains a "render state" and uses ANSI escape codes to update lines in place:

```
Downloading: somefile.zip
[████████████░░░░░░░░░░░░░░░░░░]  40%                    12/123
```

**Implementation:**
- Track cursor position
- Use `\r` to return to line start
- Use `\x1B[K` to clear to end of line
- Use `\x1B[A` to move cursor up (for multi-line updates)
- Disable in non-TTY environments (pipe to file)

### Progress Bar Rendering

```typescript
function renderBar(current: number, total: number, width: number): string {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}
```

### Output Sections

1. **Banner**: App name, version, timestamp
2. **URL Section**: Status, table found, file counts
3. **Download Section**: In-place updates (current file, progress, counter)
4. **Summary**: Stats table per URL

---

## Error Handling Strategy

### Levels

1. **Recoverable (retry)**: Network timeout, 5xx errors, connection reset
2. **Skip (log & continue)**: 404 for individual file, invalid href
3. **Fatal (abort URL)**: Page 404, invalid HTML, no table found
4. **Fatal (abort all)**: Invalid config, write permission denied

### Retry Policy

```typescript
const retryPolicy = {
  maxRetries: 2,           // from config
  baseDelayMs: 1000,       // 1 second
  maxDelayMs: 10000,       // 10 seconds
  backoffMultiplier: 2,    // exponential
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};
```

### Error Types

```typescript
type DownloadError =
  | { type: 'network'; message: string; retryable: boolean }
  | { type: 'http'; status: number; message: string }
  | { type: 'filesystem'; message: string }
  | { type: 'parse'; message: string };
```

---

## Performance Considerations

### Streaming Downloads

```typescript
// Good: Stream directly to disk
const response = await fetch(url);
const fileStream = fs.createWriteStream(tempPath);
await pipeline(response.body, fileStream);

// Bad: Buffer in memory
const response = await fetch(url);
const buffer = await response.arrayBuffer();
fs.writeFileSync(path, Buffer.from(buffer));
```

### Memory Usage

- Never load full file into memory
- Parse HTML incrementally where possible
- Process files one at a time (or bounded concurrency)
- Clear references after processing each URL

### Concurrency

- Default: Sequential (concurrency = 1)
- Optional: 2-4 concurrent downloads
- Implementation: Use a simple semaphore/queue
- Keep logs deterministic with concurrent mode

---

## Security Considerations

### Path Traversal Prevention

```typescript
function sanitizeFilename(filename: string): string {
  // Decode URL encoding
  let decoded = decodeURIComponent(filename);

  // Remove path separators
  decoded = decoded.replace(/[\/\\]/g, '_');

  // Remove null bytes
  decoded = decoded.replace(/\0/g, '');

  // Remove leading dots (hidden files, parent dir)
  decoded = decoded.replace(/^\.+/, '');

  // Ensure not empty
  if (!decoded) decoded = 'unnamed';

  return decoded;
}

function safePath(baseDir: string, filename: string): string {
  const safe = sanitizeFilename(filename);
  const full = path.resolve(baseDir, safe);

  // Verify still within baseDir
  if (!full.startsWith(path.resolve(baseDir))) {
    throw new Error('Path traversal detected');
  }

  return full;
}
```

### URL Validation

- Only allow HTTP/HTTPS protocols
- Validate URL format before fetch
- Don't follow redirects to different protocols

### Safe Filenames

- Decode URL components carefully
- Strip dangerous characters
- Handle Unicode safely
- Limit filename length

---

## Phased Implementation Plan

### Phase 0: Project Setup
**Deliverables:**
- package.json with dependencies
- tsconfig.json (strict mode)
- .eslintrc.json
- Directory structure
- Basic types

**Acceptance Criteria:**
- `pnpm install` succeeds
- `pnpm typecheck` passes
- `pnpm lint` passes

### Phase 1: Config & Utils
**Deliverables:**
- Zod schema for config
- Config loader
- URL resolution utility
- Filename sanitization

**Acceptance Criteria:**
- Valid config loads correctly
- Invalid config throws with helpful message
- Relative URLs resolve correctly
- Malicious filenames are sanitized

### Phase 2: HTTP & Parser
**Deliverables:**
- Fetch wrapper with retries
- HTML table parser
- Link extraction

**Acceptance Criteria:**
- Pages fetch with retry on failure
- Tables parse correctly from sample HTML
- Handles missing tables gracefully

### Phase 3: Filter
**Deliverables:**
- Expression parser (AND/OR)
- Whitelist/blacklist matcher

**Acceptance Criteria:**
- Empty whitelist allows all
- Whitelist filters correctly
- Blacklist excludes correctly
- AND/OR expressions work

### Phase 4: Downloader
**Deliverables:**
- Streaming download
- Atomic write (temp → rename)
- Existing file skip
- Progress events

**Acceptance Criteria:**
- Large files stream without memory spike
- Interrupted downloads don't leave partial files
- Existing files are skipped
- Progress events fire correctly

### Phase 5: Console UI
**Deliverables:**
- Banner renderer
- Status messages
- In-place progress bar
- Summary table

**Acceptance Criteria:**
- Banner displays on start
- Progress updates in place (no spam)
- Summary shows correct stats

### Phase 6: Orchestration & CLI
**Deliverables:**
- Main orchestrator
- CLI argument parsing (--dry-run, --limit, --config)
- Exit codes

**Acceptance Criteria:**
- Full flow works end-to-end
- --dry-run shows what would download
- --limit N caps downloads to first N files
- Exit code 0 on success, 1 on failure

### Phase 7: Polish & Tests
**Deliverables:**
- Unit tests for filter, parser, utils
- README.md
- Edge case handling

**Acceptance Criteria:**
- Tests pass
- Documentation complete
- Handles edge cases gracefully

---

## Test Strategy

### Unit Tests

**Filter Module:**
```typescript
describe('filter', () => {
  it('allows all when whitelist empty');
  it('filters by whitelist');
  it('excludes by blacklist');
  it('parses AND expressions');
  it('parses OR across entries');
});
```

**Parser Module:**
```typescript
describe('parser', () => {
  it('extracts links from table');
  it('handles missing table');
  it('handles rows without links');
  it('extracts filename and text');
});
```

**URL Utils:**
```typescript
describe('url', () => {
  it('resolves relative href');
  it('preserves absolute href');
  it('handles ../ paths');
});
```

**Filename Utils:**
```typescript
describe('filename', () => {
  it('sanitizes path separators');
  it('decodes URL encoding');
  it('prevents traversal');
});
```

### Integration Test (Manual)

1. Set up test HTML server with sample table
2. Configure app to download from it
3. Verify files download correctly
4. Verify filtering works
5. Verify skip-existing works

---

## Future Enhancements

1. **Resume Support**: Track partial downloads, resume on restart
2. **Checksum Verification**: Verify downloaded files against known checksums
3. **ETag Caching**: Skip download if ETag matches previous download
4. **Manifest File**: Generate JSON manifest of downloaded files
5. **Rate Limiting**: Configurable delay between requests
6. **Proxy Support**: HTTP/SOCKS proxy configuration
7. **Multi-Table Support**: Handle pages with multiple tables
8. **Regex Filters**: Support regex patterns in whitelist/blacklist

---

## Dependencies

### Production
- `zod` - Config validation
- `cheerio` - HTML parsing
- `chalk` - Terminal colors

### Development
- `typescript` - Type system
- `@types/node` - Node.js types
- `eslint` - Linting
- `vitest` - Testing

### Intentionally Avoided
- Heavy HTTP clients (axios, got)
- Complex CLI frameworks (commander, yargs)
- Full progress bar libraries (use custom minimal)

---

## File Structure

```
rom-downloader/
├── src/
│   ├── config/
│   │   ├── index.ts
│   │   ├── loader.ts
│   │   └── schema.ts
│   ├── http/
│   │   ├── index.ts
│   │   ├── fetcher.ts
│   │   └── types.ts
│   ├── parser/
│   │   ├── index.ts
│   │   ├── table-parser.ts
│   │   └── types.ts
│   ├── filter/
│   │   ├── index.ts
│   │   ├── expression-parser.ts
│   │   ├── matcher.ts
│   │   └── types.ts
│   ├── downloader/
│   │   ├── index.ts
│   │   ├── downloader.ts
│   │   └── types.ts
│   ├── ui/
│   │   ├── index.ts
│   │   ├── renderer.ts
│   │   ├── banner.ts
│   │   ├── progress.ts
│   │   └── summary.ts
│   ├── utils/
│   │   ├── index.ts
│   │   ├── url.ts
│   │   ├── filename.ts
│   │   └── fs.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── tests/
│   ├── filter.test.ts
│   ├── parser.test.ts
│   └── utils.test.ts
├── app.config.json
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── README.md
└── ARCHITECTURE.md
```
