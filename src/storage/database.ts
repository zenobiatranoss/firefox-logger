import Database from "better-sqlite3"

export class DatabaseManager {
    private database: Database.Database

    constructor(path: string) {
        this.database = new Database(path)
        this.database.pragma("journal_mode = WAL")
        this.database.pragma("foreign_keys = ON")
    }

    get connection() {
        return this.database
    }

    close() {
        this.database.close()
    }
}
