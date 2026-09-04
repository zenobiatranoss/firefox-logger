// Kept for future use.
import { WebSocketServer, WebSocket } from "ws"
import { EventStream } from "../core/event-stream.js"

export class LiveServer {
    private server: WebSocketServer
    private clients = new Set<WebSocket>()
    private unsubscribe: (() => void) | null = null
    private ready: Promise<void>

    constructor(private port = 8766, private stream = new EventStream()) {
        this.server = new WebSocketServer({
            host: "127.0.0.1",
            port: this.port
        })

        this.ready = new Promise((resolve, reject) => {
            this.server.once("listening", () => resolve())
            this.server.once("error", reject)
        })

        this.server.on("connection", socket => {
            this.clients.add(socket)

            socket.send(
                JSON.stringify({
                    type: "connected",
                    timestamp: new Date().toISOString()
                })
            )

            socket.on("close", () => {
                this.clients.delete(socket)
            })
        })

        this.unsubscribe = this.stream.subscribe(event => {
            this.broadcast(event)
        })
    }

    waitUntilReady() {
        return this.ready
    }

    private broadcast(event: unknown) {
        const data = JSON.stringify(event)

        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data)
            }
        }
    }

    close() {
        this.unsubscribe?.()
        this.unsubscribe = null

        for (const client of this.clients) {
            client.close()
        }

        this.clients.clear()
        this.server.close()
    }
}