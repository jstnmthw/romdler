import { describe, it, expect } from 'vitest';
import { parseTableLinks, filterZipLinks } from '../src/parser/index.js';

const sampleHtml = `
<table id="list">
  <thead>
    <tr>
      <th>File Name</th>
      <th>File Size</th>
      <th>Date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="link"><a href="../">Parent directory/</a></td>
      <td class="size">-</td>
      <td class="date">-</td>
    </tr>
    <tr>
      <td class="link"><a href="./" title=".">./</a></td>
      <td class="size">-</td>
      <td class="date">16-Oct-2025 09:38</td>
    </tr>
    <tr>
      <td class="link"><a href="../" title="..">../</a></td>
      <td class="size">-</td>
      <td class="date">16-Oct-2025 09:38</td>
    </tr>
    <tr>
      <td class="link"><a href="mario.zip" title="mario.zip">mario.zip</a></td>
      <td class="size">155.7 KiB</td>
      <td class="date">28-Sep-2025 00:26</td>
    </tr>
    <tr>
      <td class="link"><a href="zelda.zip" title="zelda.zip">zelda.zip</a></td>
      <td class="size">320.7 KiB</td>
      <td class="date">28-Sep-2025 00:26</td>
    </tr>
    <tr>
      <td class="link"><a href="sonic.zip" title="sonic.zip">sonic.zip</a></td>
      <td class="size">286.0 KiB</td>
      <td class="date">28-Sep-2025 00:26</td>
    </tr>
  </tbody>
</table>
`;

describe('parseTableLinks', () => {
  it('finds table by ID', () => {
    const result = parseTableLinks(sampleHtml, 'list');
    expect(result.tableFound).toBe(true);
  });

  it('returns tableFound false when table not found', () => {
    const result = parseTableLinks(sampleHtml, 'nonexistent');
    expect(result.tableFound).toBe(false);
    expect(result.links).toEqual([]);
  });

  it('extracts links from td.link cells', () => {
    const result = parseTableLinks(sampleHtml, 'list');
    expect(result.links.length).toBeGreaterThan(0);
    expect(result.links.some((l) => l.href === 'mario.zip')).toBe(true);
  });

  it('filters out parent directory links', () => {
    const result = parseTableLinks(sampleHtml, 'list');
    expect(result.links.some((l) => l.href === '../')).toBe(false);
    expect(result.links.some((l) => l.href === './')).toBe(false);
    expect(result.links.some((l) => l.text.toLowerCase().includes('parent directory'))).toBe(false);
  });

  it('extracts both href and text', () => {
    const result = parseTableLinks(sampleHtml, 'list');
    const marioLink = result.links.find((l) => l.href === 'mario.zip');
    expect(marioLink).toBeDefined();
    expect(marioLink?.text).toBe('mario.zip');
  });

  it('handles missing table gracefully', () => {
    const result = parseTableLinks('<html><body>No table here</body></html>', 'list');
    expect(result.tableFound).toBe(false);
    expect(result.links).toEqual([]);
  });

  it('handles rows without links', () => {
    const html = `
      <table id="list">
        <tr><td class="link">No anchor here</td></tr>
        <tr><td class="link"><a href="file.zip">file.zip</a></td></tr>
      </table>
    `;
    const result = parseTableLinks(html, 'list');
    expect(result.tableFound).toBe(true);
    expect(result.links).toHaveLength(1);
    expect(result.links[0]?.href).toBe('file.zip');
  });

  it('handles empty href attributes', () => {
    const html = `
      <table id="list">
        <tr><td class="link"><a href="">empty</a></td></tr>
        <tr><td class="link"><a href="file.zip">file.zip</a></td></tr>
      </table>
    `;
    const result = parseTableLinks(html, 'list');
    expect(result.links).toHaveLength(1);
    expect(result.links[0]?.href).toBe('file.zip');
  });

  it('filters out links with parent directory text', () => {
    const html = `
      <table id="list">
        <tr><td class="link"><a href="/some/path">Parent Directory</a></td></tr>
        <tr><td class="link"><a href="file.zip">file.zip</a></td></tr>
      </table>
    `;
    const result = parseTableLinks(html, 'list');
    expect(result.links).toHaveLength(1);
    expect(result.links[0]?.href).toBe('file.zip');
  });
});

describe('filterZipLinks', () => {
  it('filters to only .zip files', () => {
    const links = [
      { href: 'file.zip', text: 'file.zip' },
      { href: 'file.txt', text: 'file.txt' },
      { href: 'file.ZIP', text: 'file.ZIP' },
      { href: 'archive.rar', text: 'archive.rar' },
    ];
    const result = filterZipLinks(links);
    expect(result).toHaveLength(2);
    expect(result[0]?.href).toBe('file.zip');
    expect(result[1]?.href).toBe('file.ZIP');
  });

  it('handles case-insensitive .zip extension', () => {
    const links = [
      { href: 'file.ZIP', text: 'FILE.ZIP' },
      { href: 'file.Zip', text: 'file.Zip' },
    ];
    const result = filterZipLinks(links);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no zip files', () => {
    const links = [
      { href: 'file.txt', text: 'file.txt' },
      { href: 'file.pdf', text: 'file.pdf' },
    ];
    const result = filterZipLinks(links);
    expect(result).toEqual([]);
  });
});
