import mysql from "mysql2/promise";
import type { PracticeProgress, StudyDashboard } from "@ace/shared";
import { config } from "./config.js";

let pool: mysql.Pool | undefined;

export async function initStudyStore() {
  pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    database: config.mysql.database,
    user: config.mysql.user,
    password: config.mysql.password,
    waitForConnections: true,
    connectionLimit: 5,
    namedPlaceholders: true
  });

  await getPool().execute(`
    CREATE TABLE IF NOT EXISTS ace_practice_progress (
      user_id VARCHAR(64) NOT NULL,
      suite_id VARCHAR(64) NOT NULL,
      question_index INT NOT NULL DEFAULT 0,
      answers_json JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, suite_id),
      INDEX idx_ace_practice_progress_user_id (user_id),
      CONSTRAINT fk_ace_practice_progress_user_id FOREIGN KEY (user_id) REFERENCES ace_users(id) ON DELETE CASCADE
    )
  `);

  await getPool().execute(`
    CREATE TABLE IF NOT EXISTS ace_daily_activity (
      user_id VARCHAR(64) NOT NULL,
      activity_date DATE NOT NULL,
      suite_id VARCHAR(64) NOT NULL,
      question_id VARCHAR(128) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, activity_date, question_id),
      INDEX idx_ace_daily_activity_user_date (user_id, activity_date),
      CONSTRAINT fk_ace_daily_activity_user_id FOREIGN KEY (user_id) REFERENCES ace_users(id) ON DELETE CASCADE
    )
  `);
}

export async function getDashboard(userId: string, suiteId?: string): Promise<StudyDashboard> {
  const [activityRows] = await getPool().execute<mysql.RowDataPacket[]>(
    `SELECT DATE_FORMAT(activity_date, '%Y-%m-%d') AS date, COUNT(*) AS count
     FROM ace_daily_activity
     WHERE user_id = ? AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 89 DAY)
     GROUP BY activity_date
     ORDER BY activity_date ASC`,
    [userId]
  );
  const heatmap = activityRows.map((row) => ({ date: row.date as string, count: Number(row.count) }));
  const today = new Date().toISOString().slice(0, 10);
  const progress = suiteId ? await getProgress(userId, suiteId) : undefined;
  return {
    heatmap,
    progress,
    todayCount: heatmap.find((item) => item.date === today)?.count || 0,
    activeDays: heatmap.filter((item) => item.count > 0).length,
    totalCount: heatmap.reduce((sum, item) => sum + item.count, 0)
  };
}

export async function getProgress(userId: string, suiteId: string): Promise<PracticeProgress | undefined> {
  const [rows] = await getPool().execute<mysql.RowDataPacket[]>(
    `SELECT suite_id, question_index, answers_json, updated_at
     FROM ace_practice_progress
     WHERE user_id = ? AND suite_id = ?`,
    [userId, suiteId]
  );
  const row = rows[0];
  if (!row) return undefined;
  return {
    suiteId: row.suite_id,
    questionIndex: Number(row.question_index),
    answers: typeof row.answers_json === "string" ? JSON.parse(row.answers_json) : row.answers_json,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function saveProgress(userId: string, input: { suiteId: string; questionIndex: number; answers: Record<string, unknown> }) {
  await getPool().execute(
    `INSERT INTO ace_practice_progress (user_id, suite_id, question_index, answers_json)
     VALUES (?, ?, ?, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE question_index = VALUES(question_index), answers_json = VALUES(answers_json), updated_at = CURRENT_TIMESTAMP`,
    [userId, input.suiteId, input.questionIndex, JSON.stringify(input.answers)]
  );
  return getProgress(userId, input.suiteId);
}

export async function clearProgress(userId: string, suiteId: string) {
  await getPool().execute("DELETE FROM ace_practice_progress WHERE user_id = ? AND suite_id = ?", [userId, suiteId]);
}

export async function recordActivity(userId: string, input: { suiteId: string; questionIds: string[] }) {
  const uniqueIds = Array.from(new Set(input.questionIds)).filter(Boolean);
  for (const questionId of uniqueIds) {
    await getPool().execute(
      `INSERT IGNORE INTO ace_daily_activity (user_id, activity_date, suite_id, question_id)
       VALUES (?, CURDATE(), ?, ?)`,
      [userId, input.suiteId, questionId]
    );
  }
}

function getPool() {
  if (!pool) throw new Error("Study store is not initialized");
  return pool;
}
