import axios, { AxiosInstance } from 'axios';
import { WorkflowRun } from '../types';

export class GitHubClient {
  private client: AxiosInstance;

  constructor(
    private owner: string,
    private repo: string
  ) {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  async getWorkflowRuns(days: number): Promise<WorkflowRun[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const response = await this.client.get(`/repos/${this.owner}/${this.repo}/actions/runs`, {
      params: {
        created: `>=${since.toISOString()}`,
        per_page: 100,
      },
    });

    return response.data.workflow_runs;
  }

  async getWorkflowRunLogs(runId: number): Promise<string> {
    try {
      await this.client.get(`/repos/${this.owner}/${this.repo}/actions/runs/${runId}/logs`, {
        responseType: 'arraybuffer',
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      // GitHub returns logs as a zip file
      // TODO: Implement zip extraction and log parsing
      return '';
    } catch (error) {
      console.error(`Failed to fetch logs for run ${runId}:`, error);
      return '';
    }
  }
}
