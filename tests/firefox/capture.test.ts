import { describe, expect, test, vi } from "vitest"
import { EventManager } from "../../src/core/event-manager.js"
import { Logger } from "../../src/core/logger.js"
import { DatabaseManager } from "../../src/storage/database.js"
import { EventRepository } from "../../src/storage/repository.js"
import { FirefoxCapture } from "../../src/firefox/capture.js"

describe("FirefoxCapture", () => {
    test("captures, logs, and stores a Firefox event", () => {
        const logger = new Logger()
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)
        const events = new EventManager(logger, repository)
        const capture = new FirefoxCapture(events)
        const spy = vi.spyOn(logger, "write")

        const firefoxEvent = {
            id: "capture-1",
            type: "navigation" as const,
            timestamp: new Date("2026-09-02T12:00:00.000Z"),
            tabId: 7,
            windowId: 2,
            url: "https://example.com"
        }

        capture.handle(firefoxEvent)

        const stored = repository.findById("capture-1")

        expect(spy).toHaveBeenCalledTimes(1)
        expect(stored).toBeDefined()
        expect(stored?.id).toBe("capture-1")
        expect(stored?.type).toBe("firefox_navigation")
        expect(stored?.source).toBe("firefox")
        expect(stored?.message).toBe("Navigated to https://example.com")
        expect(stored?.data?.tabId).toBe(7)
        expect(stored?.data?.windowId).toBe(2)
        expect(stored?.data?.url).toBe("https://example.com")

        spy.mockRestore()
        database.close()
    })
})
