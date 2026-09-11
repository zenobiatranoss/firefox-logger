import {
    FilterCondition,
    FilterExpression,
    FilterGroup,
    isFilterGroup
} from "../core/filter.js"

export interface CompiledTransactionFilter {
    sql: string
    params: Array<string | number | boolean>
}

function columnFor(field: FilterCondition["field"]) {
    const columns: Record<FilterCondition["field"], string> = {
        "event.type": "NULL",
        "event.source": "NULL",
        "event.level": "NULL",
        "event.message": "NULL",
        "event.id": "id",
        "http.request.method": "method",
        "http.request.url": "url",
        "http.request.id": "request_id",
        "http.response.code": "status_code",
        "resource.type": "resource_type",
        "tab.id": "tab_id",
        "window.id": "window_id",
        "request.status": "status",
        data: "COALESCE(url, method, resource_type, initiator, error, request_id)"
    }

    return columns[field]
}

function compileCondition(condition: FilterCondition): CompiledTransactionFilter {
    const column = columnFor(condition.field)

    if (condition.field === "data" && condition.operator === "contains") {
        const value = `%${String(condition.value)}%`

        return {
            sql: `(
                request_id LIKE ? OR
                url LIKE ? OR
                method LIKE ? OR
                resource_type LIKE ? OR
                initiator LIKE ? OR
                error LIKE ?
            )`,
            params: [value, value, value, value, value, value]
        }
    }

    switch (condition.operator) {
        case "eq":
            return { sql: `${column} = ?`, params: [condition.value] }
        case "neq":
            return { sql: `${column} != ?`, params: [condition.value] }
        case "gt":
            return { sql: `${column} > ?`, params: [condition.value] }
        case "gte":
            return { sql: `${column} >= ?`, params: [condition.value] }
        case "lt":
            return { sql: `${column} < ?`, params: [condition.value] }
        case "lte":
            return { sql: `${column} <= ?`, params: [condition.value] }
        case "contains":
            return {
                sql: `LOWER(CAST(${column} AS TEXT)) LIKE LOWER(?)`,
                params: [`%${String(condition.value)}%`]
            }
        case "startsWith":
            return {
                sql: `LOWER(CAST(${column} AS TEXT)) LIKE LOWER(?)`,
                params: [`${String(condition.value)}%`]
            }
        case "endsWith":
            return {
                sql: `LOWER(CAST(${column} AS TEXT)) LIKE LOWER(?)`,
                params: [`%${String(condition.value)}`]
            }
    }
}

function compileExpression(
    expression: FilterExpression
): CompiledTransactionFilter {
    if (!isFilterGroup(expression)) {
        return compileCondition(expression)
    }

    const compiled = expression.items.map(compileExpression)

    return {
        sql: `(${compiled.map(item => item.sql).join(
            expression.operator === "and" ? " AND " : " OR "
        )})`,
        params: compiled.flatMap(item => item.params)
    }
}

export function compileTransactionFilter(
    expression: FilterExpression | null
): CompiledTransactionFilter {
    if (!expression) {
        return {
            sql: "1 = 1",
            params: []
        }
    }

    return compileExpression(expression)
}
