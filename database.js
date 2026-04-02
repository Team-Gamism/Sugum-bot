// Node.js v22.5+ 내장 SQLite 사용 (외부 패키지 불필요)
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "fines.db");

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// ── 테이블 초기화 ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS fines (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT    NOT NULL DEFAULT '',
    user_id         TEXT    NOT NULL,
    username        TEXT    NOT NULL,
    word_used       TEXT    NOT NULL,
    message_content TEXT,
    amount          INTEGER NOT NULL DEFAULT 5000,
    paid            INTEGER NOT NULL DEFAULT 0,
    status          TEXT    NOT NULL DEFAULT 'auto',
    reporter_id     TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    guild_id  TEXT NOT NULL DEFAULT '',
    key       TEXT NOT NULL,
    value     TEXT NOT NULL,
    PRIMARY KEY (guild_id, key)
  );
`);

// 기존 DB 마이그레이션 (컬럼이 없을 때만 추가)
for (const col of [
  `ALTER TABLE fines ADD COLUMN reporter_id TEXT`,
  `ALTER TABLE fines ADD COLUMN status TEXT NOT NULL DEFAULT 'auto'`,
  `ALTER TABLE fines ADD COLUMN message_content TEXT`,
  `ALTER TABLE fines ADD COLUMN message_id TEXT`,
  `ALTER TABLE fines ADD COLUMN guild_id TEXT NOT NULL DEFAULT ''`,
]) {
  try { db.exec(col); } catch { /* 이미 존재하면 무시 */ }
}

try { db.exec(`CREATE INDEX IF NOT EXISTS idx_fines_guild ON fines(guild_id)`); } catch {}

// settings 테이블 guild_id 마이그레이션 (기존 DB에 guild_id 컬럼 없는 경우)
const settingsCols = db.prepare(`PRAGMA table_info(settings)`).all();
if (!settingsCols.some(c => c.name === 'guild_id')) {
  db.exec(`
    ALTER TABLE settings RENAME TO settings_old;
    CREATE TABLE settings (
      guild_id  TEXT NOT NULL DEFAULT '',
      key       TEXT NOT NULL,
      value     TEXT NOT NULL,
      PRIMARY KEY (guild_id, key)
    );
    INSERT INTO settings (guild_id, key, value) SELECT '', key, value FROM settings_old;
    DROP TABLE settings_old;
  `);
}

// 기본 설정값 삽입 (이미 있으면 무시) — 마이그레이션 이후 실행
db.prepare(`INSERT OR IGNORE INTO settings (guild_id, key, value) VALUES ('', 'fine_amount', '5000')`).run();
db.prepare(`INSERT OR IGNORE INTO settings (guild_id, key, value) VALUES ('', 'false_report_threshold', '3')`).run();

// ── 설정 ─────────────────────────────────────────────────────────────────────

function getSetting(guildId, key) {
  const row = db.prepare(`SELECT value FROM settings WHERE guild_id = ? AND key = ?`).get(guildId, key);
  if (row) return row.value;
  return db.prepare(`SELECT value FROM settings WHERE guild_id = '' AND key = ?`).get(key)?.value;
}

function setSetting(guildId, key, value) {
  db.prepare(`INSERT OR REPLACE INTO settings (guild_id, key, value) VALUES (?, ?, ?)`).run(guildId, key, String(value));
}

function getFineAmount(guildId) {
  return parseInt(getSetting(guildId, "fine_amount") || "5000", 10);
}

function getFalseReportThreshold(guildId) {
  return parseInt(getSetting(guildId, "false_report_threshold") || "3", 10);
}

// ── 벌금 CRUD ────────────────────────────────────────────────────────────────

/**
 * 벌금/신고 기록 추가
 * @param {{
 *   guildId: string, userId: string, username: string, wordUsed: string, amount: number,
 *   messageContent?: string, messageId?: string, reporterId?: string, status?: 'auto'|'pending'
 * }} param
 */
function addFine({ guildId, userId, username, wordUsed, amount, messageContent = null, messageId = null, reporterId = null, status = "auto" }) {
  return db
    .prepare(
      `INSERT INTO fines (guild_id, user_id, username, word_used, amount, message_content, message_id, reporter_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(guildId, userId, username, wordUsed, amount, messageContent, messageId, reporterId, status);
}

/**
 * Discord 메시지 ID로 이미 처리된 벌금/신고가 있는지 확인
 * @param {string} guildId
 * @param {string} messageId
 * @returns {object|undefined}
 */
function findFineByMessageId(guildId, messageId) {
  return db
    .prepare(`SELECT id, status FROM fines WHERE guild_id = ? AND message_id = ? AND status != 'rejected'`)
    .get(guildId, messageId);
}

/**
 * 전체 미납 벌금 목록 — auto/approved 만 집계
 */
function getAllUnpaidSummary(guildId) {
  return db
    .prepare(
      `SELECT user_id, username, COUNT(*) AS count, SUM(amount) AS total
       FROM fines
       WHERE guild_id = ? AND paid = 0 AND status IN ('auto', 'approved')
       GROUP BY user_id
       ORDER BY total DESC`
    )
    .all(guildId);
}

/**
 * 특정 유저의 미납 벌금 상세 내역 — auto/approved 만
 */
