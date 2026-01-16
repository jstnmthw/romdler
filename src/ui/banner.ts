import chalk from 'chalk';

const VERSION = '1.0.0';

const BANNER = `
${chalk.cyan.bold('╔════════════════════════════════════════════════════════╗')}
${chalk.cyan.bold('║')}  ${chalk.white.bold('ROMDLER')} ${chalk.gray(`v${VERSION}`)}                                        ${chalk.cyan.bold('║')}
${chalk.cyan.bold('║')}  ${chalk.gray('Archive ZIP file bulk downloader')}                      ${chalk.cyan.bold('║')}
${chalk.cyan.bold('╚════════════════════════════════════════════════════════╝')}
`;

export function printBanner(): void {
  console.log(BANNER);
}

export function printDryRunBanner(): void {
  console.log(BANNER);
  console.log(chalk.yellow.bold('  [DRY RUN MODE - No files will be downloaded]\n'));
}
