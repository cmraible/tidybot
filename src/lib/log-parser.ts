import AdmZip from 'adm-zip';
import { TestFailure } from '../types';

export class LogParser {
  private readonly jestFailurePatterns = {
    // Pattern for Jest test failures
    testFailure: /FAIL\s+([^\s]+)\s*\n([^✓✕]*?)(?=\n\s*(?:✓|✕|PASS|FAIL|$))/gm,
    // Pattern for individual test cases
    failedTest: /✕\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/gm,
    // Pattern for error messages
    errorMessage: /(?:Expected|Received|Error|Failed|Timeout)[\s\S]+?(?=\n\s*(?:✓|✕|at\s+|$))/gm,
    // Pattern for test suite info
    testSuite: /(?:describe|test|it)\s*\(\s*["'](.+?)["']/,
  };

  /**
   * Extract logs from GitHub Actions zip file
   */
  async extractLogsFromZip(zipBuffer: Buffer): Promise<string[]> {
    try {
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();
      const logs: string[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory) {
          const content = entry.getData().toString('utf8');
          logs.push(content);
        }
      }

      return logs;
    } catch (error) {
      console.error('Failed to extract zip:', error);
      return [];
    }
  }

  /**
   * Parse test failures from log content
   */
  parseTestFailures(
    logContent: string,
    workflowRunId: number,
    commitSha: string,
    timestamp: string,
    branch: string
  ): TestFailure[] {
    const failures: TestFailure[] = [];

    // Try to find Jest test failures
    const jestFailures = this.parseJestFailures(logContent);

    for (const failure of jestFailures) {
      if (failure.testName && failure.testFile && failure.errorMessage) {
        failures.push({
          testName: failure.testName,
          testFile: failure.testFile,
          errorMessage: failure.errorMessage,
          workflowRunId,
          commitSha,
          timestamp,
          branch,
        });
      }
    }

    // If no Jest failures found, try other patterns
    if (failures.length === 0) {
      const genericFailures = this.parseGenericFailures(logContent);
      for (const failure of genericFailures) {
        if (failure.testName && failure.testFile && failure.errorMessage) {
          failures.push({
            testName: failure.testName,
            testFile: failure.testFile,
            errorMessage: failure.errorMessage,
            workflowRunId,
            commitSha,
            timestamp,
            branch,
          });
        }
      }
    }

    return failures;
  }

  /**
   * Parse Jest-specific test failures
   */
  private parseJestFailures(logContent: string): Partial<TestFailure>[] {
    const failures: Partial<TestFailure>[] = [];

    // Find all FAIL blocks
    let match;
    while ((match = this.jestFailurePatterns.testFailure.exec(logContent)) !== null) {
      const testFile = match[1];
      const failureBlock = match[2];

      if (!testFile || !failureBlock) continue;

      // Find individual failed tests in this block
      let testMatch;
      this.jestFailurePatterns.failedTest.lastIndex = 0;

      while ((testMatch = this.jestFailurePatterns.failedTest.exec(failureBlock)) !== null) {
        const testName = testMatch[1]?.trim();

        // Try to extract error message
        const errorMatch = this.jestFailurePatterns.errorMessage.exec(failureBlock);
        const errorMessage = errorMatch ? errorMatch[0].trim() : 'Test failed';

        if (testName && testFile) {
          failures.push({
            testName,
            testFile,
            errorMessage,
          });
        }
      }
    }

    return failures;
  }

  /**
   * Parse generic test failures (fallback for non-Jest tests)
   */
  private parseGenericFailures(logContent: string): Partial<TestFailure>[] {
    const failures: Partial<TestFailure>[] = [];

    // Common patterns for test failures across different frameworks
    const patterns = [
      // Mocha/Chai style
      /(\d+\)|✖|✗|×|FAILED|FAIL)\s+(.+?)(?:\n|$)/g,
      // TAP style
      /not ok \d+\s+(.+?)(?:\n|$)/g,
      // Generic error with file
      /Error in (.+?):\s*(.+?)(?:\n|$)/g,
      // Pytest style
      /FAILED\s+(.+?)\s*-\s*(.+?)(?:\n|$)/g,
    ];

    for (const pattern of patterns) {
      let match;
      pattern.lastIndex = 0;

      while ((match = pattern.exec(logContent)) !== null) {
        const testInfo = match[2] || match[1];
        if (testInfo && !testInfo.includes('npm') && !testInfo.includes('node_modules')) {
          // Try to extract file and test name
          const parts = testInfo.split(/[:\s›]+/).filter(Boolean);
          const testFile = parts.find((p) => p.includes('.')) || 'unknown';
          const testName = parts.filter((p) => p !== testFile).join(' › ') || testInfo;

          failures.push({
            testName: testName.trim(),
            testFile: testFile.trim(),
            errorMessage: 'Test failed',
          });
        }
      }
    }

    // Deduplicate failures
    const seen = new Set<string>();
    return failures.filter((f) => {
      if (!f.testFile || !f.testName) return false;
      const key = `${f.testFile}:${f.testName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
