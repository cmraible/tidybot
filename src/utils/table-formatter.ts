import chalk from 'chalk';
import { FlakyTest } from '../types';

export function formatTable(flakyTests: FlakyTest[]): string {
  const rows: string[] = [];

  // Header
  rows.push(
    chalk.bold('Test Name').padEnd(50) +
      chalk.bold('File').padEnd(30) +
      chalk.bold('Failures').padEnd(10) +
      chalk.bold('Rate').padEnd(10) +
      chalk.bold('Score')
  );

  rows.push('-'.repeat(110));

  // Top 10 flaky tests
  const topTests = flakyTests.slice(0, 10);

  for (const test of topTests) {
    const testName =
      test.testName.length > 47 ? test.testName.substring(0, 44) + '...' : test.testName;

    const fileName =
      test.testFile.length > 27
        ? '...' + test.testFile.substring(test.testFile.length - 24)
        : test.testFile;

    const failureRate = `${(test.failureRate * 100).toFixed(1)}%`;
    const score = test.flakinessScore.toFixed(3);

    rows.push(
      testName.padEnd(50) +
        fileName.padEnd(30) +
        test.failureCount.toString().padEnd(10) +
        failureRate.padEnd(10) +
        score
    );
  }

  if (flakyTests.length > 10) {
    rows.push(`\n... and ${flakyTests.length - 10} more flaky tests`);
  }

  return rows.join('\n');
}
