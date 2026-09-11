import { EventEmitter } from "node:events"

export class EventStream extends EventEmitter {
    publish(event: unknown) {
        this.emit("event", event)
    }

    subscribe(listener: (event: unknown) => void) {
        this.on("event", listener)

        return () => {
            this.off("event", listener)
        }
    }
}
