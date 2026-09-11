import { describe, expect, test } from "vitest"
import { EventManager } from "../core/event-manager.js"
import { EventStream } from "../core/event-stream.js"
import { Logger } from "../core/logger.js"
import { EventRepository } from "../storage/repository.js"
import { DatabaseManager } from "../storage/database.js"
import { FirefoxCapture } from "./capture.js"

describe("FirefoxCapture", () => {
    test("publishes transaction updates through the live stream", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)
        const events = new EventManager(new Logger(), repository)
        const stream = new EventStream()
        const capture = new FirefoxCapture(events, stream)

        const received: unknown[] = []

        stream.subscribe(event => {
            received.push(event)
        })

        const timestamp = new Date("2026-01-01T12:00:00Z")

        capture.handle({
            id: "event-1",
            type: "request",
            timestamp,
            requestId: "request-1",
            tabId: 1,
            url: "https://example.com/api",
            method: "GET"
        })

        capture.handle({
            id: "event-2",
            type: "response",
            timestamp: new Date("2026-01-01T12:00:00.500Z"),
            requestId: "request-1",
            statusCode: 200
        })

        capture.handle({
            id: "event-3",
            type: "request_completed",
            timestamp: new Date("2026-01-01T12:00:01Z"),
            requestId: "request-1"
        })

        expect(received).toHaveLength(3)

        expect(received[0]).toMatchObject({
            requestId: "request-1",
            status: "pending"
        })

        expect(received[1]).toMatchObject({
            requestId: "request-1",
            status: "pending",
            statusCode: 200
        })

        expect(received[2]).toMatchObject({
            requestId: "request-1",
            status: "completed",
            statusCode: 200
        })

        expect(received[0]).not.toBe(received[1])
        expect(received[1]).not.toBe(received[2])
        expect(received[0]).not.toBe(received[2])

        database.close()
    })
})
