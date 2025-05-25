import { Octokit } from '@octokit/rest';
import { WorkflowRun } from '../types';

export class GitHubClient {
  private client: Octokit;

  constructor(
    private owner: string,
    private repo: string
  ) {
    this.client = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  async getWorkflowRuns(days: number): Promise<WorkflowRun[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const response = await this.client.rest.actions.listWorkflowRunsForRepo({
      owner: this.owner,
      repo: this.repo,
      created: `>=${since.toISOString()}`,
      per_page: 100,
    });

    return response.data.workflow_runs;
  }

  async getWorkflowRunLogs(runId: number): Promise<Buffer | null> {
    try {
      const response = await this.client.rest.actions.downloadWorkflowRunLogs({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });

      return Buffer.from(response.data as ArrayBuffer);
    } catch (error: any) {
      if (error.status === 410) {
        // Logs have been deleted (common for old runs)
        console.warn(`Logs for run ${runId} are no longer available`);
      } else {
        console.error(`Failed to fetch logs for run ${runId}:`, error);
      }
      return null;
    }
  }
}
