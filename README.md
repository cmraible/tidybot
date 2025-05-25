# Tidybot

A CLI tool to detect flaky tests in GitHub repositories by analyzing CI failure patterns over time.

## Installation

```bash
npm install -g tidybot
# or
pnpm add -g tidybot
```

## Usage

```bash
tidybot analyze <owner>/<repo> [options]
```

### Options

- `-d, --days <number>` - Number of days to analyze (default: 30)
- `-o, --output <format>` - Output format: `table` or `json` (default: table)

### Examples

```bash
# Analyze the last 30 days of facebook/react
tidybot analyze facebook/react

# Analyze the last 7 days with JSON output
tidybot analyze facebook/react --days 7 --output json

# Analyze your own repository
tidybot analyze myusername/myrepo
```

## How It Works

Tidybot:

1. Fetches GitHub Actions workflow runs from the specified repository
2. Identifies failed runs
3. Downloads and parses test logs to extract test failures
4. Analyzes failure patterns to identify tests that fail inconsistently
5. Calculates a "flakiness score" based on failure frequency and recency
6. Reports the top flaky tests

## Requirements

- Node.js 18+
- GitHub Personal Access Token (required for accessing workflow logs)

## Setup

1. Create a `.env` file in the project root:

   ```bash
   cp .env.example .env
   ```

2. Add your GitHub token to the `.env` file:

   ```
   GITHUB_TOKEN=your_github_token_here
   ```

3. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes:
     - `repo` (for private repositories)
     - `public_repo` (for public repositories only)
   - Copy the token and add it to your `.env` file

## Limitations

- **Authentication Required**: GitHub requires authentication to download workflow logs, even for public repositories. Without authentication, the tool can only show which runs failed but cannot analyze the actual test failures.
- **Log Retention**: GitHub Actions logs are retained for 90 days by default
- **Rate Limiting**: Subject to GitHub API rate limits (60 requests/hour without auth, 5000 with auth)

## Development

```bash
# Clone the repository
git clone https://github.com/cmraible/tidybot.git
cd tidybot

# Install dependencies
pnpm install

# Run in development mode
pnpm dev analyze <repo>

# Run tests
pnpm test

# Build for production
pnpm build
```

## Future Improvements

- Add GitHub authentication support via environment variables
- Support for more test frameworks beyond Jest
- Integration with GitHub Apps for automated PR comments
- Caching of analysis results
- Historical trend analysis
- Suggested fixes for common flaky test patterns
