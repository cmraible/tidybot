import { Octokit } from '@octokit/rest';
import { WorkflowRun } from '../types';

export class GitHubClient {
  private client: Octokit;

  constructor(
    private owner: string,
    private repo: string
  ) {
    const token = process.env.GITHUB_TOKEN;

    this.client = new Octokit({
      auth: token,
    });

    if (!token) {
      console.warn('⚠️  No GITHUB_TOKEN found in environment variables.');
      console.warn('   Some operations may be limited or fail.');
      console.warn('   Set GITHUB_TOKEN in your .env file for full access.');
    }
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

    // Map Octokit response to our WorkflowRun interface
    return response.data.workflow_runs.map(
      (run): WorkflowRun => ({
        id: run.id,
        name: run.name || '',
        head_branch: run.head_branch || '',
        head_sha: run.head_sha,
        status: run.status || '',
        conclusion: run.conclusion,
        created_at: run.created_at,
        updated_at: run.updated_at,
        html_url: run.html_url,
      })
    );
  }

  async getWorkflowRunLogs(runId: number): Promise<Buffer | null> {
    try {
      const response = await this.client.rest.actions.downloadWorkflowRunLogs({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });

      // The response data is already an ArrayBuffer
      if (response.data instanceof ArrayBuffer) {
        return Buffer.from(response.data);
      }

      // Handle case where data might be a different format
      return Buffer.from(response.data as ArrayBuffer);
    } catch (error) {
      const octokitError = error as { status?: number; message?: string };
      if (octokitError.status === 410) {
        // Logs have been deleted (common for old runs)
        console.warn(`Logs for run ${runId} are no longer available`);
      } else {
        console.error(`Failed to fetch logs for run ${runId}:`, error);
      }
      return null;
    }
  }
}
