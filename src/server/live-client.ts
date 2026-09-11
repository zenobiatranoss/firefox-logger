// Kept for future use.
import WebSocket from "ws"

export class LiveClient {
    private socket: WebSocket | null = null
    private queue: string[] = []

    constructor(private url = "ws://127.0.0.1:8766") {
        this.connect()
    }

    private connect() {
        this.socket = new WebSocket(this.url)

        this.socket.on("open", () => {
            console.error("[LIVE CLIENT] connected")

            for (const item of this.queue) {
                this.socket?.send(item)
            }

            this.queue = []
        })

        this.socket.on("close", () => {
            console.error("[LIVE CLIENT] reconnecting")
            setTimeout(() => this.connect(), 2000)
        })

        this.socket.on("error", error => {
            console.error("[LIVE CLIENT]", error.message)
        })
    }

    publish(event: unknown) {
        const data = JSON.stringify(event)

        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(data)
        } else {
            this.queue.push(data)
        }
    }
}
