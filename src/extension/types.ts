export type ExtensionLoggingMode = "simple" | "detailed"

export interface ExtensionConfig {
    mode: ExtensionLoggingMode
}

export interface ExtensionEvent {
    id: string
    type: string
    timestamp: string
    tabId?: number
    windowId?: number
    url?: string
    method?: string
    statusCode?: number
    requestId?: string
    data?: Record<string, unknown>
}
