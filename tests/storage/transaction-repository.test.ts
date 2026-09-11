import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { DatabaseManager } from "../../src/storage/database.js"
import { TransactionRepository } from "../../src/storage/transaction-repository.js"
import { HttpTransaction } from "../../src/core/http-transaction.js"

describe("TransactionRepository", () => {
    let database: DatabaseManager
    let repository: TransactionRepository

    beforeEach(() => {
        database = new DatabaseManager(":memory:")
        repository = new TransactionRepository(database)
    })

    afterEach(() => {
        database.close()
    })

    function transaction(
        requestId: string,
        status: HttpTransaction["status"] = "completed"
    ): HttpTransaction {
        return {
            id: `event-${requestId}`,
            requestId,
            status,
            tabId: 4,
            windowId: 2,
            url: `https://example.com/${requestId}`,
            method: "GET",
            resourceType: "xhr",
            initiator: "https://example.com",
            startedAt: new Date("2026-09-03T10:00:00.000Z"),
            completedAt: new Date("2026-09-03T10:00:01.000Z"),
            statusCode: 200
        }
    }

    it("saves and retrieves a transaction", () => {
        repository.save(transaction("request-1"))

        const result = repository.findByRequestId("request-1")

        expect(result).toBeDefined()
        expect(result?.requestId).toBe("request-1")
        expect(result?.status).toBe("completed")
        expect(result?.statusCode).toBe(200)
        expect(result?.url).toBe("https://example.com/request-1")
    })

    it("updates an existing transaction", () => {
        repository.save(transaction("request-1", "pending"))
        repository.save(transaction("request-1", "completed"))

        const result = repository.findByRequestId("request-1")

        expect(result?.status).toBe("completed")
    })

    it("filters transactions", () => {
        repository.save(transaction("request-1"))
        repository.save(transaction("request-2", "failed"))

        const result = repository.search({
            status: "failed"
        })

        expect(result.total).toBe(1)
        expect(result.transactions).toHaveLength(1)
        expect(result.transactions[0].requestId).toBe("request-2")
    })

    it("supports pagination", () => {
        repository.save(transaction("request-1"))
        repository.save(transaction("request-2"))
        repository.save(transaction("request-3"))

        const result = repository.search({
            limit: 2,
            offset: 1
        })

        expect(result.total).toBe(3)
        expect(result.transactions).toHaveLength(2)
    })

    it("returns statistics", () => {
        repository.save(transaction("request-1"))
        repository.save(transaction("request-2", "failed"))

        const stats = repository.stats()

        expect(stats.total).toBe(2)
        expect(stats.statuses).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    status: "completed",
                    count: 1
                }),
                expect.objectContaining({
                    status: "failed",
                    count: 1
                })
            ])
        )
    })
})
