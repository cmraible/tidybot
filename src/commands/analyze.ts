import chalk from 'chalk';
import ora from 'ora';
import { GitHubClient } from '../lib/github-client';
import { FlakyTestAnalyzer } from '../lib/analyzer';
import { LogParser } from '../lib/log-parser';
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

    // Initialize analyzer and parser
    const analyzer = new FlakyTestAnalyzer();
    const parser = new LogParser();

    spinner.text = `Analyzing logs from ${failedRuns.length} failed runs...`;

    // Process each failed run
    let processedRuns = 0;
    let skippedRuns = 0;
    for (const failedRun of failedRuns) {
      processedRuns++;
      spinner.text = `Analyzing logs (${processedRuns}/${failedRuns.length})...`;

      // Fetch logs
      const logBuffer = await client.getWorkflowRunLogs(failedRun.id);
      if (!logBuffer) {
        skippedRuns++;
        continue;
      }

      // Extract logs from zip
      const logs = await parser.extractLogsFromZip(logBuffer);

      // Parse test failures from all log files
      for (const logContent of logs) {
        const failures = parser.parseTestFailures(
          logContent,
          failedRun.id,
          failedRun.head_sha,
          failedRun.created_at,
          failedRun.head_branch
        );

        // Add failures to analyzer
        for (const failure of failures) {
          analyzer.addFailure(failure);
        }
      }
    }

    if (skippedRuns > 0) {
      spinner.warn(
        `Analyzed ${processedRuns - skippedRuns} runs (${skippedRuns} skipped due to access restrictions)`
      );
      console.log(
        chalk.yellow(
          '\n⚠️  Note: Some workflow logs require authentication to access.\n' +
            '   For full access, set GITHUB_TOKEN environment variable or use repos you have admin access to.\n'
        )
      );
    } else {
      spinner.succeed(`Analyzed ${processedRuns} workflow runs`);
    }

    // Analyze and get flaky tests
    const flakyTests = analyzer.analyze(workflowRuns.length);

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
