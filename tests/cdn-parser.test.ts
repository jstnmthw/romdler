import { describe, it, expect } from 'vitest';
import { parseCdnDirectory } from '../src/scraper/libretro/cdn-parser.js';

describe('parseCdnDirectory', () => {
  it('extracts PNG filenames from Apache autoindex', () => {
    const html = `
      <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
      <html>
      <head><title>Index of /Nintendo - Nintendo Entertainment System/Named_Boxarts</title></head>
      <body>
        <h1>Index of /Nintendo - Nintendo Entertainment System/Named_Boxarts</h1>
        <pre>
          <a href="../">../</a>
          <a href="Super%20Mario%20Bros.%20(World).png">Super Mario Bros. (World).png</a>
          <a href="Zelda%20(USA).png">Zelda (USA).png</a>
          <a href="Donkey%20Kong%20(Japan,%20USA).png">Donkey Kong (Japan, USA).png</a>
        </pre>
      </body>
      </html>
    `;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(3);
    expect(filenames).toContain('Super Mario Bros. (World)');
    expect(filenames).toContain('Zelda (USA)');
    expect(filenames).toContain('Donkey Kong (Japan, USA)');
  });

  it('decodes URL-encoded filenames', () => {
    const html = `
      <pre>
        <a href="Q%2ABert%27s%20Qubes%20(USA).png">Q*Bert's Qubes (USA).png</a>
      </pre>
    `;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(1);
    expect(filenames[0]).toBe("Q*Bert's Qubes (USA)");
  });

  it('skips parent directory link', () => {
    const html = `
      <pre>
        <a href="../">../</a>
        <a href="Game.png">Game.png</a>
      </pre>
    `;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(1);
    expect(filenames[0]).toBe('Game');
  });

  it('skips non-PNG files', () => {
    const html = `
      <pre>
        <a href="README.md">README.md</a>
        <a href="Game.png">Game.png</a>
        <a href="image.jpg">image.jpg</a>
        <a href="data.json">data.json</a>
      </pre>
    `;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(1);
    expect(filenames[0]).toBe('Game');
  });

  it('handles empty directory listing', () => {
    const html = `
      <pre>
        <a href="../">../</a>
      </pre>
    `;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(0);
  });

  it('handles links in table format', () => {
    const html = `
      <table>
        <tr><td><a href="../">Parent Directory</a></td></tr>
        <tr><td><a href="Game%20A.png">Game A.png</a></td></tr>
        <tr><td><a href="Game%20B.png">Game B.png</a></td></tr>
      </table>
    `;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(2);
    expect(filenames).toContain('Game A');
    expect(filenames).toContain('Game B');
  });

  it('handles links in body without container', () => {
    const html = `
      <body>
        <a href="../">../</a>
        <a href="Standalone.png">Standalone.png</a>
      </body>
    `;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(1);
    expect(filenames[0]).toBe('Standalone');
  });

  it('handles special characters in filenames', () => {
    const html = `
      <pre>
        <a href="Game%20-%20Special%20Edition%20(USA).png">Game - Special Edition (USA).png</a>
        <a href="What%3F%20Me%20Worry!%20(USA).png">What? Me Worry! (USA).png</a>
        <a href="Test%20%26%20More%20(World).png">Test &amp; More (World).png</a>
      </pre>
    `;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(3);
    expect(filenames).toContain('Game - Special Edition (USA)');
    expect(filenames).toContain('What? Me Worry! (USA)');
    expect(filenames).toContain('Test & More (World)');
  });

  it('skips links without href', () => {
    const html = `
      <pre>
        <a>No href</a>
        <a href="Game.png">Game.png</a>
      </pre>
    `;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(1);
    expect(filenames[0]).toBe('Game');
  });

  it('handles malformed HTML gracefully', () => {
    const html = `<pre><a href="Game.png">Game.png`;

    const filenames = parseCdnDirectory(html);
    expect(filenames).toHaveLength(1);
    expect(filenames[0]).toBe('Game');
  });
});
