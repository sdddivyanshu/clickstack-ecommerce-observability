/**
 * agent-seed.js
 * Run by the agent-seeder Docker service via:
 *   mongosh mongodb://mongodb:27017/LibreChat /seed/agent-seed.js
 *
 * Reads agent-seed.json and upserts it into the LibreChat agents collection.
 * Idempotent — safe to run on every docker compose up.
 */

const fs   = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'agent-seed.json');
const agent    = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Inject timestamps at runtime
agent.createdAt = new Date();
agent.updatedAt = new Date();

const result = db.agents.updateOne(
  { name: agent.name },          // match by name
  { $setOnInsert: agent },       // only insert if not found
  { upsert: true }
);

if (result.upsertedCount > 0) {
  print('✅ ClickHouse Analytics Agent created.');
} else {
  print('ℹ️  Agent already exists — skipping.');
}