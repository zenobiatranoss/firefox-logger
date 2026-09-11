export type LogLevel = "info" | "warning" | "error"

export interface LoggerEvent {
    id: string
    type: string
    source: string
    message: string
    timestamp: Date
    level: LogLevel
    data?: Record<string, unknown>
}
