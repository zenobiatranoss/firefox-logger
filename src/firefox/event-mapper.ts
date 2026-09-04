import { LoggerEvent } from "../core/types.js"
import { FirefoxEvent } from "./types.js"

export class FirefoxEventMapper {
    map(event: FirefoxEvent): LoggerEvent {
        return {
            id: event.id,
            type: `firefox_${event.type}`,
            source: "firefox",
            message: this.getMessage(event),
            timestamp: event.timestamp,
            level: "info",
            data: {
                tabId: event.tabId,
                windowId: event.windowId,
                url: event.url,
                method: event.method,
                statusCode: event.statusCode,
                requestId: event.requestId,
                ...event.data
            }
        }
    }

    private getMessage(event: FirefoxEvent): string {
        switch (event.type) {
            case "navigation":
                return `Navigated to ${event.url ?? "unknown"}`

            case "request":
                return `${event.method ?? "GET"} ${event.url ?? "unknown"}`

            case "response":
                return `Received response from ${event.url ?? "unknown"}`

            case "websocket":
                return `WebSocket activity on ${event.url ?? "unknown"}`

            case "tab_created":
                return "Firefox tab created"

            case "tab_closed":
                return "Firefox tab closed"

            case "tab_updated":
                return `Firefox tab updated ${event.url ?? ""}`.trim()

            case "download":
                return `Firefox download ${event.url ?? "unknown"}`

            case "extension":
                return "Firefox extension event"

            case "browser":
                return "Firefox browser event"

            case "request_headers":
                return `Request headers for ${event.url ?? "unknown"}`

            case "request_completed":
                return `Request completed ${event.url ?? "unknown"}`

            case "request_error":
                return `Request error ${event.url ?? "unknown"}`

            case "browser_start":
                return "Firefox browser started"

            case "extension_installed":
                return "Firefox extension installed"
                return "Firefox browser event"
        }
    }
}