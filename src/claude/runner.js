// src/claude/runner.js
// Runner do Claude Agent SDK — executa sessões de Claude Code headless

import { query } from '@anthropic-ai/claude-agent-sdk';

export async function runClaude({ prompt, allowedTools = [], maxTurns = 10, permissionMode = 'bypassPermissions' }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no servidor');

  let result = '';
  let sessionId = null;

  for await (const msg of query({
    prompt,
    options: {
      allowedTools,
      maxTurns,
      permissionMode,
    },
  })) {
    if (msg.type === 'system' && msg.session_id) {
      sessionId = msg.session_id;
    }
    if (msg.type === 'result') {
      result = msg.result ?? '';
    }
  }

  return { result, sessionId };
}
