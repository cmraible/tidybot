Project: Flaky Test Detection Tool
Build a Node.js CLI tool that analyzes GitHub repositories for flaky tests by examining CI failure patterns over time.
Core Goal: Identify tests that fail inconsistently (flaky tests) by analyzing GitHub Actions workflow runs and parsing failure logs.
Target Repository: facebook/react (for initial testing and validation)
MVP Requirements:

Data Collection: Fetch the last 30 days of GitHub Actions workflow runs from facebook/react
Failure Analysis: Parse job logs to extract test failures using common patterns (Jest/testing library failures)
Pattern Detection: Identify tests that fail multiple times across different runs/commits
Reporting: Generate a ranked list of flaky tests with failure frequency and impact scores

Technical Approach:

Use GitHub REST API (no auth needed for public repos)
Parse workflow run logs for test failure patterns
Track failure frequency per test over time
Calculate "flakiness score" based on failure rate and recency

Key Data Points to Track:

Test name and failure location
Failure frequency over time period
Which commits/PRs triggered failures
Common failure patterns/error messages

Output: JSON report showing top 10 flakiest tests with supporting data (failure count, dates, commits, etc.)
Start Simple: Focus on detection accuracy first. Don't worry about fix generation yet - just prove we can reliably identify actually flaky tests from CI data.
The goal is to validate this concept works on a real codebase before building it into a full GitHub bot.
