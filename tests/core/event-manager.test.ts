import { describe, expect, test, vi } from "vitest"
import { EventManager } from "../../src/core/event-manager.js"
import { Logger } from "../../src/core/logger.js"
import { DatabaseManager } from "../../src/storage/database.js"
import { EventRepository } from "../../src/storage/repository.js"

describe("EventManager", () => {
    test("logs and stores an event", () => {
        const logger = new Logger()
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)
        const spy = vi.spyOn(logger, "write")

        const manager = new EventManager(logger, repository)

        const event = {
            id: "event-test",
            type: "browser_start",
            source: "firefox",
            message: "Firefox started",
            timestamp: new Date(),
            level: "info" as const
        }

        manager.emit(event)

        expect(spy).toHaveBeenCalledWith(event)
        expect(repository.findById("event-test")).toEqual(event)

        spy.mockRestore()
        database.close()
    })
})
