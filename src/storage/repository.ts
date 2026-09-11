import { LoggerEvent } from "../core/types.js"
import { DatabaseManager } from "./database.js"
import { EventQuery, EventQueryResult } from "./query.js"
import { HttpTransaction } from "../core/http-transaction.js"
import { parseFilter } from "../core/filter.js"
import { compileFilter } from "./filter-sql.js"

export class EventRepository {
    constructor(private database: DatabaseManager) {
        this.database.connection.exec(`
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                source TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                level TEXT NOT NULL,
                data TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_events_timestamp
            ON events(timestamp);

            CREATE INDEX IF NOT EXISTS idx_events_type
            ON events(type);

            CREATE INDEX IF NOT EXISTS idx_events_source
            ON events(source);

            CREATE INDEX IF NOT EXISTS idx_events_level
            ON events(level);
        `)
    }

    save(event: LoggerEvent) {
        this.database.connection.prepare(`
            INSERT OR REPLACE INTO events
            (id, type, source, message, timestamp, level, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            event.id,
            event.type,
            event.source,
            event.message,
            event.timestamp.toISOString(),
            event.level,
            event.data ? JSON.stringify(event.data) : null
        )
    }

    search(query: EventQuery = {}): EventQueryResult {
        const conditions: string[] = []
        const values: Array<string | number | boolean> = []

        if (query.type) {
            conditions.push("type = ?")
            values.push(query.type)
        }

        if (query.source) {
            conditions.push("source = ?")
            values.push(query.source)
        }

        if (query.level) {
            conditions.push("level = ?")
            values.push(query.level)
        }

        if (query.method) {
            conditions.push("json_extract(data, '$.method') = ?")
            values.push(query.method)
        }

        if (query.status !== undefined) {
            conditions.push("json_extract(data, '$.statusCode') = ?")
            values.push(query.status)
        }

        if (query.resourceType) {
            conditions.push("json_extract(data, '$.resourceType') = ?")
            values.push(query.resourceType)
        }

        if (query.tabId !== undefined) {
            conditions.push("json_extract(data, '$.tabId') = ?")
            values.push(query.tabId)
        }

        if (query.requestId) {
            conditions.push("json_extract(data, '$.requestId') = ?")
            values.push(query.requestId)
        }

        if (query.url) {
            conditions.push("json_extract(data, '$.url') LIKE ?")
            values.push(`%${query.url}%`)
        }

        if (query.search) {
            const expression = parseFilter(query.search)
            const filter = compileFilter(expression)

            conditions.push(filter.sql)
            values.push(...filter.params)
        }

        if (query.from) {
            conditions.push("timestamp >= ?")
            values.push(query.from.toISOString())
        }

        if (query.to) {
            conditions.push("timestamp <= ?")
            values.push(query.to.toISOString())
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : ""

        const total = this.database.connection.prepare(`
            SELECT COUNT(*) AS count
            FROM events e
            ${where}
        `).get(...values) as { count: number }

        const limit = Math.min(Math.max(query.limit ?? 100, 1), 1000)
        const offset = Math.max(query.offset ?? 0, 0)

        const rows = this.database.connection.prepare(`
            SELECT e.id, e.type, e.source, e.message, e.timestamp, e.level, e.data
            FROM events e
            ${where}
            ORDER BY e.timestamp DESC
            LIMIT ? OFFSET ?
        `).all(...values, limit, offset) as Array<{
            id: string
            type: string
            source: string
            message: string
            timestamp: string
            level: "info" | "warning" | "error"
            data: string | null
        }>

        return {
            total: total.count,
            events: rows.map(row => ({
                id: row.id,
                type: row.type,
                source: row.source,
                message: row.message,
                timestamp: new Date(row.timestamp),
                level: row.level,
                data: row.data ? JSON.parse(row.data) : undefined
            }))
        }
    }


    saveTransaction(transaction: HttpTransaction) {
        this.database.connection.prepare(`
            CREATE TABLE IF NOT EXISTS transactions (
                request_id TEXT PRIMARY KEY,
                id TEXT NOT NULL,
                status TEXT NOT NULL,
                tab_id INTEGER,
                window_id INTEGER,
                url TEXT,
                method TEXT,
                resource_type TEXT,
                initiator TEXT,
                started_at TEXT,
                completed_at TEXT,
                status_code INTEGER,
                request_headers TEXT,
                response_headers TEXT,
                request_data TEXT,
                response_data TEXT,
                error TEXT
            )
        `).run()

        this.database.connection.prepare(`
            INSERT INTO transactions
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(request_id) DO UPDATE SET
                id = excluded.id,
                status = excluded.status,
                tab_id = COALESCE(excluded.tab_id, transactions.tab_id),
                window_id = COALESCE(excluded.window_id, transactions.window_id),
                url = COALESCE(excluded.url, transactions.url),
                method = COALESCE(excluded.method, transactions.method),
                resource_type = COALESCE(excluded.resource_type, transactions.resource_type),
                initiator = COALESCE(excluded.initiator, transactions.initiator),
                started_at = COALESCE(excluded.started_at, transactions.started_at),
                completed_at = COALESCE(excluded.completed_at, transactions.completed_at),
                status_code = COALESCE(excluded.status_code, transactions.status_code),
                request_headers = COALESCE(excluded.request_headers, transactions.request_headers),
                response_headers = COALESCE(excluded.response_headers, transactions.response_headers),
                request_data = COALESCE(excluded.request_data, transactions.request_data),
                response_data = COALESCE(excluded.response_data, transactions.response_data),
                error = COALESCE(excluded.error, transactions.error)
        `).run(
            transaction.requestId,
            transaction.id,
            transaction.status,
            transaction.tabId ?? null,
            transaction.windowId ?? null,
            transaction.url ?? null,
            transaction.method ?? null,
            transaction.resourceType ?? null,
            transaction.initiator ?? null,
            transaction.startedAt?.toISOString() ?? null,
            transaction.completedAt?.toISOString() ?? null,
            transaction.statusCode ?? null,
            transaction.requestHeaders
                ? JSON.stringify(transaction.requestHeaders)
                : null,
            transaction.responseHeaders
                ? JSON.stringify(transaction.responseHeaders)
                : null,
            transaction.requestData
                ? JSON.stringify(transaction.requestData)
                : null,
            transaction.responseData
                ? JSON.stringify(transaction.responseData)
                : null,
            transaction.error ?? null
        )
    }

    findAll(limit = 100, offset = 0) {
        return this.search({
            limit,
            offset
        }).events
    }

    findById(id: string) {
        const row = this.database.connection.prepare(`
            SELECT id, type, source, message, timestamp, level, data
            FROM events
            WHERE id = ?
        `).get(id) as {
            id: string
            type: string
            source: string
            message: string
            timestamp: string
            level: "info" | "warning" | "error"
            data: string | null
        } | undefined

        if (!row) {
            return undefined
        }

        return {
            id: row.id,
            type: row.type,
            source: row.source,
            message: row.message,
            timestamp: new Date(row.timestamp),
            level: row.level,
            data: row.data ? JSON.parse(row.data) : undefined
        } satisfies LoggerEvent
    }

    stats() {
        const total = this.database.connection.prepare(`
            SELECT COUNT(*) AS count FROM events
        `).get() as { count: number }

        const levels = this.database.connection.prepare(`
            SELECT level, COUNT(*) AS count
            FROM events
            GROUP BY level
        `).all() as Array<{
            level: string
            count: number
        }>

        const types = this.database.connection.prepare(`
            SELECT type, COUNT(*) AS count
            FROM events
            GROUP BY type
            ORDER BY count DESC
        `).all() as Array<{
            type: string
            count: number
        }>

        return {
            total: total.count,
            levels,
            types
        }
    }
}
