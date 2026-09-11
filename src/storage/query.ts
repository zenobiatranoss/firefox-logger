import { LogLevel, LoggerEvent } from "../core/types.js"

export interface EventQuery {
    type?: string
    source?: string
    level?: LogLevel
    method?: string
    status?: number
    resourceType?: string
    tabId?: number
    requestId?: string
    url?: string
    search?: string
    from?: Date
    to?: Date
    limit?: number
    offset?: number
}

export interface EventQueryResult {
    events: LoggerEvent[]
    total: number
}
