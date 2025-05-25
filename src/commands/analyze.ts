import chalk from 'chalk';
import ora from 'ora';
import { GitHubClient } from '../lib/github-client';
import { FlakyTestAnalyzer } from '../lib/analyzer';
import { formatTable } from '../utils/table-formatter';
import { formatJSON } from '../utils/json-formatter';

interface AnalyzeOptions {
  days: string;
  output: string;
}

export async function analyzeCommand(repository: string, options: AnalyzeOptions) {
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    console.error(chalk.red('Invalid repository format. Use: owner/repo'));
    process.exit(1);
  }

  const days = parseInt(options.days, 10);
  if (isNaN(days) || days <= 0) {
    console.error(chalk.red('Invalid days value. Must be a positive number.'));
    process.exit(1);
  }

  const spinner = ora('Fetching workflow runs...').start();

  try {
    // Initialize GitHub client
    const client = new GitHubClient(owner, repo);

    // Fetch workflow runs
    const workflowRuns = await client.getWorkflowRuns(days);
    spinner.text = `Found ${workflowRuns.length} workflow runs`;

    // Show run status breakdown
    const statusCounts = workflowRuns.reduce(
      (acc, run) => {
        acc[run.conclusion || 'in_progress'] = (acc[run.conclusion || 'in_progress'] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Filter failed runs
    const failedRuns = workflowRuns.filter((run) => run.conclusion === 'failure');
    spinner.succeed(
      `Found ${workflowRuns.length} workflow runs (${Object.entries(statusCounts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')})`
    );

    if (failedRuns.length === 0) {
      console.log(chalk.green('✅ No failed runs to analyze!'));
      return;
    }

    // Initialize analyzer
    const analyzer = new FlakyTestAnalyzer();

    // For now, we'll simulate test failures since log parsing isn't implemented yet
    // TODO: Implement actual log parsing
    spinner.warn('Log parsing not yet implemented. Using simulated data for demo.');

    // Simulate some test failures for demonstration
    const simulatedTests = [
      'ReactDOMServer-test.js › ReactDOMServer › should handle context correctly',
      'ReactSuspense-test.internal.js › ReactSuspense › should suspend when data is not ready',
      'ReactHooks-test.internal.js › ReactHooks › useState › should handle state updates',
      'ReactConcurrent-test.js › Concurrent Mode › should render without tearing',
    ];

    // Add simulated failures
    for (const failedRun of failedRuns) {
      for (let i = 0; i < 2; i++) {
        const testName = simulatedTests[Math.floor(Math.random() * simulatedTests.length)];
        analyzer.addFailure({
          testName: testName || 'Unknown test',
          testFile: testName?.split(' › ')[0] || 'unknown.test.js',
          errorMessage: 'Timeout: Test exceeded 5000ms',
          workflowRunId: failedRun.id,
          commitSha: failedRun.head_sha,
          timestamp: failedRun.created_at,
          branch: failedRun.head_branch,
        });
      }
    }

    // Analyze and get flaky tests
    const flakyTests = analyzer.analyze(workflowRuns.length);

    spinner.stop();

    // Output results
    if (flakyTests.length === 0) {
      console.log(chalk.green('✅ No flaky tests detected!'));
      return;
    }

    console.log(chalk.yellow(`\n🚨 Found ${flakyTests.length} flaky tests:\n`));

    // Format output based on user preference
    if (options.output === 'json') {
      console.log(formatJSON(flakyTests));
    } else {
      console.log(formatTable(flakyTests));
    }
  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
