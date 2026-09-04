import { FirefoxEvent, FirefoxEventType } from "./types.js"

export interface NativeEvent {
    id: string
    type: FirefoxEventType
    timestamp: string
    tabId?: number
    windowId?: number
    url?: string
    method?: string
    statusCode?: number
    requestId?: string
    data?: Record<string, unknown>
}

export interface NativeMessage {
    type: "event"
    event: NativeEvent
}

export class NativeMessaging {
    encode(message: NativeMessage): Buffer {
        if (!this.isValidMessage(message)) {
            throw new Error("Native message has an invalid structure")
        }

        const body = Buffer.from(JSON.stringify(message), "utf8")
        const header = Buffer.alloc(4)

        header.writeUInt32LE(body.length, 0)

        return Buffer.concat([header, body])
    }

    decode(buffer: Buffer): NativeMessage {
        if (buffer.length < 4) {
            throw new Error("Native message is incomplete")
        }

        const length = buffer.readUInt32LE(0)

        if (buffer.length < length + 4) {
            throw new Error("Native message body is incomplete")
        }

        const body = buffer.subarray(4, length + 4).toString("utf8")

        let message: unknown

        try {
            message = JSON.parse(body)
        } catch {
            throw new Error("Native message contains invalid JSON")
        }

        if (!this.isValidMessage(message)) {
            throw new Error("Native message has an invalid structure")
        }

        return message
    }

    toFirefoxEvent(message: NativeMessage): FirefoxEvent {
        const timestamp = new Date(message.event.timestamp)

        if (Number.isNaN(timestamp.getTime())) {
            throw new Error("Native message contains an invalid timestamp")
        }

        return {
            ...message.event,
            timestamp
        }
    }

    private isValidMessage(value: unknown): value is NativeMessage {
        if (!value || typeof value !== "object") {
            return false
        }

        const message = value as Record<string, unknown>

        if (message.type !== "event") {
            return false
        }

        if (!message.event || typeof message.event !== "object") {
            return false
        }

        const event = message.event as Record<string, unknown>

        if (
            typeof event.id !== "string" ||
            typeof event.type !== "string" ||
            typeof event.timestamp !== "string"
        ) {
            return false
        }

        if (!this.isFirefoxEventType(event.type)) {
            return false
        }

        if (Number.isNaN(Date.parse(event.timestamp))) {
            return false
        }

        if (
            event.tabId !== undefined &&
            typeof event.tabId !== "number"
        ) {
            return false
        }

        if (
            event.windowId !== undefined &&
            typeof event.windowId !== "number"
        ) {
            return false
        }

        if (
            event.url !== undefined &&
            typeof event.url !== "string"
        ) {
            return false
        }

        if (
            event.method !== undefined &&
            typeof event.method !== "string"
        ) {
            return false
        }

        if (
            event.statusCode !== undefined &&
            typeof event.statusCode !== "number"
        ) {
            return false
        }

        if (
            event.requestId !== undefined &&
            typeof event.requestId !== "string"
        ) {
            return false
        }

        if (
            event.data !== undefined &&
            (!event.data ||
                typeof event.data !== "object" ||
                Array.isArray(event.data))
        ) {
            return false
        }

        return true
    }

    private isFirefoxEventType(value: string): value is FirefoxEventType {
        return (
            value === "navigation" ||
            value === "request" ||
            value === "response" ||
            value === "websocket" ||
            value === "tab_created" ||
            value === "tab_closed" ||
            value === "tab_updated" ||
            value === "download" ||
            value === "extension" ||
            value === "browser" ||
            value === "request_headers" ||
            value === "request_completed" ||
            value === "request_error" ||
            value === "browser_start" ||
            value === "extension_installed"
        )
    }
}