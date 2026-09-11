import { Logger } from "./logger.js"
import { LoggerEvent } from "./types.js"
import { EventRepository } from "../storage/repository.js"
import { HttpTransaction } from "./http-transaction.js"
import { TransactionRepository } from "../storage/transaction-repository.js"

export class EventManager {
    constructor(
        private logger: Logger,
        private repository: EventRepository,
        private transactionRepository?: TransactionRepository
    ) {}

    emit(event: LoggerEvent) {
        this.repository.save(event)
        this.logger.write(event)
    }

    saveTransaction(transaction: HttpTransaction) {
        this.transactionRepository?.save(transaction)
    }
}
