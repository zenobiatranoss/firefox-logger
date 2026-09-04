import { describe, expect, test } from "vitest"
import { NativeMessaging, NativeMessage } from "../../src/firefox/native-messaging.js"

describe("NativeMessaging", () => {
    const messaging = new NativeMessaging()

    const message: NativeMessage = {
        type: "event",
        event: {
            id: "event-1",
            type: "navigation",
            timestamp: "2026-09-02T12:00:00.000Z",
            tabId: 5,
            windowId: 1,
            url: "https://example.com"
        }
    }

    test("encodes and decodes a native message", () => {
        const encoded = messaging.encode(message)
        const decoded = messaging.decode(encoded)

        expect(decoded).toEqual(message)
    })

    test("writes the correct message length", () => {
        const encoded = messaging.encode(message)
        const body = encoded.subarray(4)

        expect(encoded.readUInt32LE(0)).toBe(body.length)
    })

    test("rejects an incomplete header", () => {
        expect(() => messaging.decode(Buffer.from([1, 2, 3])))
            .toThrow("Native message is incomplete")
    })

    test("rejects an incomplete message body", () => {
        const encoded = messaging.encode(message)
        const incomplete = encoded.subarray(0, encoded.length - 2)

        expect(() => messaging.decode(incomplete))
            .toThrow("Native message body is incomplete")
    })

    test("rejects invalid JSON", () => {
        const body = Buffer.from("invalid-json", "utf8")
        const header = Buffer.alloc(4)

        header.writeUInt32LE(body.length, 0)

        const encoded = Buffer.concat([header, body])

        expect(() => messaging.decode(encoded))
            .toThrow("Native message contains invalid JSON")
    })

    test("rejects an invalid message structure", () => {
        const invalid = Buffer.from(
            JSON.stringify({
                type: "invalid",
                event: {}
            }),
            "utf8"
        )

        const header = Buffer.alloc(4)
        header.writeUInt32LE(invalid.length, 0)

        const encoded = Buffer.concat([header, invalid])

        expect(() => messaging.decode(encoded))
            .toThrow("Native message has an invalid structure")
    })

    test("converts a native event timestamp to a Date", () => {
        const event = messaging.toFirefoxEvent(message)

        expect(event.timestamp).toBeInstanceOf(Date)
        expect(event.timestamp.toISOString())
            .toBe("2026-09-02T12:00:00.000Z")
    })

    test("preserves Firefox event data", () => {
        const nativeMessage: NativeMessage = {
            type: "event",
            event: {
                id: "event-2",
                type: "request",
                timestamp: "2026-09-02T12:00:00.000Z",
                method: "POST",
                url: "https://example.com/api",
                requestId: "request-123",
                data: {
                    contentType: "application/json",
                    size: 1024
                }
            }
        }

        const event = messaging.toFirefoxEvent(nativeMessage)

        expect(event.type).toBe("request")
        expect(event.method).toBe("POST")
        expect(event.url).toBe("https://example.com/api")
        expect(event.requestId).toBe("request-123")
        expect(event.data).toEqual({
            contentType: "application/json",
            size: 1024
        })
    })

    test("rejects an invalid Firefox event type", () => {
        const invalid = {
            type: "event",
            event: {
                id: "event-3",
                type: "unknown",
                timestamp: "2026-09-02T12:00:00.000Z"
            }
        }

        expect(() => messaging.encode(invalid as NativeMessage))
            .toThrow("Native message has an invalid structure")
    })
})
