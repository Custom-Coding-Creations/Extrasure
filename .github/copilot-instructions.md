# MCP Project Guidance

This repository is linked to Custom Coding Creations Admin Dashboard via MCP.

## Connection Profile
- Project ID: f9740f19-0e8a-450e-9a03-1b22a106b5a4
- Project Name: Extra Sure Pest Control
- Admin API URL: https://www.customcodingcreations.com
- MCP server command: node /home/obsidian/Projects/custom-coding-creations/mcp-admin-server/dist/index.js

## Required Environment Contract
- ADMIN_API_KEY is required and must be available in VS Code process environment.
- ADMIN_API_URL defaults to https://www.customcodingcreations.com.
- ADMIN_PROJECT_ID defaults project scoping to f9740f19-0e8a-450e-9a03-1b22a106b5a4.
- ADMIN_MCP_AUTH_TOKEN is deprecated and must not be used.

## Operating Rules
1. Perform MCP planning reads before implementation decisions.
2. Keep dashboard entities in sync while implementing work.
3. Never expose secret values in prompts, docs, comments, or logs.
4. Do not modify .vscode/mcp.json command or auth wiring without explicit approval.
5. Use MCP validation reads before handoff.

## Validation Sequence
1. Run admin_validate_connection.
2. Run admin_get_project_llm_context with format=summary.
3. If auth fails, set ADMIN_API_KEY in VS Code process environment and reload window.
