// ⚠️ TEMPORARY — design fixtures to preview every pipeline card / status variant.
// Toggle USE_PIPELINE_MOCKS to false (or delete this file + its imports) before merge.

import type { PipelineStatus, PipelineStep, RunStatus } from '../types'

export const USE_PIPELINE_MOCKS = false

const now = Math.floor(Date.now() / 1000)

function step(name: string, status: RunStatus, message?: string): PipelineStep {
  return { name, status, started_at: now - 300, completed_at: now - 60, message }
}

const ghSteps: PipelineStep[] = [
  step('Build release / Set up job', 'success'),
  step('Build release / Build', 'success'),
  step('Test — ubuntu-latest / Test', 'success'),
  step('Clippy / Clippy', 'success'),
  step('Format / Check formatting', 'success'),
]

const failingSteps: PipelineStep[] = [
  step('Build release / Set up job', 'success'),
  step('Test — ubuntu-latest / Test', 'failure', 'assertion failed: 3 tests failed'),
  step('Clippy / Clippy', 'cancelled'),
]

const runningSteps: PipelineStep[] = [
  step('Build release / Set up job', 'success'),
  step('Build release / Build', 'running'),
  step('Test — ubuntu-latest / Test', 'pending'),
]

export const MOCK_PIPELINES: PipelineStatus[] = [
  // success — GitHub, full steps
  {
    config: { name: 'orbit CI', provider: 'github_actions', repo: 'tensiply/orbit', branch: 'main' },
    fetched_at: now,
    latest_run: {
      id: '1', run_name: 'CI', status: 'success', branch: 'main', commit_sha: 'a1b2c3d4',
      commit_message: 'feat(pipelines): add desktop pipeline status viewer with drawer',
      triggered_by: 'eloircorona', started_at: now - 600, completed_at: now - 120,
      url: 'https://github.com/tensiply/orbit/actions/runs/1', steps: ghSteps,
    },
  },
  // failure — GitHub, with a failed + cancelled step
  {
    config: { name: 'orbit Canary', provider: 'github_actions', repo: 'tensiply/orbit', branch: 'main' },
    fetched_at: now,
    latest_run: {
      id: '2', run_name: 'Canary', status: 'failure', branch: 'main', commit_sha: 'ff00ee11',
      commit_message: 'chore: bump deps\n\nsecond line should be hidden',
      triggered_by: 'eloircorona', started_at: now - 800, completed_at: now - 200,
      url: 'https://github.com/tensiply/orbit/actions/runs/2', steps: failingSteps,
    },
  },
  // running — GitHub, in-progress steps
  {
    config: { name: 'orbit-desktop CI', provider: 'github_actions', repo: 'tensiply/orbit-desktop', branch: 'main' },
    fetched_at: now,
    latest_run: {
      id: '3', run_name: 'CI', status: 'running', branch: 'feat/pipeline-status-drawer', commit_sha: 'deadbeef',
      commit_message: 'fix(pipelines): show spinning yellow indicator for running pipelines',
      triggered_by: 'eloircorona', started_at: now - 90,
      url: 'https://github.com/tensiply/orbit-desktop/actions/runs/3', steps: runningSteps,
    },
  },
  // pending — queued, no steps yet
  {
    config: { name: 'nightly-e2e', provider: 'github_actions', repo: 'tensiply/orbit', branch: 'main' },
    fetched_at: now,
    latest_run: {
      id: '4', run_name: 'E2E', status: 'pending', branch: 'main', commit_sha: '12345678',
      commit_message: 'test: add e2e smoke suite', triggered_by: 'scheduler',
      started_at: now - 5, url: 'https://github.com/tensiply/orbit/actions/runs/4', steps: [],
    },
  },
  // cancelled — Jenkins
  {
    config: { name: 'release-pipeline', provider: 'jenkins', url: 'https://jenkins.example.com', job: 'orbit/release' },
    fetched_at: now,
    latest_run: {
      id: '87', run_name: 'release #87', status: 'cancelled', branch: 'release/1.2',
      commit_message: 'release: cut 1.2.0-rc1', triggered_by: 'ci-bot',
      started_at: now - 400, completed_at: now - 350,
      url: 'https://jenkins.example.com/job/orbit/release/87', steps: [],
    },
  },
  // unknown — run present but unmapped status, no steps
  {
    config: { name: 'legacy-build', provider: 'jenkins', url: 'https://jenkins.example.com', job: 'legacy' },
    fetched_at: now,
    latest_run: {
      id: '5', run_name: 'legacy #5', status: 'unknown',
      started_at: now - 1000, steps: [],
    },
  },
  // error — provider/API/auth failure, no run
  {
    config: { name: 'private-repo CI', provider: 'github_actions', repo: 'tensiply/private', branch: 'main' },
    fetched_at: now,
    error: 'HTTP 404 Not Found — check repo path or token scope',
  },
  // no runs found — config valid, no run and no error
  {
    config: { name: 'brand-new-repo', provider: 'github_actions', repo: 'tensiply/brand-new', branch: 'main' },
    fetched_at: now,
  },
]
