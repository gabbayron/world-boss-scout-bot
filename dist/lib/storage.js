"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = load;
exports.save = save;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const localFile = path_1.default.join(process.cwd(), "data/state.json");
const hasDatabase = Boolean(process.env.DATABASE_URL);
const pool = hasDatabase
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    })
    : null;
function getDefaultState() {
    return {
        scouts: [],
    };
}
function ensureLocalFileExists() {
    if (!fs_1.default.existsSync(localFile)) {
        fs_1.default.mkdirSync(path_1.default.dirname(localFile), { recursive: true });
        fs_1.default.writeFileSync(localFile, JSON.stringify(getDefaultState(), null, 2));
    }
}
async function initDatabase() {
    if (!pool)
        return;
    await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_state (
      state_key TEXT PRIMARY KEY,
      state_value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
async function load() {
    if (!pool) {
        ensureLocalFileExists();
        return JSON.parse(fs_1.default.readFileSync(localFile, "utf8"));
    }
    await initDatabase();
    const result = await pool.query(`SELECT state_value
     FROM bot_state
     WHERE state_key = $1`, ["global"]);
    if (result.rowCount && result.rows[0]?.state_value) {
        return result.rows[0].state_value;
    }
    const initial = getDefaultState();
    await pool.query(`INSERT INTO bot_state (state_key, state_value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (state_key)
     DO UPDATE SET state_value = EXCLUDED.state_value, updated_at = NOW()`, ["global", JSON.stringify(initial)]);
    return initial;
}
async function save(state) {
    if (!pool) {
        ensureLocalFileExists();
        fs_1.default.writeFileSync(localFile, JSON.stringify(state, null, 2));
        return;
    }
    await initDatabase();
    await pool.query(`INSERT INTO bot_state (state_key, state_value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (state_key)
     DO UPDATE SET state_value = EXCLUDED.state_value, updated_at = NOW()`, ["global", JSON.stringify(state)]);
}
