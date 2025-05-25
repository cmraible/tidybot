import { TestFailure, FlakyTest } from '../types';

export class FlakyTestAnalyzer {
  private testFailures: Map<string, TestFailure[]> = new Map();

  addFailure(failure: TestFailure): void {
    const key = `${failure.testFile}:${failure.testName}`;
    if (!this.testFailures.has(key)) {
      this.testFailures.set(key, []);
    }
    this.testFailures.get(key)!.push(failure);
  }

  analyze(totalRuns: number): FlakyTest[] {
    const flakyTests: FlakyTest[] = [];

    for (const [key, failures] of this.testFailures.entries()) {
      const [testFile, ...testNameParts] = key.split(':');
      const testName = testNameParts.join(':');

      if (failures.length < 2) {
        continue; // Not flaky if it only failed once
      }

      const failureRate = failures.length / totalRuns;
      const flakinessScore = this.calculateFlakinessScore(failures, totalRuns);

      const errorPatterns = this.extractCommonErrorPatterns(failures);

      flakyTests.push({
        testName,
        testFile: testFile || '',
        failureCount: failures.length,
        totalRuns,
        failureRate,
        flakinessScore,
        failures,
        commonErrorPatterns: errorPatterns,
      });
    }

    // Sort by flakiness score descending
    return flakyTests.sort((a, b) => b.flakinessScore - a.flakinessScore);
  }

  private calculateFlakinessScore(failures: TestFailure[], totalRuns: number): number {
    const failureRate = failures.length / totalRuns;
    const recencyWeight = this.calculateRecencyWeight(failures);
    const consistencyWeight = this.calculateConsistencyWeight(failures);

    // Weighted score calculation
    return failureRate * 0.4 + recencyWeight * 0.3 + consistencyWeight * 0.3;
  }

  private calculateRecencyWeight(failures: TestFailure[]): number {
    const now = Date.now();
    const weights = failures.map((f) => {
      const age = now - new Date(f.timestamp).getTime();
      const daysOld = age / (1000 * 60 * 60 * 24);
      return Math.max(0, 1 - daysOld / 30); // Linear decay over 30 days
    });

    return weights.reduce((a, b) => a + b, 0) / weights.length;
  }

  private calculateConsistencyWeight(failures: TestFailure[]): number {
    // Check if failures are spread across different commits/branches
    const uniqueCommits = new Set(failures.map((f) => f.commitSha)).size;
    const uniqueBranches = new Set(failures.map((f) => f.branch)).size;

    return (uniqueCommits / failures.length + uniqueBranches / failures.length) / 2;
  }

  private extractCommonErrorPatterns(failures: TestFailure[]): string[] {
    const errorCounts = new Map<string, number>();

    for (const failure of failures) {
      // Simple pattern extraction - can be made more sophisticated
      const patterns = this.extractPatterns(failure.errorMessage);
      for (const pattern of patterns) {
        errorCounts.set(pattern, (errorCounts.get(pattern) || 0) + 1);
      }
    }

    // Return patterns that appear in at least 50% of failures
    const threshold = failures.length * 0.5;
    return Array.from(errorCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([pattern]) => pattern)
      .slice(0, 5); // Top 5 patterns
  }

  private extractPatterns(errorMessage: string): string[] {
    const patterns: string[] = [];

    // Extract timeout patterns
    if (/timeout|timed out/i.test(errorMessage)) {
      patterns.push('Timeout');
    }

    // Extract network errors
    if (/network|connection|ECONNREFUSED/i.test(errorMessage)) {
      patterns.push('Network Error');
    }

    // Extract assertion failures
    if (/expect|assert|should/i.test(errorMessage)) {
      patterns.push('Assertion Failure');
    }

    // Extract race conditions
    if (/race|concurrent|async/i.test(errorMessage)) {
      patterns.push('Possible Race Condition');
    }

    return patterns;
  }
}
