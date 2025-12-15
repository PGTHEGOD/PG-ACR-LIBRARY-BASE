import mysql from "mysql2/promise"

interface MysqlConfig {
  host: string
  port: number
  user: string
  password?: string
  database: string
}

const config: MysqlConfig = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || "3306"),
  user: process.env.MYSQL_USER || "pgdev",
  password: process.env.MYSQL_PASSWORD || "parkggez",
  database: process.env.MYSQL_DATABASE || "library_system",
}

type MysqlPool = mysql.Pool

const globalForMysql = globalThis as typeof globalThis & { __libraryMysql?: MysqlPool }

function createPool(): MysqlPool {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4_unicode_ci",
    timezone: "Z",
  }) as MysqlPool
}

const pool: MysqlPool = globalForMysql.__libraryMysql ?? createPool()
if (process.env.NODE_ENV !== "production") {
  globalForMysql.__libraryMysql = pool
}

export function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL"
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0"
  }

  const str = String(value)
  return `'${str.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
}

function escapeIdentifier(identifier: string): string {
  return "`" + identifier.replace(/`/g, "``") + "`"
}

let schemaReady: Promise<void> | null = null

async function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady
  const database = escapeIdentifier(config.database)
  schemaReady = (async () => {
    const serverConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    })

    try {
      await serverConnection.query(
        `CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      )

      await serverConnection.query(
        `CREATE TABLE IF NOT EXISTS ${database}.library_books (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          assumption_code VARCHAR(16) NOT NULL,
          barcode VARCHAR(64) NOT NULL,
          category VARCHAR(64) NOT NULL,
          shelf_code VARCHAR(64) NOT NULL,
          author_code VARCHAR(64) NULL,
          edition VARCHAR(32) NULL,
          volume_number VARCHAR(32) NULL,
          language VARCHAR(64) NULL,
          print_number VARCHAR(32) NULL,
          purchase_date DATE NULL,
          source VARCHAR(128) NULL,
          title VARCHAR(256) NOT NULL,
          isbn VARCHAR(64) NULL,
          subject VARCHAR(128) NULL,
          author VARCHAR(128) NULL,
          publisher VARCHAR(128) NULL,
          publish_year INT NULL,
          pages INT NULL,
          price DECIMAL(10,2) NULL,
          cover_url TEXT NULL,
          status ENUM('available','borrowed') NOT NULL DEFAULT 'available',
          current_student_id VARCHAR(32) NULL,
          current_student_name VARCHAR(128) NULL,
          borrowed_at DATETIME NULL,
          due_date DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_assumption_code (assumption_code),
          KEY idx_book_barcode (barcode)
        ) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      )

      const addColumn = async (name: string, definition: string) => {
        await serverConnection.query(
          `ALTER TABLE ${database}.library_books ADD COLUMN ${definition}`
        ).catch(() => {})
      }

      await addColumn("volume_number", "volume_number VARCHAR(32) NULL")
      await addColumn("language", "language VARCHAR(64) NULL")
      await addColumn("print_number", "print_number VARCHAR(32) NULL")
      await addColumn("purchase_date", "purchase_date DATE NULL")
      await addColumn("source", "source VARCHAR(128) NULL")

      await serverConnection.query(
        `ALTER TABLE ${database}.library_books DROP INDEX uniq_book_barcode`
      ).catch(() => {})

      await serverConnection.query(
        `CREATE TABLE IF NOT EXISTS ${database}.library_loans (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          book_id INT UNSIGNED NOT NULL,
          student_id VARCHAR(32) NOT NULL,
          student_name VARCHAR(128) NOT NULL,
          assumption_code VARCHAR(16) NOT NULL,
          barcode VARCHAR(64) NOT NULL,
          title VARCHAR(256) NOT NULL,
          borrowed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          returned_at DATETIME NULL,
          status ENUM('borrowed','returned') NOT NULL DEFAULT 'borrowed',
          PRIMARY KEY (id),
          KEY idx_loans_student (student_id),
          KEY idx_loans_book (book_id),
          CONSTRAINT fk_loans_book FOREIGN KEY (book_id) REFERENCES ${database}.library_books(id) ON DELETE CASCADE
        ) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      )

      await serverConnection.query(
        `CREATE TABLE IF NOT EXISTS ${database}.library_scores (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          student_id VARCHAR(32) NOT NULL,
          change_value INT NOT NULL,
          note VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_scores_student (student_id)
        ) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      )

      await serverConnection.query(
        `CREATE TABLE IF NOT EXISTS ${database}.library_student_status (
          student_id VARCHAR(32) NOT NULL,
          borrow_lock TINYINT(1) NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (student_id)
        ) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      )

      await serverConnection.query(
        `CREATE TABLE IF NOT EXISTS ${database}.library_barcode_rewards (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          student_id VARCHAR(32) NOT NULL,
          scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_rewards_student_month (student_id, scanned_at)
        ) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      )

      await serverConnection.query(
        `CREATE TABLE IF NOT EXISTS ${database}.library_print_sessions (
          id CHAR(36) NOT NULL,
          created_at DATETIME NOT NULL,
          expires_at DATETIME NOT NULL,
          used TINYINT(1) NOT NULL DEFAULT 0,
          offer LONGTEXT NULL,
          answer LONGTEXT NULL,
          PRIMARY KEY (id),
          KEY idx_print_sessions_expires (expires_at),
          KEY idx_print_sessions_used (used)
        ) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      )

      await serverConnection.query(
        `CREATE TABLE IF NOT EXISTS ${database}.library_print_candidates (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          session_id CHAR(36) NOT NULL,
          role ENUM('host','guest') NOT NULL,
          candidate LONGTEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_print_candidates_session_role (session_id, role),
          CONSTRAINT fk_print_candidates_session FOREIGN KEY (session_id)
            REFERENCES ${database}.library_print_sessions(id)
            ON DELETE CASCADE
        ) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      )

      await serverConnection.query(
        `CREATE TABLE IF NOT EXISTS ${database}.library_print_files (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          session_id CHAR(36) NOT NULL,
          file_name VARCHAR(512) NOT NULL,
          file_type VARCHAR(128) NOT NULL,
          file_size BIGINT UNSIGNED NOT NULL,
          file_data LONGBLOB NOT NULL,
          uploaded_at DATETIME NOT NULL,
          downloaded_at DATETIME NULL,
          PRIMARY KEY (id),
          KEY idx_print_files_session_uploaded (session_id, uploaded_at),
          CONSTRAINT fk_print_files_session FOREIGN KEY (session_id)
            REFERENCES ${database}.library_print_sessions(id)
            ON DELETE CASCADE
        ) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`
      )

      await serverConnection.query(`ALTER TABLE ${database}.library_print_files DROP PRIMARY KEY`).catch(() => {})

      await serverConnection
        .query(
          `ALTER TABLE ${database}.library_print_files ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST`
        )
        .catch(() => {})

      await serverConnection
        .query(`ALTER TABLE ${database}.library_print_files ADD KEY idx_print_files_session (session_id)`)
        .catch(() => {})
    } finally {
      await serverConnection.end()
    }
  })()

  return schemaReady
}

function normalizeParams(params: unknown[] = []) {
  return params.map((value) => (value === undefined ? null : value))
}

function extractFirstColumn(row: mysql.RowDataPacket): unknown {
  const value = row.json ?? row.JSON ?? Object.values(row)[0]
  return value
}

export async function queryJson<T>(sql: string, defaultValue: T, params: unknown[] = []): Promise<T> {
  await ensureSchema()
  const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, normalizeParams(params))
  if (!rows.length) return defaultValue
  const raw = extractFirstColumn(rows[0])
  if (raw === null || raw === undefined || raw === "") {
    return defaultValue
  }
  if (typeof raw === "string") {
    return JSON.parse(raw) as T
  }
  if (Buffer.isBuffer(raw)) {
    return JSON.parse(raw.toString("utf8")) as T
  }
  return raw as T
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  await ensureSchema()
  await pool.query(sql, normalizeParams(params))
}

export async function queryRows<T = mysql.RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema()
  const [rows] = await pool.query<T[]>(sql, normalizeParams(params))
  return rows
}

export async function executeAndGet(sql: string, params: unknown[] = []) {
  await ensureSchema()
  const [result] = await pool.execute<mysql.ResultSetHeader>(sql, normalizeParams(params))
  return result
}

export function getMysqlConfig() {
  return { ...config }
}