function getUserUnpaidFines(guildId, userId) {
  return db
    .prepare(
      `SELECT id, word_used, message_content, amount, reporter_id, status, created_at
       FROM fines
       WHERE guild_id = ? AND user_id = ? AND paid = 0 AND status IN ('auto', 'approved')
       ORDER BY created_at DESC`
    )
    .all(guildId, userId);
}

/**
 * 특정 유저의 전체 벌금 내역 (납부 포함, 모든 상태)
 */
function getUserAllFines(guildId, userId) {
  return db
    .prepare(
      `SELECT id, word_used, message_content, amount, paid, reporter_id, status, created_at
       FROM fines
       WHERE guild_id = ? AND user_id = ?
       ORDER BY created_at DESC`
    )
    .all(guildId, userId);
}

/**
 * 특정 유저의 미납 벌금 납부 처리 — auto/approved 만
 */
function markUserPaid(guildId, userId) {
  return db
    .prepare(`UPDATE fines SET paid = 1 WHERE guild_id = ? AND user_id = ? AND paid = 0 AND status IN ('auto', 'approved')`)
    .run(guildId, userId).changes;
}

// ── 신고 검토 ─────────────────────────────────────────────────────────────────

/**
 * 검토 대기 중인 신고 목록
 */
function getPendingReports(guildId) {
  return db
    .prepare(
      `SELECT id, user_id, username, message_content, reporter_id, amount, created_at
       FROM fines
       WHERE guild_id = ? AND status = 'pending'
       ORDER BY created_at ASC`
    )
    .all(guildId);
}

/**
 * 신고 승인 → 벌금 확정
 */
function approveReport(id) {
  return db.prepare(`UPDATE fines SET status = 'approved' WHERE id = ? AND status = 'pending'`).run(id).changes;
}

/**
 * 신고 기각 → 벌금 취소
 */
function rejectReport(id) {
  return db.prepare(`UPDATE fines SET status = 'rejected' WHERE id = ? AND status = 'pending'`).run(id).changes;
}

/**
 * 벌금 강제 취소 (관리자) — pending/auto/approved 모두 가능
 * @returns {number} 변경된 행 수 (0이면 이미 rejected이거나 없는 ID 또는 타 길드)
 */
function cancelFine(guildId, id) {
  return db.prepare(`UPDATE fines SET status = 'rejected' WHERE id = ? AND guild_id = ? AND status != 'rejected'`).run(id, guildId).changes;
}

/**
 * ID로 단일 벌금 기록 조회
 */
function getFineById(id) {
  return db.prepare(`SELECT * FROM fines WHERE id = ?`).get(id);
}

/**
 * 특정 신고자의 기각된 신고 수
 */
function getReporterRejectedCount(guildId, reporterId) {
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM fines WHERE guild_id = ? AND reporter_id = ? AND status = 'rejected'`)
    .get(guildId, reporterId);
  return row?.count ?? 0;
}

// ── 통계 ─────────────────────────────────────────────────────────────────────

function getStats(guildId) {
  return db
    .prepare(
      `SELECT
        COUNT(*)                                                        AS total_count,
        SUM(CASE WHEN status IN ('auto','approved') THEN amount END)    AS total_amount,
        SUM(CASE WHEN status IN ('auto','approved') AND paid=0 THEN amount END) AS unpaid_amount,
        SUM(CASE WHEN status IN ('auto','approved') AND paid=1 THEN amount END) AS paid_amount,
        COUNT(DISTINCT CASE WHEN status IN ('auto','approved') THEN user_id END) AS unique_users,
        SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END)           AS pending_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)           AS rejected_count,
        COUNT(CASE WHEN reporter_id IS NOT NULL THEN 1 END)            AS reported_count
       FROM fines
       WHERE guild_id = ?`
    )
    .get(guildId);
}

function getWordRanking(guildId) {
  return db
    .prepare(
      `SELECT word_used, COUNT(*) AS count
       FROM fines
       WHERE guild_id = ? AND status IN ('auto', 'approved')
       GROUP BY word_used
       ORDER BY count DESC
       LIMIT 10`
    )
    .all(guildId);
}

/**
 * 허위 신고 벌금 통계 (건수 + 합계)
 */
function getFalseReportFinesStats(guildId) {
  return db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
       FROM fines
       WHERE guild_id = ? AND word_used = '[허위 신고]' AND status IN ('auto', 'approved')`
    )
    .get(guildId);
}

/**
 * 전체 적발 유저 목록 (납부 여부 무관)
 */
function getAllCaughtUsers(guildId) {
  return db
    .prepare(
      `SELECT user_id, username, COUNT(*) AS count, SUM(amount) AS total,
              SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END) AS unpaid
       FROM fines
       WHERE guild_id = ? AND status IN ('auto', 'approved')
       GROUP BY user_id
       ORDER BY count DESC`
    )
    .all(guildId);
}

module.exports = {
  addFine,
  findFineByMessageId,
  getAllUnpaidSummary,
  getAllCaughtUsers,
  getUserUnpaidFines,
  getUserAllFines,
  markUserPaid,
  getPendingReports,
  approveReport,
  rejectReport,
  cancelFine,
  getFineById,
  getReporterRejectedCount,
  getStats,
  getWordRanking,
  getFalseReportFinesStats,
  getSetting,
  setSetting,
  getFineAmount,
  getFalseReportThreshold,
};
