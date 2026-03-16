import fs from "fs";
import path from "path";
import pg from "pg";
import { State } from "../types";

const { Pool } = pg;

const localFile = path.join(process.cwd(), "data/state.json");
const hasDatabase = Boolean(process.env.DATABASE_URL);

const pool = hasDatabase
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

function getDefaultState(): State {
  return {
    scouts: [],
    layers: [],
  };
}

function normalizeState(raw: Partial<State> | null | undefined): State {
  return {
    boardChannelId: raw?.boardChannelId,
    boardMessageId: raw?.boardMessageId,
    scouts: Array.isArray(raw?.scouts) ? raw!.scouts! : [],
    layers: Array.isArray(raw?.layers) ? raw!.layers! : [],
  };
}

function ensureLocalFileExists() {
  if (!fs.existsSync(localFile)) {
    fs.mkdirSync(path.dirname(localFile), { recursive: true });
    fs.writeFileSync(localFile, JSON.stringify(getDefaultState(), null, 2));
  }
}

async function initDatabase() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_state (
      state_key TEXT PRIMARY KEY,
      state_value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function load(): Promise<State> {
  if (!pool) {
    ensureLocalFileExists();
    const raw = JSON.parse(fs.readFileSync(localFile, "utf8"));
    return normalizeState(raw);
  }

  await initDatabase();

  const result = await pool.query(
    `SELECT state_value
     FROM bot_state
     WHERE state_key = $1`,
    ["global"],
  );

  if (result.rowCount && result.rows[0]?.state_value) {
    return normalizeState(result.rows[0].state_value as Partial<State>);
  }

  const initial = getDefaultState();

  await pool.query(
    `INSERT INTO bot_state (state_key, state_value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (state_key)
     DO UPDATE SET state_value = EXCLUDED.state_value, updated_at = NOW()`,
    ["global", JSON.stringify(initial)],
  );

  return initial;
}

export async function save(state: State): Promise<void> {
  if (!pool) {
    ensureLocalFileExists();
    fs.writeFileSync(localFile, JSON.stringify(state, null, 2));
    return;
  }

  await initDatabase();

  await pool.query(
    `INSERT INTO bot_state (state_key, state_value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (state_key)
     DO UPDATE SET state_value = EXCLUDED.state_value, updated_at = NOW()`,
    ["global", JSON.stringify(state)],
  );
}
