import {
    FilterCondition,
    FilterExpression,
    FilterGroup,
    isFilterGroup
} from "../core/filter.js"

export interface CompiledFilter {
    sql: string
    params: Array<string | number | boolean>
}

function columnFor(field: FilterCondition["field"]) {
    const columns: Record<FilterCondition["field"], string> = {
        "event.type": "e.type",
        "event.source": "e.source",
        "event.level": "e.level",
        "event.message": "e.message",
        "event.id": "e.id",
        "http.request.method": "COALESCE(json_extract(e.data, '$.method'), json_extract(e.data, '$.data.method'))",
        "http.request.url": "COALESCE(json_extract(e.data, '$.url'), json_extract(e.data, '$.data.url'))",
        "http.request.id": "COALESCE(json_extract(e.data, '$.requestId'), json_extract(e.data, '$.data.requestId'))",
        "http.response.code": "COALESCE(json_extract(e.data, '$.statusCode'), json_extract(e.data, '$.data.statusCode'))",
        "resource.type": "COALESCE(json_extract(e.data, '$.resourceType'), json_extract(e.data, '$.data.resourceType'))",
        "tab.id": "COALESCE(json_extract(e.data, '$.tabId'), json_extract(e.data, '$.data.tabId'))",
        "window.id": "COALESCE(json_extract(e.data, '$.windowId'), json_extract(e.data, '$.data.windowId'))",
        "request.status": "COALESCE(json_extract(e.data, '$.status'), json_extract(e.data, '$.data.status'))",
        data: "json(e.data)"
    }

    return columns[field]
}

function compileCondition(condition: FilterCondition): CompiledFilter {
    const column = columnFor(condition.field)

    if (condition.field === "data" && condition.operator === "contains") {
        return {
            sql: `(
                LOWER(e.type) LIKE LOWER(?) OR
                LOWER(e.source) LIKE LOWER(?) OR
                LOWER(e.message) LIKE LOWER(?) OR
                LOWER(COALESCE(json_extract(e.data, '$.url'), '')) LIKE LOWER(?) OR
                LOWER(CAST(e.data AS TEXT)) LIKE LOWER(?)
            )`,
            params: [
                `%${String(condition.value)}%`,
                `%${String(condition.value)}%`,
                `%${String(condition.value)}%`,
                `%${String(condition.value)}%`,
                `%${String(condition.value)}%`
            ]
        }
    }

    switch (condition.operator) {
        case "eq":
            return {
                sql: `${column} = ?`,
                params: [condition.value]
            }

        case "neq":
            return {
                sql: `${column} != ?`,
                params: [condition.value]
            }

        case "gt":
            return {
                sql: `${column} > ?`,
                params: [condition.value]
            }

        case "gte":
            return {
                sql: `${column} >= ?`,
                params: [condition.value]
            }

        case "lt":
            return {
                sql: `${column} < ?`,
                params: [condition.value]
            }

        case "lte":
            return {
                sql: `${column} <= ?`,
                params: [condition.value]
            }

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

function compileExpression(expression: FilterExpression): CompiledFilter {
    if (!isFilterGroup(expression)) {
        return compileCondition(expression)
    }

    const group = expression as FilterGroup
    const compiled = group.items.map(compileExpression)

    return {
        sql: `(${compiled.map(item => item.sql).join(
            group.operator === "and" ? " AND " : " OR "
        )})`,
        params: compiled.flatMap(item => item.params)
    }
}

export function compileFilter(
    expression: FilterExpression | null
): CompiledFilter {
    if (!expression) {
        return {
            sql: "1 = 1",
            params: []
        }
    }

    return compileExpression(expression)
}
