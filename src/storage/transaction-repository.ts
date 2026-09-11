import { HttpTransaction } from "../core/http-transaction.js"
import { DatabaseManager } from "./database.js"
import { parseFilter } from "../core/filter.js"
import { compileTransactionFilter } from "./transaction-filter-sql.js"

export interface TransactionQuery {
    method?: string
    status?: string
    statusCode?: number
    resourceType?: string
    tabId?: number
    requestId?: string
    url?: string
    search?: string
    limit?: number
    offset?: number
    sort?: string
    order?: "asc" | "desc"
    from?: Date
    to?: Date
}

export interface TransactionQueryResult {
    transactions: HttpTransaction[]
    total: number
}

export class TransactionRepository {
    constructor(private database: DatabaseManager) {
        this.database.connection.exec(`
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
            );

            CREATE INDEX IF NOT EXISTS idx_transactions_started_at
            ON transactions(started_at);

            CREATE INDEX IF NOT EXISTS idx_transactions_status
            ON transactions(status);

            CREATE INDEX IF NOT EXISTS idx_transactions_method
            ON transactions(method);

            CREATE INDEX IF NOT EXISTS idx_transactions_status_code
            ON transactions(status_code);

            CREATE INDEX IF NOT EXISTS idx_transactions_url
            ON transactions(url);

            CREATE INDEX IF NOT EXISTS idx_transactions_tab_id
            ON transactions(tab_id);
        `)
    }

    save(transaction: HttpTransaction) {
        this.database.connection.prepare(`
            INSERT INTO transactions (
                request_id,
                id,
                status,
                tab_id,
                window_id,
                url,
                method,
                resource_type,
                initiator,
                started_at,
                completed_at,
                status_code,
                request_headers,
                response_headers,
                request_data,
                response_data,
                error
            )
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

    findByRequestId(requestId: string) {
        const row = this.database.connection.prepare(`
            SELECT *
            FROM transactions
            WHERE request_id = ?
        `).get(requestId) as TransactionRow | undefined

        return row ? this.fromRow(row) : undefined
    }

    search(query: TransactionQuery = {}): TransactionQueryResult {
        const conditions: string[] = []
        const values: unknown[] = []

        if (query.method) {
            conditions.push("method = ?")
            values.push(query.method)
        }

        if (query.status) {
            conditions.push("status = ?")
            values.push(query.status)
        }

        if (query.statusCode !== undefined) {
            conditions.push("status_code = ?")
            values.push(query.statusCode)
        }

        if (query.resourceType) {
            conditions.push("resource_type = ?")
            values.push(query.resourceType)
        }

        if (query.tabId !== undefined) {
            conditions.push("tab_id = ?")
            values.push(query.tabId)
        }

        if (query.requestId) {
            conditions.push("request_id = ?")
            values.push(query.requestId)
        }

        if (query.url) {
            conditions.push("url LIKE ?")
            values.push(`%${query.url}%`)
        }

        if (query.from) {
            conditions.push("started_at >= ?")
            values.push(query.from.toISOString())
        }

        if (query.to) {
            conditions.push("started_at <= ?")
            values.push(query.to.toISOString())
        }

        if (query.search) {
            try {
                const expression = parseFilter(query.search)
                const filter = compileTransactionFilter(expression)
                conditions.push(filter.sql)
                values.push(...filter.params)
            } catch {
                const value = `%${query.search}%`
                conditions.push(`
                    (
                        request_id LIKE ?
                        OR url LIKE ?
                        OR method LIKE ?
                        OR resource_type LIKE ?
                        OR initiator LIKE ?
                        OR error LIKE ?
                    )
                `)
                values.push(
                    value,
                    value,
                    value,
                    value,
                    value,
                    value
                )
            }
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : ""

        const total = this.database.connection.prepare(`
            SELECT COUNT(*) AS count
            FROM transactions
            ${where}
        `).get(...values) as { count: number }

        const limit = Math.min(
            Math.max(query.limit ?? 100, 1),
            1000
        )

        const offset = Math.max(query.offset ?? 0, 0)

        const sortColumns: Record<string, string> = {
            startedAt: "started_at",
            completedAt: "completed_at",
            status: "status",
            statusCode: "status_code",
            method: "method",
            url: "url",
            resourceType: "resource_type",
            tabId: "tab_id",
            windowId: "window_id"
        }

        const sort = sortColumns[query.sort ?? "startedAt"] ?? "started_at"
        const order = query.order === "asc" ? "ASC" : "DESC"

        const rows = this.database.connection.prepare(`
            SELECT *
            FROM transactions
            ${where}
            ORDER BY (${sort} IS NULL) ASC, ${sort} ${order}
            LIMIT ? OFFSET ?
        `).all(
            ...values,
            limit,
            offset
        ) as TransactionRow[]

        return {
            total: total.count,
            transactions: rows.map(row => this.fromRow(row))
        }
    }

    findAll(limit = 100, offset = 0) {
        return this.search({
            limit,
            offset
        }).transactions
    }

    stats() {
        const total = this.database.connection.prepare(`
            SELECT COUNT(*) AS count
            FROM transactions
        `).get() as { count: number }

        const statuses = this.database.connection.prepare(`
            SELECT status, COUNT(*) AS count
            FROM transactions
            GROUP BY status
        `).all() as Array<{
            status: string
            count: number
        }>

        const statusCodes = this.database.connection.prepare(`
            SELECT status_code, COUNT(*) AS count
            FROM transactions
            WHERE status_code IS NOT NULL
            GROUP BY status_code
            ORDER BY count DESC
        `).all() as Array<{
            status_code: number
            count: number
        }>

        return {
            total: total.count,
            statuses,
            statusCodes
        }
    }

    private fromRow(row: TransactionRow): HttpTransaction {
        return {
            id: row.id,
            requestId: row.request_id,
            status: row.status as HttpTransaction["status"],
            tabId: row.tab_id ?? undefined,
            windowId: row.window_id ?? undefined,
            url: row.url ?? undefined,
            method: row.method ?? undefined,
            resourceType: row.resource_type ?? undefined,
            initiator: row.initiator ?? undefined,
            startedAt: row.started_at
                ? new Date(row.started_at)
                : undefined,
            completedAt: row.completed_at
                ? new Date(row.completed_at)
                : undefined,
            statusCode: row.status_code ?? undefined,
            requestHeaders: row.request_headers
                ? JSON.parse(row.request_headers)
                : undefined,
            responseHeaders: row.response_headers
                ? JSON.parse(row.response_headers)
                : undefined,
            requestData: row.request_data
                ? JSON.parse(row.request_data)
                : undefined,
            responseData: row.response_data
                ? JSON.parse(row.response_data)
                : undefined,
            error: row.error ?? undefined
        }
    }
}

interface TransactionRow {
    request_id: string
    id: string
    status: string
    tab_id: number | null
    window_id: number | null
    url: string | null
    method: string | null
    resource_type: string | null
    initiator: string | null
    started_at: string | null
    completed_at: string | null
    status_code: number | null
    request_headers: string | null
    response_headers: string | null
    request_data: string | null
    response_data: string | null
    error: string | null
}
