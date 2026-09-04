export type LoggingMode = "simple" | "detailed"

export interface LoggingConfig {
    mode: LoggingMode
    captureRequestHeaders: boolean
    captureResponseHeaders: boolean
    captureRequestBodies: boolean
    captureResponseBodies: boolean
    captureWebSocketEvents: boolean
    captureTabEvents: boolean
    captureNavigationEvents: boolean
    captureDownloadEvents: boolean
}

export const defaultLoggingConfig: LoggingConfig = {
    mode: "detailed",
    captureRequestHeaders: true,
    captureResponseHeaders: true,
    captureRequestBodies: true,
    captureResponseBodies: false,
    captureWebSocketEvents: true,
    captureTabEvents: true,
    captureNavigationEvents: true,
    captureDownloadEvents: true
}
