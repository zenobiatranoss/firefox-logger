import { describe, expect, test } from "vitest"
import { TransactionManager } from "./transaction-manager.js"

describe("TransactionManager", () => {
    test("keeps a new request pending", () => {
        const manager = new TransactionManager()

        const transaction = manager.handle({
            id: "event-1",
            type: "request",
            timestamp: new Date("2026-01-01T12:00:00Z"),
            requestId: "request-1",
            tabId: 1,
            url: "https://example.com",
            method: "GET"
        })

        expect(transaction).toMatchObject({
            requestId: "request-1",
            status: "pending",
            tabId: 1,
            url: "https://example.com",
            method: "GET"
        })
    })

    test("marks a completed request as completed", () => {
        const manager = new TransactionManager()

        manager.handle({
            id: "event-1",
            type: "request",
            timestamp: new Date("2026-01-01T12:00:00Z"),
            requestId: "request-1",
            url: "https://example.com",
            method: "GET"
        })

        const transaction = manager.handle({
            id: "event-2",
            type: "request_completed",
            timestamp: new Date("2026-01-01T12:00:01Z"),
            requestId: "request-1"
        })

        expect(transaction?.status).toBe("completed")
        expect(transaction?.completedAt).toEqual(
            new Date("2026-01-01T12:00:01Z")
        )
    })

    test("marks a failed request as failed", () => {
        const manager = new TransactionManager()

        manager.handle({
            id: "event-1",
            type: "request",
            timestamp: new Date("2026-01-01T12:00:00Z"),
            requestId: "request-1",
            url: "https://example.com",
            method: "GET"
        })

        const transaction = manager.handle({
            id: "event-2",
            type: "request_error",
            timestamp: new Date("2026-01-01T12:00:01Z"),
            requestId: "request-1",
            data: {
                error: "Network error"
            }
        })

        expect(transaction?.status).toBe("failed")
        expect(transaction?.error).toBe("Network error")
    })

    test("groups request events into one transaction", () => {
        const manager = new TransactionManager()

        manager.handle({
            id: "event-1",
            type: "request",
            timestamp: new Date("2026-01-01T12:00:00Z"),
            requestId: "request-1",
            tabId: 1,
            url: "https://example.com",
            method: "GET"
        })

        manager.handle({
            id: "event-2",
            type: "request_headers",
            timestamp: new Date("2026-01-01T12:00:00Z"),
            requestId: "request-1",
            requestHeaders: [
                {
                    name: "accept",
                    value: "*/*"
                }
            ]
        })

        manager.handle({
            id: "event-3",
            type: "response",
            timestamp: new Date("2026-01-01T12:00:00.500Z"),
            requestId: "request-1",
            statusCode: 200,
            responseHeaders: [
                {
                    name: "content-type",
                    value: "text/html"
                }
            ]
        })

        const transaction = manager.handle({
            id: "event-4",
            type: "request_completed",
            timestamp: new Date("2026-01-01T12:00:01Z"),
            requestId: "request-1"
        })

        expect(transaction).toMatchObject({
            requestId: "request-1",
            status: "completed",
            tabId: 1,
            url: "https://example.com",
            method: "GET",
            statusCode: 200,
            requestHeaders: [
                {
                    name: "accept",
                    value: "*/*"
                }
            ],
            responseHeaders: [
                {
                    name: "content-type",
                    value: "text/html"
                }
            ]
        })

        expect(manager.getAll()).toHaveLength(1)
    })

    test("updates the same transaction through its lifecycle", () => {
        const manager = new TransactionManager()

        const pending = manager.handle({
            id: "event-1",
            type: "request",
            timestamp: new Date("2026-01-01T12:00:00Z"),
            requestId: "request-1",
            tabId: 1,
            url: "https://example.com/api",
            method: "POST"
        })

        const response = manager.handle({
            id: "event-2",
            type: "response",
            timestamp: new Date("2026-01-01T12:00:00.500Z"),
            requestId: "request-1",
            statusCode: 201
        })

        const completed = manager.handle({
            id: "event-3",
            type: "request_completed",
            timestamp: new Date("2026-01-01T12:00:01Z"),
            requestId: "request-1"
        })

        expect(response).toBe(pending)
        expect(completed).toBe(pending)
        expect(manager.getAll()).toHaveLength(1)
        expect(completed?.status).toBe("completed")
        expect(completed?.statusCode).toBe(201)
    })
})
