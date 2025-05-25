import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

describe('CLI Build', () => {
  const distPath = join(process.cwd(), 'dist');
  const cliPath = join(distPath, 'cli.js');

  beforeAll(() => {
    // Build the project before tests
    execSync('pnpm build', { stdio: 'inherit' });
  });

  it('should create dist/cli.js file', () => {
    expect(existsSync(cliPath)).toBe(true);
  });

  it('should have executable permissions', () => {
    // Check file stats to ensure it's executable
    const stats = statSync(cliPath);
    // On Unix systems, check if owner can execute
    if (process.platform !== 'win32') {
      expect(stats.mode & 0o100).toBeTruthy();
    }
  });

  it('should have only one shebang line', () => {
    const content = readFileSync(cliPath, 'utf-8');
    const shebangMatches = content.match(/^#!.*$/gm);
    expect(shebangMatches).not.toBeNull();
    expect(shebangMatches?.length).toBe(1);
    expect(shebangMatches?.[0]).toBe('#!/usr/bin/env node');
  });

  it('should show help when run with --help', () => {
    const result = execSync('node dist/cli.js --help', { encoding: 'utf-8' });
    expect(result).toContain('tidybot');
    expect(result).toContain('analyze');
    expect(result).toContain('A CLI tool to detect flaky tests');
  });

  it('should show version when run with --version', () => {
    const result = execSync('node dist/cli.js --version', { encoding: 'utf-8' });
    expect(result).toContain('0.1.0');
  });

  it('should error with invalid repository format', () => {
    try {
      execSync('node dist/cli.js analyze invalid-format', { encoding: 'utf-8' });
      expect.fail('Should have thrown an error');
    } catch (error) {
      const execError = error as { stderr?: string; stdout?: string };
      expect(execError.stderr || execError.stdout).toContain('Invalid repository format');
    }
  });

  afterAll(() => {
    // Clean up if needed
  });
});
