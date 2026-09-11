import { describe, expect, test } from "vitest"
import { EventRepository } from "../../src/storage/repository.js"
import { DatabaseManager } from "../../src/storage/database.js"

describe("EventRepository", () => {
    test("saves and retrieves an event", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        const event = {
            id: "event-1",
            type: "page_visit",
            source: "firefox",
            message: "Opened example.com",
            timestamp: new Date("2026-09-02T10:00:00.000Z"),
            level: "info" as const,
            data: {
                url: "https://example.com",
                method: "GET"
            }
        }

        repository.save(event)

        const result = repository.findById("event-1")

        expect(result).toEqual(event)

        database.close()
    })

    test("returns events with pagination", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        repository.save({
            id: "event-1",
            type: "page_visit",
            source: "firefox",
            message: "Opened first page",
            timestamp: new Date("2026-09-02T10:00:00.000Z"),
            level: "info"
        })

        repository.save({
            id: "event-2",
            type: "request",
            source: "firefox",
            message: "Sent request",
            timestamp: new Date("2026-09-02T10:01:00.000Z"),
            level: "info"
        })

        repository.save({
            id: "event-3",
            type: "response",
            source: "firefox",
            message: "Received response",
            timestamp: new Date("2026-09-02T10:02:00.000Z"),
            level: "error"
        })

        const firstPage = repository.findAll(2, 0)
        const secondPage = repository.findAll(2, 2)

        expect(firstPage).toHaveLength(2)
        expect(firstPage[0].id).toBe("event-3")
        expect(firstPage[1].id).toBe("event-2")

        expect(secondPage).toHaveLength(1)
        expect(secondPage[0].id).toBe("event-1")

        database.close()
    })

    test("filters events by type", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        repository.save({
            id: "event-1",
            type: "page_visit",
            source: "firefox",
            message: "Opened page",
            timestamp: new Date("2026-09-02T10:00:00.000Z"),
            level: "info"
        })

        repository.save({
            id: "event-2",
            type: "request",
            source: "firefox",
            message: "Sent request",
            timestamp: new Date("2026-09-02T10:01:00.000Z"),
            level: "info"
        })

        const result = repository.search({
            type: "request"
        })

        expect(result.total).toBe(1)
        expect(result.events).toHaveLength(1)
        expect(result.events[0].id).toBe("event-2")

        database.close()
    })

    test("filters events by source and level", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        repository.save({
            id: "event-1",
            type: "request",
            source: "firefox",
            message: "Firefox request",
            timestamp: new Date("2026-09-02T10:00:00.000Z"),
            level: "info"
        })

        repository.save({
            id: "event-2",
            type: "request",
            source: "system",
            message: "System request",
            timestamp: new Date("2026-09-02T10:01:00.000Z"),
            level: "error"
        })

        repository.save({
            id: "event-3",
            type: "response",
            source: "firefox",
            message: "Firefox response",
            timestamp: new Date("2026-09-02T10:02:00.000Z"),
            level: "error"
        })

        const result = repository.search({
            source: "firefox",
            level: "error"
        })

        expect(result.total).toBe(1)
        expect(result.events).toHaveLength(1)
        expect(result.events[0].id).toBe("event-3")

        database.close()
    })

    test("filters events by time range", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        repository.save({
            id: "event-1",
            type: "request",
            source: "firefox",
            message: "Before range",
            timestamp: new Date("2026-09-02T09:00:00.000Z"),
            level: "info"
        })

        repository.save({
            id: "event-2",
            type: "request",
            source: "firefox",
            message: "Inside range",
            timestamp: new Date("2026-09-02T10:00:00.000Z"),
            level: "info"
        })

        repository.save({
            id: "event-3",
            type: "request",
            source: "firefox",
            message: "After range",
            timestamp: new Date("2026-09-02T11:00:00.000Z"),
            level: "info"
        })

        const result = repository.search({
            from: new Date("2026-09-02T09:30:00.000Z"),
            to: new Date("2026-09-02T10:30:00.000Z")
        })

        expect(result.total).toBe(1)
        expect(result.events).toHaveLength(1)
        expect(result.events[0].id).toBe("event-2")

        database.close()
    })

    test("combines filters with pagination", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        for (let index = 1; index <= 5; index++) {
            repository.save({
                id: `request-${index}`,
                type: "request",
                source: "firefox",
                message: `Request ${index}`,
                timestamp: new Date(`2026-09-02T10:0${index}:00.000Z`),
                level: "info"
            })
        }

        repository.save({
            id: "other-event",
            type: "page_visit",
            source: "firefox",
            message: "Other event",
            timestamp: new Date("2026-09-02T10:10:00.000Z"),
            level: "info"
        })

        const result = repository.search({
            type: "request",
            source: "firefox",
            limit: 2,
            offset: 2
        })

        expect(result.total).toBe(5)
        expect(result.events).toHaveLength(2)
        expect(result.events[0].id).toBe("request-3")
        expect(result.events[1].id).toBe("request-2")

        database.close()
    })
})