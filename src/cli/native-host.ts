import { EventManager } from "../core/event-manager.js"
import { Logger } from "../core/logger.js"
import { liveStream } from "../core/live-stream.js"
import { FirefoxCapture } from "../firefox/capture.js"
import { FirefoxConnector } from "../firefox/connector.js"
import { FirefoxNativeHost } from "../firefox/native-host.js"
import { DatabaseManager } from "../storage/database.js"
import { EventRepository } from "../storage/repository.js"
import { TransactionRepository } from "../storage/transaction-repository.js"

const database = new DatabaseManager("database/firefox.db")
const repository = new EventRepository(database)
const transactions = new TransactionRepository(database)
const logger = new Logger()
const events = new EventManager(
    logger,
    repository,
    transactions
)
const capture = new FirefoxCapture(events, liveStream)

liveStream.subscribe(event => {
    void fetch("http://127.0.0.1:8765/api/live", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
    }).catch(error => {
        console.error("[LIVE ERROR]", error instanceof Error ? error.message : error)
    })
})

console.error("[READY] Firefox Logger Native Host started")

const connector = new FirefoxConnector(capture)
const host = new FirefoxNativeHost(connector)

host.start()

function shutdown() {
    host.stop()
    database.close()
    process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
