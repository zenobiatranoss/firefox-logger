// Kept for future use.
import { describe, expect, test } from "vitest"
import { WebSocket } from "ws"
import { LiveServer } from "./live-server.js"
import { EventStream } from "../core/event-stream.js"

describe("LiveServer", () => {
    test("broadcasts transactions to connected clients", async () => {
        const stream = new EventStream()
        const port = 18766
        const server = new LiveServer(port, stream)

        const socket = new WebSocket(`ws://127.0.0.1:${port}`)

        const messages: unknown[] = []

        await new Promise<void>((resolve, reject) => {
            socket.on("message", message => {
                const data = JSON.parse(message.toString())
                messages.push(data)

                if (data.type === "connected") {
                    resolve()
                }
            })

            socket.on("error", reject)
        })

        const transaction = {
            id: "event-1",
            requestId: "request-1",
            status: "pending",
            tabId: 1,
            url: "https://example.com",
            method: "GET"
        }

        const received = new Promise<unknown>((resolve, reject) => {
            socket.on("message", message => {
                try {
                    const data = JSON.parse(message.toString())

                    if (data.requestId === "request-1") {
                        resolve(data)
                    }
                } catch (error) {
                    reject(error)
                }
            })

            socket.on("error", reject)
        })

        stream.publish(transaction)

        expect(await received).toEqual(transaction)
        expect(messages[0]).toMatchObject({
            type: "connected"
        })

        socket.close()
        server.close()
    })
})
