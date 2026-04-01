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
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// 기본 설정값 삽입 (이미 있으면 무시)
db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('fine_amount', '5000')`).run();

// 기존 DB 마이그레이션 (컬럼이 없을 때만 추가)
for (const col of [
  `ALTER TABLE fines ADD COLUMN reporter_id TEXT`,
  `ALTER TABLE fines ADD COLUMN status TEXT NOT NULL DEFAULT 'auto'`,
  `ALTER TABLE fines ADD COLUMN message_content TEXT`,
  `ALTER TABLE fines ADD COLUMN message_id TEXT`,
]) {
  try { db.exec(col); } catch { /* 이미 존재하면 무시 */ }
}

// ── 설정 ─────────────────────────────────────────────────────────────────────

function getSetting(key) {
  return db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key)?.value;
}

function setSetting(key, value) {
  db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, String(value));
}

function getFineAmount() {
  return parseInt(getSetting("fine_amount") || "5000", 10);
}

// ── 벌금 CRUD ────────────────────────────────────────────────────────────────

/**
 * 벌금/신고 기록 추가
 * @param {{
 *   userId: string, username: string, wordUsed: string, amount: number,
 *   messageContent?: string, messageId?: string, reporterId?: string, status?: 'auto'|'pending'
 * }} param
 */
function addFine({ userId, username, wordUsed, amount, messageContent = null, messageId = null, reporterId = null, status = "auto" }) {
  return db
    .prepare(
      `INSERT INTO fines (user_id, username, word_used, amount, message_content, message_id, reporter_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(userId, username, wordUsed, amount, messageContent, messageId, reporterId, status);
}

/**
 * Discord 메시지 ID로 이미 처리된 벌금/신고가 있는지 확인
 * @param {string} messageId
 * @returns {object|undefined}
 */
function findFineByMessageId(messageId) {
  return db
    .prepare(`SELECT id, status FROM fines WHERE message_id = ? AND status != 'rejected'`)
    .get(messageId);
}

/**
 * 전체 미납 벌금 목록 — auto/approved 만 집계
 */
function getAllUnpaidSummary() {
  return db
    .prepare(
      `SELECT user_id, username, COUNT(*) AS count, SUM(amount) AS total
       FROM fines
       WHERE paid = 0 AND status IN ('auto', 'approved')
       GROUP BY user_id
       ORDER BY total DESC`
    )
    .all();
}

/**
 * 특정 유저의 미납 벌금 상세 내역 — auto/approved 만
 */
function getUserUnpaidFines(userId) {
  return db
    .prepare(
      `SELECT id, word_used, message_content, amount, reporter_id, status, created_at
       FROM fines
       WHERE user_id = ? AND paid = 0 AND status IN ('auto', 'approved')
       ORDER BY created_at DESC`
    )
    .all(userId);
}

/**
 * 특정 유저의 전체 벌금 내역 (납부 포함, 모든 상태)
 */
function getUserAllFines(userId) {
  return db
    .prepare(
      `SELECT id, word_used, message_content, amount, paid, reporter_id, status, created_at
       FROM fines
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(userId);
}

/**
 * 특정 유저의 미납 벌금 납부 처리 — auto/approved 만
 */
function markUserPaid(userId) {
  return db
    .prepare(`UPDATE fines SET paid = 1 WHERE user_id = ? AND paid = 0 AND status IN ('auto', 'approved')`)
    .run(userId).changes;
}

// ── 신고 검토 ─────────────────────────────────────────────────────────────────

/**
 * 검토 대기 중인 신고 목록
 */
function getPendingReports() {
  return db
    .prepare(
      `SELECT id, user_id, username, message_content, reporter_id, amount, created_at
       FROM fines
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    )
    .all();
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
 * @returns {number} 변경된 행 수 (0이면 이미 rejected이거나 없는 ID)
 */
function cancelFine(id) {
  return db.prepare(`UPDATE fines SET status = 'rejected' WHERE id = ? AND status != 'rejected'`).run(id).changes;
}

/**
 * ID로 단일 벌금 기록 조회
 */
function getFineById(id) {
  return db.prepare(`SELECT * FROM fines WHERE id = ?`).get(id);
}

// ── 통계 ─────────────────────────────────────────────────────────────────────

function getStats() {
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
       FROM fines`
    )
    .get();
}

function getWordRanking() {
  return db
    .prepare(
      `SELECT word_used, COUNT(*) AS count
       FROM fines
       WHERE status IN ('auto', 'approved')
       GROUP BY word_used
       ORDER BY count DESC
       LIMIT 10`
    )
    .all();
}

/**
 * 전체 적발 유저 목록 (납부 여부 무관)
 */
function getAllCaughtUsers() {
  return db
    .prepare(
      `SELECT user_id, username, COUNT(*) AS count, SUM(amount) AS total,
              SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END) AS unpaid
       FROM fines
       WHERE status IN ('auto', 'approved')
       GROUP BY user_id
       ORDER BY count DESC`
    )
    .all();
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
  getStats,
  getWordRanking,
  getSetting,
  setSetting,
  getFineAmount,
};
