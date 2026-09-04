import { EventManager } from "../core/event-manager.js"
import { FirefoxConnector } from "./connector.js"
import { NativeMessaging } from "./native-messaging.js"
import fs from "node:fs"

export class FirefoxNativeHost {
    private readonly connector: FirefoxConnector
    private readonly messaging: NativeMessaging
    private buffer = Buffer.alloc(0)
    private running = false

    constructor(
        connector: FirefoxConnector,
        messaging = new NativeMessaging()
    ) {
        this.connector = connector
        this.messaging = messaging
    }

    start(input: NodeJS.ReadableStream = process.stdin) {
        if (this.running) {
            throw new Error("Native host is already running")
        }

        this.running = true
        this.connector.connect()

        input.on("data", chunk => {
            try {
                this.handleChunk(Buffer.from(chunk))
            } catch (error) {
                this.writeError(error)
            }
        })

        input.on("end", () => {
            this.stop()
        })

        input.on("error", error => {
            this.writeError(error)
            this.stop()
        })
    }

    stop() {
        if (!this.running) {
            return
        }

        this.running = false
        this.connector.disconnect()
    }

    isRunning() {
        return this.running
    }

    private handleChunk(chunk: Buffer) {
        console.error("[NATIVE DATA]", chunk.length)
        this.buffer = Buffer.concat([this.buffer, chunk])

        while (this.buffer.length >= 4) {
            const length = this.buffer.readUInt32LE(0)
            const totalLength = length + 4

            if (this.buffer.length < totalLength) {
                return
            }

            const packet = this.buffer.subarray(0, totalLength)
            this.buffer = this.buffer.subarray(totalLength)

            console.error("[NATIVE PACKET]", length)
            const message = this.messaging.decode(packet)
            const body = (message as any)?.event?.data?.requestBody?.raw?.[0]?.bytes
            console.error("[NATIVE BODY TYPE]", body?.constructor?.name)
            console.error("[NATIVE BODY ARRAY]", Array.isArray(body))
            console.error("[NATIVE BODY LENGTH]", body?.length)
            console.error("[NATIVE BODY SAMPLE]", Array.isArray(body) ? body.slice(0, 20) : body)
            const event = this.messaging.toFirefoxEvent(message)

            this.connector.receive(event)
        }
    }

    private writeError(error: unknown) {
        const message = error instanceof Error
            ? error.message
            : String(error)

        process.stderr.write(`${message}\n`)
    }
}
