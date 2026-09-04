import { describe, expect, test, vi } from "vitest"
import { EventManager } from "../../src/core/event-manager.js"
import { Logger } from "../../src/core/logger.js"
import { DatabaseManager } from "../../src/storage/database.js"
import { EventRepository } from "../../src/storage/repository.js"
import { FirefoxCapture } from "../../src/firefox/capture.js"
import { FirefoxConnector } from "../../src/firefox/connector.js"

describe("FirefoxConnector", () => {
    test("starts disconnected", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)
        const events = new EventManager(new Logger(), repository)
        const capture = new FirefoxCapture(events)
        const connector = new FirefoxConnector(capture)

        expect(connector.isConnected()).toBe(false)

        database.close()
    })

    test("connects and disconnects", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)
        const events = new EventManager(new Logger(), repository)
        const capture = new FirefoxCapture(events)
        const connector = new FirefoxConnector(capture)

        connector.connect()
        expect(connector.isConnected()).toBe(true)

        connector.disconnect()
        expect(connector.isConnected()).toBe(false)

        database.close()
    })

    test("rejects events while disconnected", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)
        const events = new EventManager(new Logger(), repository)
        const capture = new FirefoxCapture(events)
        const connector = new FirefoxConnector(capture)

        expect(() => connector.receive({
            id: "event-1",
            type: "navigation",
            timestamp: new Date(),
            url: "https://example.com"
        })).toThrow("Firefox connector is not connected")

        database.close()
    })

    test("passes received events to capture", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)
        const events = new EventManager(new Logger(), repository)
        const capture = new FirefoxCapture(events)
        const spy = vi.spyOn(capture, "handle")
        const connector = new FirefoxConnector(capture)

        connector.connect()

        const event = {
            id: "event-2",
            type: "request" as const,
            timestamp: new Date(),
            method: "GET",
            url: "https://example.com"
        }

        connector.receive(event)

        expect(spy).toHaveBeenCalledWith(event)

        spy.mockRestore()
        database.close()
    })

    test("stores received Firefox events", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)
        const events = new EventManager(new Logger(), repository)
        const capture = new FirefoxCapture(events)
        const connector = new FirefoxConnector(capture)

        connector.connect()

        connector.receive({
            id: "event-3",
            type: "response",
            timestamp: new Date("2026-09-02T12:00:00.000Z"),
            statusCode: 200,
            url: "https://example.com"
        })

        const stored = repository.findById("event-3")

        expect(stored).toBeDefined()
        expect(stored?.type).toBe("firefox_response")
        expect(stored?.source).toBe("firefox")
        expect(stored?.data?.statusCode).toBe(200)

        database.close()
    })
})
