import { describe, expect, it } from "vitest"
import { DatabaseManager } from "../../src/storage/database.js"
import { EventRepository } from "../../src/storage/repository.js"

describe("EventRepository Filter Engine", () => {
    it("returns all events without a filter", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        repository.save({
            id: "1",
            type: "request",
            source: "firefox",
            message: "GET youtube",
            timestamp: new Date("2026-09-03T10:00:00Z"),
            level: "info",
            data: {
                method: "GET",
                url: "https://youtube.com"
            }
        })

        repository.save({
            id: "2",
            type: "request",
            source: "firefox",
            message: "POST api",
            timestamp: new Date("2026-09-03T10:01:00Z"),
            level: "error",
            data: {
                method: "POST",
                url: "https://example.com/api",
                statusCode: 500
            }
        })

        expect(repository.search().total).toBe(2)

        database.close()
    })

    it("filters using a simple expression", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        repository.save({
            id: "1",
            type: "request",
            source: "firefox",
            message: "GET youtube",
            timestamp: new Date(),
            level: "info",
            data: {
                method: "GET",
                url: "https://youtube.com"
            }
        })

        repository.save({
            id: "2",
            type: "request",
            source: "firefox",
            message: "POST api",
            timestamp: new Date(),
            level: "info",
            data: {
                method: "POST",
                url: "https://example.com"
            }
        })

        const result = repository.search({
            search: 'method == "POST"'
        })

        expect(result.total).toBe(1)
        expect(result.events[0].id).toBe("2")

        database.close()
    })

    it("filters using compound expressions", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        repository.save({
            id: "1",
            type: "response",
            source: "firefox",
            message: "bad request",
            timestamp: new Date(),
            level: "error",
            data: {
                method: "POST",
                statusCode: 500
            }
        })

        repository.save({
            id: "2",
            type: "response",
            source: "firefox",
            message: "ok",
            timestamp: new Date(),
            level: "info",
            data: {
                method: "POST",
                statusCode: 200
            }
        })

        const result = repository.search({
            search: 'method == "POST" && status >= 400'
        })

        expect(result.total).toBe(1)
        expect(result.events[0].id).toBe("1")

        database.close()
    })

    it("supports plain text search", () => {
        const database = new DatabaseManager(":memory:")
        const repository = new EventRepository(database)

        repository.save({
            id: "1",
            type: "request",
            source: "firefox",
            message: "youtube request",
            timestamp: new Date(),
            level: "info",
            data: {
                url: "https://youtube.com"
            }
        })

        repository.save({
            id: "2",
            type: "request",
            source: "firefox",
            message: "discord request",
            timestamp: new Date(),
            level: "info",
            data: {
                url: "https://discord.com"
            }
        })

        const result = repository.search({
            search: "youtube"
        })

        expect(result.total).toBe(1)
        expect(result.events[0].id).toBe("1")

        database.close()
    })
})
