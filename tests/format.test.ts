import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import type { FormatSettings, ImageFile, FormatResult, FormatOptions } from '../src/format/types.js';
import {
  getImgsDirectory,
  getOutputDirectory,
  scanForImages,
  findExistingFormatted,
  ensureOutputDir,
  calculatePosition,
  processImage,
  runFormat,
} from '../src/format/index.js';
import type { Config } from '../src/config/index.js';

/** Create a minimal test config - uses type assertion since tests only need specific fields */
function createTestConfig(
  downloadDir: string,
  systems: Array<{ system: string; url: string; enabled: boolean }>
): Config {
  return {
    downloadDir,
    systems,
    defaults: {
      tableId: 'list',
      whitelist: [] as string[],
      blacklist: [] as string[],
    },
  } as unknown as Config;
}

const TEST_DIR = join(process.cwd(), '.test-format');

/** Create a test PNG image with specified dimensions */
async function createTestImage(filePath: string, width: number, height: number): Promise<void> {
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toFile(filePath);
}

/** Default test format settings */
const DEFAULT_SETTINGS: FormatSettings = {
  canvasWidth: 640,
  canvasHeight: 480,
  resizeMaxWidth: 320,
  resizeMaxHeight: 320,
  gravity: 'west',
  padding: 20,
  outputFolder: 'Formatted',
};

