import { EventEmitter } from "node:events"
import { describe, expect, test, vi } from "vitest"
import { FirefoxNativeHost } from "../../src/firefox/native-host.js"
import { FirefoxConnector } from "../../src/firefox/connector.js"
import { FirefoxCapture } from "../../src/firefox/capture.js"
import { EventManager } from "../../src/core/event-manager.js"
import { Logger } from "../../src/core/logger.js"
import { DatabaseManager } from "../../src/storage/database.js"
import { EventRepository } from "../../src/storage/repository.js"
import { NativeMessaging, NativeMessage } from "../../src/firefox/native-messaging.js"

class FakeInput extends EventEmitter {
    send(chunk: Buffer) {
        this.emit("data", chunk)
    }

    finish() {
        this.emit("end")
    }
}

function createHost() {
    const database = new DatabaseManager(":memory:")
    const repository = new EventRepository(database)
    const events = new EventManager(new Logger(), repository)
    const capture = new FirefoxCapture(events)
    const connector = new FirefoxConnector(capture)
    const host = new FirefoxNativeHost(connector)
    const input = new FakeInput()

    return {
        database,
        repository,
        connector,
        host,
        input
    }
}

function createMessage(id: string): NativeMessage {
    return {
        type: "event",
        event: {
            id,
            type: "navigation",
            timestamp: "2026-09-02T12:00:00.000Z",
            tabId: 5,
            windowId: 1,
            url: `https://example.com/${id}`
        }
    }
}

describe("FirefoxNativeHost", () => {
    test("starts and connects the Firefox connector", () => {
        const { database, connector, host, input } = createHost()
        const connect = vi.spyOn(connector, "connect")

        expect(host.isRunning()).toBe(false)

        host.start(input)

        expect(host.isRunning()).toBe(true)
        expect(connect).toHaveBeenCalledTimes(1)

        host.stop()

        connect.mockRestore()
        database.close()
    })

    test("disconnects when the input ends", () => {
        const { database, connector, host, input } = createHost()
        const disconnect = vi.spyOn(connector, "disconnect")

        host.start(input)
        input.finish()

        expect(host.isRunning()).toBe(false)
        expect(disconnect).toHaveBeenCalledTimes(1)

        disconnect.mockRestore()
        database.close()
    })

    test("receives a complete native message", () => {
        const { database, connector, host, input } = createHost()
        const receive = vi.spyOn(connector, "receive")
        const messaging = new NativeMessaging()
        const message = createMessage("event-1")

        host.start(input)
        input.send(messaging.encode(message))

        expect(receive).toHaveBeenCalledTimes(1)

        const event = receive.mock.calls[0][0]

        expect(event.id).toBe("event-1")
        expect(event.type).toBe("navigation")
        expect(event.timestamp).toEqual(
            new Date("2026-09-02T12:00:00.000Z")
        )
        expect(event.url).toBe("https://example.com/event-1")

        receive.mockRestore()
        database.close()
    })

    test("handles a message split across multiple chunks", () => {
        const { database, connector, host, input } = createHost()
        const receive = vi.spyOn(connector, "receive")
        const messaging = new NativeMessaging()
        const encoded = messaging.encode(createMessage("event-2"))

        host.start(input)

        input.send(encoded.subarray(0, 2))
        expect(receive).not.toHaveBeenCalled()

        input.send(encoded.subarray(2, 7))
        expect(receive).not.toHaveBeenCalled()

        input.send(encoded.subarray(7))

        expect(receive).toHaveBeenCalledTimes(1)
        expect(receive.mock.calls[0][0].id).toBe("event-2")

        receive.mockRestore()
        database.close()
    })

    test("handles multiple messages in one chunk", () => {
        const { database, connector, host, input } = createHost()
        const receive = vi.spyOn(connector, "receive")
        const messaging = new NativeMessaging()

        const first = messaging.encode(createMessage("event-3"))
        const second = messaging.encode(createMessage("event-4"))

        host.start(input)
        input.send(Buffer.concat([first, second]))

        expect(receive).toHaveBeenCalledTimes(2)
        expect(receive.mock.calls[0][0].id).toBe("event-3")
        expect(receive.mock.calls[1][0].id).toBe("event-4")

        receive.mockRestore()
        database.close()
    })

    test("stores an event received through the native host", () => {
        const { database, repository, host, input } = createHost()
        const messaging = new NativeMessaging()
        const message = createMessage("event-5")

        host.start(input)
        input.send(messaging.encode(message))

        const stored = repository.findById("event-5")

        expect(stored).toBeDefined()
        expect(stored?.type).toBe("firefox_navigation")
        expect(stored?.source).toBe("firefox")
        expect(stored?.url).toBeUndefined()
        expect(stored?.data?.url).toBe(
            "https://example.com/event-5"
        )

        database.close()
    })
})
