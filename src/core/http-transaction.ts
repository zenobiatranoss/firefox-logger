import { FirefoxHeader } from "../firefox/types.js"

export type HttpTransactionStatus = "pending" | "completed" | "failed"

export interface HttpTransaction {
    id: string
    requestId: string
    status: HttpTransactionStatus
    tabId?: number
    windowId?: number
    url?: string
    method?: string
    resourceType?: string
    initiator?: string
    startedAt?: Date
    completedAt?: Date
    statusCode?: number
    requestHeaders?: FirefoxHeader[]
    responseHeaders?: FirefoxHeader[]
    requestData?: Record<string, unknown>
    responseData?: Record<string, unknown>
    error?: string
}
