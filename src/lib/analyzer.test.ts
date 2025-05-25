import { describe, it, expect } from 'vitest';
import { FlakyTestAnalyzer } from '../lib/analyzer';
import { TestFailure } from '../types';

describe('FlakyTestAnalyzer', () => {
  it('should create an instance', () => {
    const analyzer = new FlakyTestAnalyzer();
    expect(analyzer).toBeDefined();
  });

  it('should identify flaky tests with multiple failures', () => {
    const analyzer = new FlakyTestAnalyzer();

    const failure1: TestFailure = {
      testName: 'test example',
      testFile: 'example.test.ts',
      errorMessage: 'Timeout error',
      workflowRunId: 1,
      commitSha: 'abc123',
      timestamp: new Date().toISOString(),
      branch: 'main',
    };

    const failure2: TestFailure = {
      ...failure1,
      workflowRunId: 2,
      commitSha: 'def456',
    };

    analyzer.addFailure(failure1);
    analyzer.addFailure(failure2);

    const results = analyzer.analyze(10);

    expect(results).toHaveLength(1);
    expect(results[0]?.testName).toBe('test example');
    expect(results[0]?.failureCount).toBe(2);
    expect(results[0]?.failureRate).toBe(0.2);
  });

  it('should not mark tests as flaky with only one failure', () => {
    const analyzer = new FlakyTestAnalyzer();

    const failure: TestFailure = {
      testName: 'test example',
      testFile: 'example.test.ts',
      errorMessage: 'Error',
      workflowRunId: 1,
      commitSha: 'abc123',
      timestamp: new Date().toISOString(),
      branch: 'main',
    };

    analyzer.addFailure(failure);

    const results = analyzer.analyze(10);

    expect(results).toHaveLength(0);
  });
});