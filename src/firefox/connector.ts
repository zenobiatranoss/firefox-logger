import { FirefoxCapture } from "./capture.js"
import { FirefoxEvent } from "./types.js"

export class FirefoxConnector {
    private capture: FirefoxCapture
    private connected = false

    constructor(capture: FirefoxCapture) {
        this.capture = capture
    }

    connect() {
        this.connected = true
    }

    disconnect() {
        this.connected = false
    }

    isConnected() {
        return this.connected
    }

    receive(event: FirefoxEvent) {
        if (!this.connected) {
            throw new Error("Firefox connector is not connected")
        }

        this.capture.handle(event)
    }
}
