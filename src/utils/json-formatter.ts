import { FlakyTest } from '../types';

export function formatJSON(flakyTests: FlakyTest[]): string {
  const top10 = flakyTests.slice(0, 10);

  const output = {
    summary: {
      totalFlakyTests: flakyTests.length,
      showing: top10.length,
    },
    flakyTests: top10.map((test) => ({
      testName: test.testName,
      testFile: test.testFile,
      failureCount: test.failureCount,
      totalRuns: test.totalRuns,
      failureRate: test.failureRate,
      flakinessScore: test.flakinessScore,
      commonErrorPatterns: test.commonErrorPatterns,
      recentFailures: test.failures.slice(0, 5).map((f) => ({
        commitSha: f.commitSha,
        branch: f.branch,
        timestamp: f.timestamp,
        errorMessage: f.errorMessage.substring(0, 200) + '...',
      })),
    })),
  };

  return JSON.stringify(output, null, 2);
}
