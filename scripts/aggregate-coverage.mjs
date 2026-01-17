/**
 * Aggregate coverage from vitest and output for GitHub Actions badge
 *
 * Reads coverage-summary.json and outputs coverage percentage
 * to GitHub Actions outputs for use with dynamic badge action.
 */

import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COVERAGE_PATH = resolve(process.cwd(), 'coverage', 'coverage-summary.json');

/**
 * Get color based on coverage percentage
 * @param {number} coverage - Coverage percentage
 * @returns {string} Color name
 */
function getColor(coverage) {
  if (coverage >= 90) return 'brightgreen';
  if (coverage >= 80) return 'green';
  if (coverage >= 70) return 'yellowgreen';
  if (coverage >= 60) return 'yellow';
  if (coverage >= 50) return 'orange';
  return 'red';
}

/**
 * Write output to GitHub Actions
 * @param {string} name - Output name
 * @param {string} value - Output value
 */
function setOutput(name, value) {
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    appendFileSync(githubOutput, `${name}=${value}\n`);
  }
  console.log(`${name}=${value}`);
}

try {
  const summaryRaw = readFileSync(COVERAGE_PATH, 'utf-8');
  const summary = JSON.parse(summaryRaw);

  // Get overall line coverage percentage
  const total = summary.total;
  const lineCoverage = total.lines.pct;

  // Round to one decimal place
  const coverage = Math.round(lineCoverage * 10) / 10;
  const color = getColor(coverage);

  console.log(`Coverage: ${coverage}%`);
  console.log(`Color: ${color}`);

  setOutput('coverage', coverage);
  setOutput('color', color);

  process.exit(0);
} catch (error) {
  console.error('Failed to read coverage summary:', error.message);
  console.error('Make sure to run tests with coverage first: pnpm test:coverage');

  // Set defaults so the workflow doesn't fail completely
  setOutput('coverage', '0');
  setOutput('color', 'red');

  process.exit(1);
}