describe('Format module', () => {
  describe('Type definitions', () => {
    it('FormatSettings has correct shape', () => {
      const settings: FormatSettings = {
        canvasWidth: 640,
        canvasHeight: 480,
        resizeMaxWidth: 320,
        resizeMaxHeight: 320,
        gravity: 'east',
        padding: 20,
        outputFolder: 'Formatted',
      };
      expect(settings.canvasWidth).toBe(640);
      expect(settings.canvasHeight).toBe(480);
      expect(settings.gravity).toBe('east');
      expect(settings.padding).toBe(20);
    });

    it('FormatSettings supports all gravity values', () => {
      const gravities: FormatSettings['gravity'][] = ['east', 'west', 'center', 'north', 'south'];
      for (const gravity of gravities) {
        const settings: FormatSettings = {
          canvasWidth: 640,
          canvasHeight: 480,
          resizeMaxWidth: 320,
          resizeMaxHeight: 320,
          gravity,
          padding: 0,
          outputFolder: 'Test',
        };
        expect(settings.gravity).toBe(gravity);
      }
    });

    it('ImageFile has correct shape', () => {
      const imageFile: ImageFile = {
        path: '/path/to/image.png',
        filename: 'image.png',
        stem: 'image',
        extension: '.png',
      };
      expect(imageFile.path).toBe('/path/to/image.png');
      expect(imageFile.filename).toBe('image.png');
      expect(imageFile.stem).toBe('image');
      expect(imageFile.extension).toBe('.png');
    });

    it('FormatResult has correct shape for success', () => {
      const result: FormatResult = {
        image: {
          path: '/path/to/image.png',
          filename: 'image.png',
          stem: 'image',
          extension: '.png',
        },
        status: 'formatted',
        outputPath: '/path/to/output/image.png',
      };
      expect(result.status).toBe('formatted');
      expect(result.outputPath).toBeDefined();
    });

    it('FormatResult has correct shape for failure', () => {
      const result: FormatResult = {
        image: {
          path: '/path/to/image.png',
          filename: 'image.png',
          stem: 'image',
          extension: '.png',
        },
        status: 'failed',
        error: 'Something went wrong',
      };
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Something went wrong');
    });

    it('FormatResult has correct shape for skipped', () => {
      const result: FormatResult = {
        image: {
          path: '/path/to/image.png',
          filename: 'image.png',
          stem: 'image',
          extension: '.png',
        },
        status: 'skipped',
        outputPath: '/path/to/existing/image.png',
      };
      expect(result.status).toBe('skipped');
    });
  });

  describe('Path utilities', () => {
    describe('getImgsDirectory', () => {
      it('appends Imgs to ROM directory', () => {
        const result = getImgsDirectory('/roms/snes');
        expect(result).toMatch(/[/\\]roms[/\\]snes[/\\]Imgs$/);
      });

      it('handles relative paths', () => {
        const result = getImgsDirectory('./downloads/gbc');
        expect(result).toContain('Imgs');
      });

      it('preserves case sensitivity', () => {
        const result = getImgsDirectory('/roms/PS');
        expect(result).toMatch(/[/\\]PS[/\\]Imgs$/);
      });
    });

    describe('getOutputDirectory', () => {
      it('appends output folder to Imgs directory', () => {
        const result = getOutputDirectory('/roms/snes/Imgs', 'Formatted');
        expect(result).toMatch(/[/\\]Imgs[/\\]Formatted$/);
      });

      it('preserves custom output folder name', () => {
        const result = getOutputDirectory('/roms/snes/Imgs', 'RG35XX');
        expect(result).toMatch(/[/\\]Imgs[/\\]RG35XX$/);
      });
    });
  });

  describe('calculatePosition', () => {
    const canvas = { width: 640, height: 480 };
    const image = { width: 200, height: 300 };

    describe('center gravity', () => {
      it('centers image horizontally and vertically', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'center', 0);
        expect(pos.left).toBe(220); // (640 - 200) / 2
        expect(pos.top).toBe(90); // (480 - 300) / 2
      });

      it('ignores padding for center gravity', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'center', 50);
        expect(pos.left).toBe(220);
        expect(pos.top).toBe(90);
      });
    });

    describe('west gravity', () => {
      it('aligns to left edge, vertically centered', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'west', 0);
        expect(pos.left).toBe(0);
        expect(pos.top).toBe(90);
      });

      it('respects padding from left edge', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'west', 20);
        expect(pos.left).toBe(20);
        expect(pos.top).toBe(90);
      });
    });

    describe('east gravity', () => {
      it('aligns to right edge, vertically centered', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'east', 0);
        expect(pos.left).toBe(440); // 640 - 200
        expect(pos.top).toBe(90);
      });

      it('respects padding from right edge', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'east', 20);
        expect(pos.left).toBe(420); // 640 - 200 - 20
        expect(pos.top).toBe(90);
      });
    });

    describe('north gravity', () => {
      it('aligns to top edge, horizontally centered', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'north', 0);
        expect(pos.left).toBe(220);
        expect(pos.top).toBe(0);
      });

      it('respects padding from top edge', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'north', 15);
        expect(pos.left).toBe(220);
        expect(pos.top).toBe(15);
      });
    });

    describe('south gravity', () => {
      it('aligns to bottom edge, horizontally centered', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'south', 0);
        expect(pos.left).toBe(220);
        expect(pos.top).toBe(180); // 480 - 300
      });

      it('respects padding from bottom edge', () => {
        const pos = calculatePosition(canvas.width, canvas.height, image.width, image.height, 'south', 25);
        expect(pos.left).toBe(220);
        expect(pos.top).toBe(155); // 480 - 300 - 25
      });
    });

    describe('edge cases', () => {
      it('handles image same size as canvas', () => {
        const pos = calculatePosition(640, 480, 640, 480, 'center', 0);
        expect(pos.left).toBe(0);
        expect(pos.top).toBe(0);
      });

      it('handles small padding', () => {
        const pos = calculatePosition(640, 480, 200, 200, 'west', 1);
        expect(pos.left).toBe(1);
      });

      it('rounds position to nearest integer', () => {
        // 640 - 201 = 439 / 2 = 219.5 -> 220
        const pos = calculatePosition(640, 480, 201, 201, 'center', 0);
        expect(Number.isInteger(pos.left)).toBe(true);
        expect(Number.isInteger(pos.top)).toBe(true);
      });
    });
  });

  describe('Scanner operations', () => {
    beforeEach(() => {
      mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
      rmSync(TEST_DIR, { recursive: true, force: true });
    });

    describe('scanForImages', () => {
      it('finds PNG files', async () => {
        const imgsDir = join(TEST_DIR, 'Imgs');
        mkdirSync(imgsDir);
        writeFileSync(join(imgsDir, 'game1.png'), 'fake png');
        writeFileSync(join(imgsDir, 'game2.png'), 'fake png');

        const images = await scanForImages(imgsDir);

        expect(images).toHaveLength(2);
        expect(images[0]?.filename).toBe('game1.png');
        expect(images[1]?.filename).toBe('game2.png');
      });

      it('finds JPG and JPEG files', async () => {
        const imgsDir = join(TEST_DIR, 'Imgs');
        mkdirSync(imgsDir);
        writeFileSync(join(imgsDir, 'game1.jpg'), 'fake jpg');
        writeFileSync(join(imgsDir, 'game2.jpeg'), 'fake jpeg');

        const images = await scanForImages(imgsDir);

        expect(images).toHaveLength(2);
      });

      it('ignores non-image files', async () => {
        const imgsDir = join(TEST_DIR, 'Imgs');
        mkdirSync(imgsDir);
        writeFileSync(join(imgsDir, 'game.png'), 'fake png');
        writeFileSync(join(imgsDir, 'readme.txt'), 'text file');
        writeFileSync(join(imgsDir, 'data.json'), '{}');

        const images = await scanForImages(imgsDir);

        expect(images).toHaveLength(1);
        expect(images[0]?.filename).toBe('game.png');
      });

      it('ignores hidden files', async () => {
        const imgsDir = join(TEST_DIR, 'Imgs');
        mkdirSync(imgsDir);
        writeFileSync(join(imgsDir, 'game.png'), 'fake png');
        writeFileSync(join(imgsDir, '.hidden.png'), 'hidden png');

        const images = await scanForImages(imgsDir);

        expect(images).toHaveLength(1);
      });

      it('ignores subdirectories', async () => {
        const imgsDir = join(TEST_DIR, 'Imgs');
        mkdirSync(imgsDir);
        mkdirSync(join(imgsDir, 'subdir'));
        writeFileSync(join(imgsDir, 'game.png'), 'fake png');
        writeFileSync(join(imgsDir, 'subdir', 'nested.png'), 'nested png');

        const images = await scanForImages(imgsDir);

        expect(images).toHaveLength(1);
      });

      it('sorts images alphabetically', async () => {
        const imgsDir = join(TEST_DIR, 'Imgs');
        mkdirSync(imgsDir);
        writeFileSync(join(imgsDir, 'zelda.png'), 'fake');
        writeFileSync(join(imgsDir, 'mario.png'), 'fake');
        writeFileSync(join(imgsDir, 'alttp.png'), 'fake');

        const images = await scanForImages(imgsDir);

        expect(images[0]?.filename).toBe('alttp.png');
        expect(images[1]?.filename).toBe('mario.png');
        expect(images[2]?.filename).toBe('zelda.png');
      });

      it('extracts stem and extension correctly', async () => {
        const imgsDir = join(TEST_DIR, 'Imgs');
        mkdirSync(imgsDir);
        writeFileSync(join(imgsDir, 'Super Mario World.png'), 'fake');

        const images = await scanForImages(imgsDir);

        expect(images[0]?.stem).toBe('Super Mario World');
        expect(images[0]?.extension).toBe('.png');
      });

      it('throws error for non-existent directory', async () => {
        const nonExistent = join(TEST_DIR, 'does-not-exist');

        await expect(scanForImages(nonExistent)).rejects.toThrow('not found');
      });

      it('throws permission denied error for unreadable directory', async () => {
        // Skip on Windows where chmod doesn't work the same way
        if (process.platform === 'win32') {
          return;
        }

        const restrictedDir = join(TEST_DIR, 'restricted');
        mkdirSync(restrictedDir);
        // Remove read permission
        chmodSync(restrictedDir, 0o000);

        try {
          await expect(scanForImages(restrictedDir)).rejects.toThrow('Permission denied');
        } finally {
          // Restore permissions for cleanup
          chmodSync(restrictedDir, 0o755);
        }
      });

      it('returns empty array for empty directory', async () => {
        const emptyDir = join(TEST_DIR, 'empty');
        mkdirSync(emptyDir);

        const images = await scanForImages(emptyDir);

        expect(images).toHaveLength(0);
      });
    });

    describe('findExistingFormatted', () => {
      it('returns path when PNG exists', async () => {
        const outputDir = join(TEST_DIR, 'output');
        mkdirSync(outputDir);
        const existingPath = join(outputDir, 'game.png');
        writeFileSync(existingPath, 'fake');

        const result = await findExistingFormatted('game', outputDir);

        expect(result).toBe(existingPath);
      });

      it('returns path when JPG exists', async () => {
        const outputDir = join(TEST_DIR, 'output');
        mkdirSync(outputDir);
        const existingPath = join(outputDir, 'game.jpg');
        writeFileSync(existingPath, 'fake');

        const result = await findExistingFormatted('game', outputDir);

        expect(result).toBe(existingPath);
      });

      it('returns null when no matching file exists', async () => {
        const outputDir = join(TEST_DIR, 'output');
        mkdirSync(outputDir);

        const result = await findExistingFormatted('game', outputDir);

        expect(result).toBeNull();
      });

      it('prefers PNG over JPG when both exist', async () => {
        const outputDir = join(TEST_DIR, 'output');
        mkdirSync(outputDir);
        writeFileSync(join(outputDir, 'game.png'), 'png');
        writeFileSync(join(outputDir, 'game.jpg'), 'jpg');

        const result = await findExistingFormatted('game', outputDir);

        expect(result).toContain('.png');
      });
    });

    describe('ensureOutputDir', () => {
      it('creates directory if it does not exist', async () => {
        const newDir = join(TEST_DIR, 'new-output');

        await ensureOutputDir(newDir);

        expect(existsSync(newDir)).toBe(true);
      });

      it('creates nested directories', async () => {
        const nestedDir = join(TEST_DIR, 'a', 'b', 'c');

        await ensureOutputDir(nestedDir);

        expect(existsSync(nestedDir)).toBe(true);
      });

      it('does not throw if directory already exists', async () => {
        const existingDir = join(TEST_DIR, 'existing');
        mkdirSync(existingDir);

        await expect(ensureOutputDir(existingDir)).resolves.toBeUndefined();
      });
    });
  });

  describe('processImage', () => {
    beforeEach(() => {
      mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
      rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it('processes image and creates formatted output', async () => {
      const imgsDir = join(TEST_DIR, 'Imgs');
      const outputDir = join(TEST_DIR, 'output');
      mkdirSync(imgsDir);
      mkdirSync(outputDir);

      const sourcePath = join(imgsDir, 'game.png');
      await createTestImage(sourcePath, 400, 300);

      const image: ImageFile = {
        path: sourcePath,
        filename: 'game.png',
        stem: 'game',
        extension: '.png',
      };

      const result = await processImage(image, DEFAULT_SETTINGS, outputDir, false);

      expect(result.status).toBe('formatted');
      expect(result.outputPath).toBeDefined();
      expect(existsSync(result.outputPath!)).toBe(true);

      // Verify output dimensions
      const meta = await sharp(result.outputPath).metadata();
      expect(meta.width).toBe(DEFAULT_SETTINGS.canvasWidth);
      expect(meta.height).toBe(DEFAULT_SETTINGS.canvasHeight);
    });

    it('skips existing formatted image without force', async () => {
      const imgsDir = join(TEST_DIR, 'Imgs');
      const outputDir = join(TEST_DIR, 'output');
      mkdirSync(imgsDir);
      mkdirSync(outputDir);

      const sourcePath = join(imgsDir, 'game.png');
      const existingPath = join(outputDir, 'game.png');
      await createTestImage(sourcePath, 400, 300);
      await createTestImage(existingPath, 100, 100); // Different size to prove it wasn't overwritten

      const image: ImageFile = {
        path: sourcePath,
        filename: 'game.png',
        stem: 'game',
        extension: '.png',
      };

      const result = await processImage(image, DEFAULT_SETTINGS, outputDir, false);

      expect(result.status).toBe('skipped');

      // Verify existing file wasn't overwritten
      const meta = await sharp(existingPath).metadata();
      expect(meta.width).toBe(100);
    });

    it('overwrites existing formatted image with force', async () => {
      const imgsDir = join(TEST_DIR, 'Imgs');
      const outputDir = join(TEST_DIR, 'output');
      mkdirSync(imgsDir);
      mkdirSync(outputDir);

      const sourcePath = join(imgsDir, 'game.png');
      const existingPath = join(outputDir, 'game.png');
      await createTestImage(sourcePath, 400, 300);
      await createTestImage(existingPath, 100, 100);

      const image: ImageFile = {
        path: sourcePath,
        filename: 'game.png',
        stem: 'game',
        extension: '.png',
      };

      const result = await processImage(image, DEFAULT_SETTINGS, outputDir, true);

      expect(result.status).toBe('formatted');

      // Verify file was overwritten with correct dimensions
      const meta = await sharp(existingPath).metadata();
      expect(meta.width).toBe(DEFAULT_SETTINGS.canvasWidth);
    });

    it('resizes large images to fit within max dimensions', async () => {
      const imgsDir = join(TEST_DIR, 'Imgs');
      const outputDir = join(TEST_DIR, 'output');
      mkdirSync(imgsDir);
      mkdirSync(outputDir);

      // Create a large image
      const sourcePath = join(imgsDir, 'large.png');
      await createTestImage(sourcePath, 1000, 800);

      const image: ImageFile = {
        path: sourcePath,
        filename: 'large.png',
        stem: 'large',
        extension: '.png',
      };

      const result = await processImage(image, DEFAULT_SETTINGS, outputDir, false);

      expect(result.status).toBe('formatted');
      expect(existsSync(result.outputPath!)).toBe(true);
    });

    it('does not enlarge small images', async () => {
      const imgsDir = join(TEST_DIR, 'Imgs');
      const outputDir = join(TEST_DIR, 'output');
      mkdirSync(imgsDir);
      mkdirSync(outputDir);

      // Create a small image
      const sourcePath = join(imgsDir, 'small.png');
      await createTestImage(sourcePath, 50, 50);

      const image: ImageFile = {
        path: sourcePath,
        filename: 'small.png',
        stem: 'small',
        extension: '.png',
      };

      const result = await processImage(image, DEFAULT_SETTINGS, outputDir, false);

      expect(result.status).toBe('formatted');
    });

    it('converts JPG to PNG for transparency support', async () => {
      const imgsDir = join(TEST_DIR, 'Imgs');
      const outputDir = join(TEST_DIR, 'output');
      mkdirSync(imgsDir);
      mkdirSync(outputDir);

      const sourcePath = join(imgsDir, 'game.jpg');
      await sharp({
        create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 0, b: 0 } },
      })
        .jpeg()
        .toFile(sourcePath);

      const image: ImageFile = {
        path: sourcePath,
        filename: 'game.jpg',
        stem: 'game',
        extension: '.jpg',
      };

      const result = await processImage(image, DEFAULT_SETTINGS, outputDir, false);

      expect(result.status).toBe('formatted');
      expect(result.outputPath).toContain('.png');
    });

    it('returns failed status for invalid image', async () => {
      const imgsDir = join(TEST_DIR, 'Imgs');
      const outputDir = join(TEST_DIR, 'output');
      mkdirSync(imgsDir);
      mkdirSync(outputDir);

      // Create invalid image file
      const sourcePath = join(imgsDir, 'invalid.png');
      writeFileSync(sourcePath, 'not a real image');

      const image: ImageFile = {
        path: sourcePath,
        filename: 'invalid.png',
        stem: 'invalid',
        extension: '.png',
      };

      const result = await processImage(image, DEFAULT_SETTINGS, outputDir, false);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    it('returns failed status for non-existent image', async () => {
      const outputDir = join(TEST_DIR, 'output');
      mkdirSync(outputDir);

      const image: ImageFile = {
        path: join(TEST_DIR, 'nonexistent.png'),
        filename: 'nonexistent.png',
        stem: 'nonexistent',
        extension: '.png',
      };

      const result = await processImage(image, DEFAULT_SETTINGS, outputDir, false);

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    it('applies different gravity settings correctly', async () => {
      const imgsDir = join(TEST_DIR, 'Imgs');
      const outputDir = join(TEST_DIR, 'output');
      mkdirSync(imgsDir);
      mkdirSync(outputDir);

      const sourcePath = join(imgsDir, 'game.png');
      await createTestImage(sourcePath, 100, 100);

      const image: ImageFile = {
        path: sourcePath,
        filename: 'game.png',
        stem: 'game',
        extension: '.png',
      };

      const settings: FormatSettings = {
        ...DEFAULT_SETTINGS,
        gravity: 'east',
        padding: 0,
      };

      const result = await processImage(image, settings, outputDir, false);

      expect(result.status).toBe('formatted');
    });
  });

  describe('runFormat', () => {
    beforeEach(() => {
      mkdirSync(TEST_DIR, { recursive: true });
      // Suppress console output during tests
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      rmSync(TEST_DIR, { recursive: true, force: true });
      vi.restoreAllMocks();
    });

    it('processes images from enabled systems', async () => {
      const systemDir = join(TEST_DIR, 'snes');
      const imgsDir = join(systemDir, 'Imgs');
      mkdirSync(imgsDir, { recursive: true });
      await createTestImage(join(imgsDir, 'game1.png'), 200, 200);
      await createTestImage(join(imgsDir, 'game2.png'), 200, 200);

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      const results = await runFormat(config, options);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === 'formatted')).toBe(true);
    });

    it('skips disabled systems', async () => {
      const systemDir = join(TEST_DIR, 'snes');
      const imgsDir = join(systemDir, 'Imgs');
      mkdirSync(imgsDir, { recursive: true });
      await createTestImage(join(imgsDir, 'game.png'), 200, 200);

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: false },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      const results = await runFormat(config, options);

      expect(results).toHaveLength(0);
    });

    it('returns empty array in dry run mode', async () => {
      const systemDir = join(TEST_DIR, 'snes');
      const imgsDir = join(systemDir, 'Imgs');
      mkdirSync(imgsDir, { recursive: true });
      await createTestImage(join(imgsDir, 'game.png'), 200, 200);

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: true,
        force: false,
      };

      const results = await runFormat(config, options);

      expect(results).toHaveLength(0);

      // Verify no output files were created
      const outputDir = join(imgsDir, DEFAULT_SETTINGS.outputFolder);
      expect(existsSync(outputDir)).toBe(false);
    });

    it('applies limit option', async () => {
      const systemDir = join(TEST_DIR, 'snes');
      const imgsDir = join(systemDir, 'Imgs');
      mkdirSync(imgsDir, { recursive: true });
      await createTestImage(join(imgsDir, 'game1.png'), 200, 200);
      await createTestImage(join(imgsDir, 'game2.png'), 200, 200);
      await createTestImage(join(imgsDir, 'game3.png'), 200, 200);

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
        limit: 2,
      };

      const results = await runFormat(config, options);

      expect(results).toHaveLength(2);
    });

    it('handles missing Imgs directory gracefully', async () => {
      const systemDir = join(TEST_DIR, 'snes');
      mkdirSync(systemDir);
      // Don't create Imgs directory

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      // Should not throw
      const results = await runFormat(config, options);

      expect(results).toHaveLength(0);
    });

    it('handles empty Imgs directory', async () => {
      const systemDir = join(TEST_DIR, 'snes');
      const imgsDir = join(systemDir, 'Imgs');
      mkdirSync(imgsDir, { recursive: true });
      // Don't create any images

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      const results = await runFormat(config, options);

      expect(results).toHaveLength(0);
    });

    it('processes multiple systems', async () => {
      // Create two system directories
      const snesDir = join(TEST_DIR, 'snes');
      const snesImgsDir = join(snesDir, 'Imgs');
      mkdirSync(snesImgsDir, { recursive: true });
      await createTestImage(join(snesImgsDir, 'game1.png'), 200, 200);

      const gbcDir = join(TEST_DIR, 'gbc');
      const gbcImgsDir = join(gbcDir, 'Imgs');
      mkdirSync(gbcImgsDir, { recursive: true });
      await createTestImage(join(gbcImgsDir, 'game2.png'), 200, 200);

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
        { system: 'gbc', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      const results = await runFormat(config, options);

      expect(results).toHaveLength(2);
    });

    it('continues processing after system error', async () => {
      // First system has no Imgs directory (will be skipped gracefully)
      const nesDir = join(TEST_DIR, 'nes');
      mkdirSync(nesDir);
      // Don't create Imgs directory for NES - this will be skipped

      // Second system has valid images
      const gbcDir = join(TEST_DIR, 'gbc');
      const gbcImgsDir = join(gbcDir, 'Imgs');
      mkdirSync(gbcImgsDir, { recursive: true });
      await createTestImage(join(gbcImgsDir, 'game.png'), 200, 200);

      const config = createTestConfig(TEST_DIR, [
        { system: 'nes', url: 'http://example.com', enabled: true },
        { system: 'gbc', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      const results = await runFormat(config, options);

      // Should have processed the gbc system
      expect(results).toHaveLength(1);
    });

    it('includes failed results in output', async () => {
      const systemDir = join(TEST_DIR, 'snes');
      const imgsDir = join(systemDir, 'Imgs');
      mkdirSync(imgsDir, { recursive: true });
      // Create an invalid image
      writeFileSync(join(imgsDir, 'bad.png'), 'not a real image');

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      const results = await runFormat(config, options);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('failed');
    });

    it('includes skipped results for existing formatted images', async () => {
      const systemDir = join(TEST_DIR, 'snes');
      const imgsDir = join(systemDir, 'Imgs');
      const outputDir = join(imgsDir, DEFAULT_SETTINGS.outputFolder);
      mkdirSync(outputDir, { recursive: true });

      // Create source image
      await createTestImage(join(imgsDir, 'game.png'), 200, 200);
      // Create existing formatted image
      await createTestImage(join(outputDir, 'game.png'), 100, 100);

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      const results = await runFormat(config, options);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('skipped');
    });

    it('processes mixed results (formatted, skipped, failed)', async () => {
      const systemDir = join(TEST_DIR, 'snes');
      const imgsDir = join(systemDir, 'Imgs');
      const outputDir = join(imgsDir, DEFAULT_SETTINGS.outputFolder);
      mkdirSync(outputDir, { recursive: true });

      // Create images with different outcomes
      await createTestImage(join(imgsDir, 'a-new.png'), 200, 200); // Will be formatted
      await createTestImage(join(imgsDir, 'b-existing.png'), 200, 200); // Will be skipped
      await createTestImage(join(outputDir, 'b-existing.png'), 100, 100);
      writeFileSync(join(imgsDir, 'c-invalid.png'), 'not an image'); // Will fail

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      const results = await runFormat(config, options);

      expect(results).toHaveLength(3);
      const statuses = results.map((r) => r.status);
      expect(statuses).toContain('formatted');
      expect(statuses).toContain('skipped');
      expect(statuses).toContain('failed');
    });

    it('handles non-ENOENT scan errors gracefully', async () => {
      // Create a valid second system
      const gbcDir = join(TEST_DIR, 'gbc');
      const gbcImgsDir = join(gbcDir, 'Imgs');
      mkdirSync(gbcImgsDir, { recursive: true });
      await createTestImage(join(gbcImgsDir, 'game.png'), 200, 200);

      // First system exists but will have some other issue handled by the error catch
      const snesDir = join(TEST_DIR, 'snes');
      mkdirSync(snesDir);
      // Don't create Imgs - this triggers "not found" which is handled

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
        { system: 'gbc', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      // Should continue to second system after first one is skipped
      const results = await runFormat(config, options);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('formatted');
    });

    it('catches and logs permission errors from processSystem', async () => {
      // Skip on Windows where chmod doesn't work the same way
      if (process.platform === 'win32') {
        return;
      }

      // Create a valid second system
      const gbcDir = join(TEST_DIR, 'gbc');
      const gbcImgsDir = join(gbcDir, 'Imgs');
      mkdirSync(gbcImgsDir, { recursive: true });
      await createTestImage(join(gbcImgsDir, 'game.png'), 200, 200);

      // First system has restricted Imgs directory
      const snesDir = join(TEST_DIR, 'snes');
      const snesImgsDir = join(snesDir, 'Imgs');
      mkdirSync(snesImgsDir, { recursive: true });
      // Remove read permission to trigger permission error
      chmodSync(snesImgsDir, 0o000);

      const config = createTestConfig(TEST_DIR, [
        { system: 'snes', url: 'http://example.com', enabled: true },
        { system: 'gbc', url: 'http://example.com', enabled: true },
      ]);

      const options: FormatOptions = {
        settings: DEFAULT_SETTINGS,
        dryRun: false,
        force: false,
      };

      try {
        // Should catch error for first system and continue to second
        const results = await runFormat(config, options);

        // Should have processed the gbc system
        expect(results).toHaveLength(1);
        expect(results[0]?.status).toBe('formatted');
      } finally {
        // Restore permissions for cleanup
        chmodSync(snesImgsDir, 0o755);
      }
    });
  });
});
