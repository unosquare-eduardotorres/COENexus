---
status: in-progress
priority: high
requested: 2026-04-05
completed: 
tags: [feature, agent, ai, mcp]
---

# Feature: Scout9 Agent

## Summary
An AI agent built on the Claude Agent SDK and MCP (Model Context Protocol) that autonomously scouts for candidate-to-opportunity matches. Uses tool-based orchestration to search, evaluate, and recommend matches with minimal human intervention.

## Motivation
The match engine currently requires manual triggering. Scout9 automates the discovery process — continuously or on-demand scanning for high-quality matches and surfacing them proactively to recruiters.

## Acceptance Criteria
- [ ] Agent executor with Claude Agent SDK integration
- [ ] MCP tool definitions for match engine access
- [ ] Tool definitions for database queries
- [ ] Autonomous match discovery workflow
- [ ] Results presentation with confidence scores
- [ ] Agent session tracking and history

## Technical Notes
- **SDK**: `@anthropic-ai/claude-agent-sdk` + `@modelcontextprotocol/sdk`
- **IPC Channels**: New `scout9:*` domain (part of agent registrars)
- **Services**: Agent executor + scheduler in main process
- **DB**: Agent sessions in `agents.db`

## Related
- [[Roadmap]]
- [[Match Engine]]
- [[Agent Architecture]]
- [[Stakeholder Brain Map]]

## Progress Log
| Date | Update |
|------|--------|
| 2026-04-05 | Feature requested |
| 2026-04-10 | Started MCP tool definitions |
| 2026-04-21 | Wiring agent executor to tool registry |
