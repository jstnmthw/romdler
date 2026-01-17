import chalk from 'chalk';

const VERSION = '1.0.0';

function createBanner(subtitle: string): string {
  return `${chalk.cyan.bold('╔════════════════════════════════════════════════════════╗')}
${chalk.cyan.bold('║')}  ${chalk.white.bold('ROMDLER')} ${chalk.gray(`v${VERSION}`)}                                        ${chalk.cyan.bold('║')}
${chalk.cyan.bold('║')}  ${chalk.gray(subtitle.padEnd(54))}${chalk.cyan.bold('║')}
${chalk.cyan.bold('╚════════════════════════════════════════════════════════╝')}
`;
}

const DOWNLOAD_BANNER = createBanner('Bulk ZIP downloader');
const SCRAPER_BANNER = createBanner('Artwork downloader');

export function printBanner(): void {
  console.log(DOWNLOAD_BANNER);
}

export function printDryRunBanner(): void {
  console.log(DOWNLOAD_BANNER);
  console.log(chalk.yellow.bold('  [DRY RUN MODE - No files will be downloaded]\n'));
}

export function printScraperBanner(): void {
  console.log(SCRAPER_BANNER);
}

export function printScraperDryRunBanner(): void {
  console.log(SCRAPER_BANNER);
  console.log(chalk.yellow.bold('  [DRY RUN MODE - No images will be downloaded]\n'));
}
