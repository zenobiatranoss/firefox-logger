export type FirefoxEventType =
    | "navigation"
    | "request"
    | "response"
    | "websocket"
    | "tab_created"
    | "tab_closed"
    | "tab_updated"
    | "download"
    | "browser"
    | "extension"
    | "request_headers"
    | "request_completed"
    | "request_error"
    | "browser_start"
    | "extension_installed"

export interface FirefoxHeader {
    name: string
    value?: string
}

export interface FirefoxEvent {
    id: string
    type: FirefoxEventType
    timestamp: Date

    tabId?: number
    windowId?: number

    url?: string
    method?: string
    statusCode?: number
    requestId?: string

    resourceType?: string
    initiator?: string

    requestHeaders?: FirefoxHeader[]
    responseHeaders?: FirefoxHeader[]

    data?: Record<string, unknown>
}
