import { EventManager } from "../core/event-manager.js"
import { EventStream } from "../core/event-stream.js"
import { TransactionManager } from "../core/transaction-manager.js"
import { FirefoxEventMapper } from "./event-mapper.js"
import { FirefoxEvent } from "./types.js"

export class FirefoxCapture {
    private events: EventManager
    private stream: EventStream
    private mapper: FirefoxEventMapper
    private transactions: TransactionManager

    constructor(
        events: EventManager,
        stream = new EventStream(),
        mapper = new FirefoxEventMapper(),
        transactions = new TransactionManager()
    ) {
        this.events = events
        this.stream = stream
        this.mapper = mapper
        this.transactions = transactions
    }

    handle(event: FirefoxEvent) {
        const loggerEvent = this.mapper.map(event)

        const transaction = this.transactions.handle(event)

        this.events.emit(loggerEvent)

        if (transaction) {
            this.events.saveTransaction(transaction)

            this.stream.publish({
                ...transaction,
                requestHeaders: transaction.requestHeaders
                    ? [...transaction.requestHeaders]
                    : undefined,
                responseHeaders: transaction.responseHeaders
                    ? [...transaction.responseHeaders]
                    : undefined,
                requestData: transaction.requestData
                    ? { ...transaction.requestData }
                    : undefined,
                responseData: transaction.responseData
                    ? { ...transaction.responseData }
                    : undefined
            })
        }
    }
}
