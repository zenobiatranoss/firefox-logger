import { EventManager } from "../core/event-manager.js"
import { Logger } from "../core/logger.js"
import { DatabaseManager } from "../storage/database.js"
import { EventRepository } from "../storage/repository.js"

const logger = new Logger()
const database = new DatabaseManager("database/firefox.db")
const repository = new EventRepository(database)
const events = new EventManager(logger, repository)

events.emit({
    id: crypto.randomUUID(),
    type: "system",
    source: "firefox-logger",
    message: "Logger started",
    timestamp: new Date(),
    level: "info"
})

database.close()
