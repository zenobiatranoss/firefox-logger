import { LoggerEvent } from "./types.js"

export class Logger {
    write(event: LoggerEvent) {
        const time = event.timestamp.toISOString()

        console.error(
            `[${event.level.toUpperCase()}] ${time} ${event.type} ${event.message}`
        )

        if (event.data) {
            console.error(event.data)
        }
    }
}
