export interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface TestFailure {
  testName: string;
  testFile: string;
  errorMessage: string;
  workflowRunId: number;
  commitSha: string;
  timestamp: string;
  branch: string;
}

export interface FlakyTest {
  testName: string;
  testFile: string;
  failureCount: number;
  totalRuns: number;
  failureRate: number;
  flakinessScore: number;
  failures: TestFailure[];
  commonErrorPatterns: string[];
}