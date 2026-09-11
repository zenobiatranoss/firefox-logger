import { describe, expect, test, vi } from "vitest"
import { Logger } from "../../src/core/logger.js"

describe("Logger", () => {
    test("writes log event", () => {
        const output = vi.spyOn(console, "error")

        const logger = new Logger()

        logger.write({
            id: "test-id",
            type: "page_visit",
            source: "firefox",
            message: "Opened example.com",
            timestamp: new Date(),
            level: "info",
            data: {
                url: "https://example.com"
            }
        })

        expect(output).toHaveBeenCalled()

        output.mockRestore()
    })
})
