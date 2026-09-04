import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { WebSocketServer, WebSocket } from "ws"
import { EventRepository } from "../storage/repository.js"
import { TransactionRepository } from "../storage/transaction-repository.js"

export class HttpServer {
    private server: http.Server
    private websocket: WebSocketServer
    private clients = new Set<WebSocket>()

    constructor(
        private port = 8765,
        private repository: EventRepository,
        private transactions: TransactionRepository
    ) {
        this.server = http.createServer((request, response) => {
            this.handle(request, response)
        })

        this.websocket = new WebSocketServer({ server: this.server })

        this.websocket.on("connection", socket => {
            this.clients.add(socket)
            socket.send(JSON.stringify({
                type: "connected",
                timestamp: new Date().toISOString()
            }))
            socket.on("close", () => this.clients.delete(socket))
        })

    }

    listen() {
        return new Promise<void>((resolve, reject) => {
            this.server.once("error", reject)

            this.server.listen(
                this.port,
                "127.0.0.1",
                () => resolve()
            )
        })
    }

    close() {
        return new Promise<void>(resolve => {
            for (const client of this.clients) {
                client.close()
            }

            this.clients.clear()
            this.websocket.close()

            if (!this.server.listening) {
                resolve()
                return
            }

            this.server.close(() => resolve())
        })
    }

    private handle(
        request: http.IncomingMessage,
        response: http.ServerResponse
    ) {
        const url = new URL(
            request.url ?? "/",
            "http://127.0.0.1"
        )

        response.setHeader("Access-Control-Allow-Origin", "*")
        response.setHeader("Content-Type", "application/json")

        if (request.method === "POST" && url.pathname === "/api/live") {
            this.readBody(request).then(body => {
                try {
                    const event = JSON.parse(body)
                    this.broadcast(event)
                    this.send(response, 200, { status: "ok" })
                } catch {
                    this.send(response, 400, { error: "Invalid JSON" })
                }
            }).catch(() => this.send(response, 400, { error: "Invalid request" }))
            return
        }


        if (request.method !== "GET") {
            this.send(response, 405, {
                error: "Method not allowed"
            })
            return
        }

        if (url.pathname === "/" || url.pathname === "/index.html") {
            this.sendFile(response, "index.html", "text/html; charset=utf-8")
            return
        }

        if (url.pathname === "/app.js") {
            this.sendFile(response, "app.js", "application/javascript; charset=utf-8")
            return
        }

        if (url.pathname === "/style.css") {
            this.sendFile(response, "style.css", "text/css; charset=utf-8")
            return
        }


        if (url.pathname === "/health") {
            this.send(response, 200, {
                status: "ok",
                service: "firefox-logger",
                timestamp: new Date().toISOString()
            })
            return
        }

        if (url.pathname === "/api/events") {
            try {
                this.send(response, 200, this.repository.search({
                    type: url.searchParams.get("type") ?? undefined,
                    source: url.searchParams.get("source") ?? undefined,
                    level: this.parseLevel(url.searchParams.get("level")),
                    method: url.searchParams.get("method") ?? undefined,
                    status: this.parseNumber(url.searchParams.get("status")),
                    resourceType: url.searchParams.get("resourceType") ?? undefined,
                    tabId: this.parseNumber(url.searchParams.get("tabId")),
                    requestId: url.searchParams.get("requestId") ?? undefined,
                    url: url.searchParams.get("url") ?? undefined,
                    search: url.searchParams.get("search") ?? undefined,
                    from: this.parseDate(url.searchParams.get("from")),
                    to: this.parseDate(url.searchParams.get("to")),
                    limit: this.parseNumber(url.searchParams.get("limit")),
                    offset: this.parseNumber(url.searchParams.get("offset"))
                }))
            } catch (error) {
                this.send(response, 400, {
                    error: "Invalid filter",
                    message: error instanceof Error
                        ? error.message
                        : "Invalid filter"
                })
            }
            return
        }

        if (url.pathname === "/api/transactions") {
            this.send(response, 200, this.transactions.search({
                method: url.searchParams.get("method") ?? undefined,
                status: url.searchParams.get("status") ?? undefined,
                statusCode: this.parseNumber(
                    url.searchParams.get("statusCode")
                ),
                resourceType:
                    url.searchParams.get("resourceType") ?? undefined,
                tabId: this.parseNumber(
                    url.searchParams.get("tabId")
                ),
                requestId:
                    url.searchParams.get("requestId") ?? undefined,
                url: url.searchParams.get("url") ?? undefined,
                search: url.searchParams.get("search") ?? undefined,
                limit: this.parseNumber(
                    url.searchParams.get("limit")
                ),
                offset: this.parseNumber(
                    url.searchParams.get("offset")
                ),
                sort: url.searchParams.get("sort") ?? undefined,
                order:
                    url.searchParams.get("order") === "asc"
                        ? "asc"
                        : "desc",
                from: this.parseDate(
                    url.searchParams.get("from")
                ),
                to: this.parseDate(
                    url.searchParams.get("to")
                )
            }))
            return
        }

        if (url.pathname.startsWith("/api/transactions/")) {
            const requestId = decodeURIComponent(
                url.pathname.slice("/api/transactions/".length)
            )

            const transaction =
                this.transactions.findByRequestId(requestId)

            if (!transaction) {
                this.send(response, 404, {
                    error: "Transaction not found"
                })
                return
            }

            this.send(response, 200, transaction)
            return
        }

        if (url.pathname === "/api/stats") {
            this.send(response, 200, {
                events: this.repository.stats(),
                transactions: this.transactions.stats()
            })
            return
        }

        this.send(response, 404, {
            error: "Not found"
        })
    }

    private broadcast(event: unknown) {
        const data = JSON.stringify(event)

        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data)
            }
        }
    }

    private readBody(request: http.IncomingMessage) {
        return new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = []
            let size = 0

            request.on("data", chunk => {
                size += chunk.length

                if (size > 25 * 1024 * 1024) {
                    reject(new Error("Request body too large"))
                    request.destroy()
                    return
                }

                chunks.push(Buffer.from(chunk))
            })

            request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
            request.on("error", reject)
        })
    }

    private sendFile(
        response: http.ServerResponse,
        filename: string,
        type: string
    ) {
        const file = path.join(process.cwd(), "public", filename)

        try {
            response.writeHead(200, { "Content-Type": type })
            response.end(fs.readFileSync(file))
        } catch {
            this.send(response, 404, { error: "File not found" })
        }
    }


    private send(
        response: http.ServerResponse,
        status: number,
        data: unknown
    ) {
        response.writeHead(status)
        response.end(JSON.stringify(data))
    }

    private parseNumber(value: string | null) {
        if (!value) {
            return undefined
        }

        const number = Number(value)

        return Number.isFinite(number)
            ? number
            : undefined
    }

    private parseDate(value: string | null) {
        if (!value) {
            return undefined
        }

        const date = new Date(value)

        return Number.isNaN(date.getTime())
            ? undefined
            : date
    }

    private parseLevel(value: string | null) {
        if (
            value === "info" ||
            value === "warning" ||
            value === "error"
        ) {
            return value
        }

        return undefined
    }
}
