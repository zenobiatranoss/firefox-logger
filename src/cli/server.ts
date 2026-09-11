import { DatabaseManager } from "../storage/database.js"
import { EventRepository } from "../storage/repository.js"
import { TransactionRepository } from "../storage/transaction-repository.js"
import { HttpServer } from "../server/http-server.js"

const database = new DatabaseManager("database/firefox.db")
const repository = new EventRepository(database)
const transactions = new TransactionRepository(database)
const httpServer = new HttpServer(8765, repository, transactions)

async function start() {
    await httpServer.listen()

    console.error("[READY] Firefox Logger server started")
    console.error("[HTTP] http://127.0.0.1:8765")
}

async function shutdown() {
    await httpServer.close()
    database.close()
    process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

start().catch(error => {
    console.error(error)
    shutdown()
})
