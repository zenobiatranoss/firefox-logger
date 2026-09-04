import { describe, expect, test } from "vitest"
import { FirefoxEventMapper } from "../../src/firefox/event-mapper.js"

describe("FirefoxEventMapper", () => {
    test("maps navigation event", () => {
        const mapper = new FirefoxEventMapper()

        const event = {
            id: "nav-1",
            type: "navigation" as const,
            timestamp: new Date("2026-09-02T12:00:00.000Z"),
            tabId: 5,
            windowId: 1,
            url: "https://example.com"
        }

        const result = mapper.map(event)

        expect(result.id).toBe("nav-1")
        expect(result.type).toBe("firefox_navigation")
        expect(result.source).toBe("firefox")
        expect(result.message).toBe("Navigated to https://example.com")
        expect(result.timestamp).toEqual(event.timestamp)
        expect(result.level).toBe("info")
        expect(result.data?.tabId).toBe(5)
        expect(result.data?.windowId).toBe(1)
        expect(result.data?.url).toBe("https://example.com")
    })

    test("maps request event", () => {
        const mapper = new FirefoxEventMapper()

        const result = mapper.map({
            id: "request-1",
            type: "request",
            timestamp: new Date(),
            method: "POST",
            url: "https://example.com/api",
            requestId: "req-123"
        })

        expect(result.type).toBe("firefox_request")
        expect(result.message).toBe("POST https://example.com/api")
        expect(result.data?.requestId).toBe("req-123")
    })

    test("preserves custom event data", () => {
        const mapper = new FirefoxEventMapper()

        const result = mapper.map({
            id: "response-1",
            type: "response",
            timestamp: new Date(),
            url: "https://example.com",
            statusCode: 200,
            data: {
                contentType: "text/html",
                size: 1024
            }
        })

        expect(result.message).toBe("Received response from https://example.com")
        expect(result.data?.statusCode).toBe(200)
        expect(result.data?.contentType).toBe("text/html")
        expect(result.data?.size).toBe(1024)
    })
})
