import { FirefoxEvent } from "../firefox/types.js"
import { HttpTransaction } from "./http-transaction.js"

export class TransactionManager {
    private transactions = new Map<string, HttpTransaction>()

    handle(event: FirefoxEvent) {
        if (!event.requestId) return

        let transaction = this.transactions.get(event.requestId)

        if (!transaction) {
            transaction = {
                id: event.id,
                requestId: event.requestId,
                status: "pending"
            }

            this.transactions.set(event.requestId, transaction)
        }

        transaction.tabId ??= event.tabId
        transaction.windowId ??= event.windowId
        transaction.url ??= event.url
        transaction.method ??= event.method
        transaction.resourceType ??= event.resourceType
        transaction.initiator ??= event.initiator

        if (event.type === "request") {
            transaction.startedAt = event.timestamp
            transaction.requestData = event.data
            transaction.status = "pending"
        }

        if (event.type === "request_headers") {
            transaction.requestHeaders = event.requestHeaders
        }

        if (event.type === "response") {
            transaction.statusCode = event.statusCode
            transaction.responseHeaders = event.responseHeaders
            transaction.responseData = event.data
        }

        if (event.type === "request_completed") {
            transaction.completedAt = event.timestamp
            transaction.status = "completed"
        }

        if (event.type === "request_error") {
            transaction.error =
                typeof event.data?.error === "string"
                    ? event.data.error
                    : "Request failed"

            transaction.completedAt = event.timestamp
            transaction.status = "failed"
        }

        return transaction
    }

    get(requestId: string) {
        return this.transactions.get(requestId)
    }

    getAll() {
        return [...this.transactions.values()]
    }

    remove(requestId: string) {
        this.transactions.delete(requestId)
    }

    clear() {
        this.transactions.clear()
    }
}
