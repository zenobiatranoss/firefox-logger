export type FilterOperator =
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "startsWith"
    | "endsWith"

export type FilterField =
    | "event.type"
    | "event.source"
    | "event.level"
    | "event.message"
    | "event.id"
    | "http.request.method"
    | "http.request.url"
    | "http.request.id"
    | "http.response.code"
    | "resource.type"
    | "tab.id"
    | "window.id"
    | "request.status"
    | "data"

export interface FilterCondition {
    field: FilterField
    operator: FilterOperator
    value: string | number | boolean
}

export interface FilterGroup {
    operator: "and" | "or"
    items: Array<FilterCondition | FilterGroup>
}

export type FilterExpression = FilterCondition | FilterGroup

const aliases: Record<string, FilterField> = {
    type: "event.type",
    source: "event.source",
    level: "event.level",
    message: "event.message",
    id: "event.id",
    url: "http.request.url",
    method: "http.request.method",
    requestId: "http.request.id",
    status: "http.response.code",
    statusCode: "http.response.code",
    resourceType: "resource.type",
    tabId: "tab.id",
    windowId: "window.id",
    requestStatus: "request.status",
    data: "data"
}

const fields = new Set<FilterField>([
    "event.type",
    "event.source",
    "event.level",
    "event.message",
    "event.id",
    "http.request.method",
    "http.request.url",
    "http.request.id",
    "http.response.code",
    "resource.type",
    "tab.id",
    "window.id",
    "request.status",
    "data"
])

function resolveField(value: string) {
    const field = aliases[value] ?? value

    if (!fields.has(field as FilterField)) {
        throw new Error(`Unknown filter field: ${value}`)
    }

    return field as FilterField
}

function parseValue(value: string): string | number | boolean {
    const trimmed = value.trim()

    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1)
    }

    if (trimmed === "true") return true
    if (trimmed === "false") return false

    const number = Number(trimmed)

    if (!Number.isNaN(number)) {
        return number
    }

    return trimmed
}

function splitTopLevel(input: string, operator: string) {
    const parts: string[] = []
    let current = ""
    let quote = ""
    let depth = 0

    for (let i = 0; i < input.length; i++) {
        const char = input[i]

        if (quote) {
            current += char

            if (char === quote && input[i - 1] !== "\\") {
                quote = ""
            }

            continue
        }

        if (char === '"' || char === "'") {
            quote = char
            current += char
            continue
        }

        if (char === "(") {
            depth++
            current += char
            continue
        }

        if (char === ")") {
            depth--
            current += char
            continue
        }

        if (
            depth === 0 &&
            input.slice(i, i + operator.length) === operator
        ) {
            parts.push(current.trim())
            current = ""
            i += operator.length - 1
            continue
        }

        current += char
    }

    if (current.trim()) {
        parts.push(current.trim())
    }

    return parts
}

function unwrap(value: string) {
    let result = value.trim()

    while (
        result.startsWith("(") &&
        result.endsWith(")") &&
        result.length > 1
    ) {
        result = result.slice(1, -1).trim()
    }

    return result
}

export function parseFilter(input: string): FilterExpression | null {
    const value = input.trim()

    if (!value) {
        return null
    }

    const unwrapped = unwrap(value)

    const orParts = splitTopLevel(unwrapped, "||")

    if (orParts.length > 1) {
        return {
            operator: "or",
            items: orParts.map(parseFilter).filter(Boolean) as Array<
                FilterCondition | FilterGroup
            >
        }
    }

    const andParts = splitTopLevel(unwrapped, "&&")

    if (andParts.length > 1) {
        return {
            operator: "and",
            items: andParts.map(parseFilter).filter(Boolean) as Array<
                FilterCondition | FilterGroup
            >
        }
    }

    const match = unwrapped.match(
        /^([a-zA-Z][a-zA-Z0-9._-]*)\s*(==|!=|>=|<=|>|<|contains|startsWith|endsWith)\s*(.+)$/
    )

    if (!match) {
        return {
            field: "data",
            operator: "contains",
            value: unwrapped
        }
    }

    const [, rawField, rawOperator, rawValue] = match

    const operatorMap: Record<string, FilterOperator> = {
        "==": "eq",
        "!=": "neq",
        ">": "gt",
        ">=": "gte",
        "<": "lt",
        "<=": "lte",
        contains: "contains",
        startsWith: "startsWith",
        endsWith: "endsWith"
    }

    return {
        field: resolveField(rawField),
        operator: operatorMap[rawOperator],
        value: parseValue(rawValue)
    }
}

export function isFilterGroup(
    expression: FilterExpression
): expression is FilterGroup {
    return "items" in expression
}
