import { describe, expect, it } from "vitest"
import { isFilterGroup, parseFilter } from "../../src/core/filter.js"

describe("Filter Parser", () => {
    it("parses simple equality", () => {
        expect(parseFilter('method == "POST"')).toEqual({
            field: "http.request.method",
            operator: "eq",
            value: "POST"
        })
    })

    it("parses numeric comparisons", () => {
        expect(parseFilter("status >= 400")).toEqual({
            field: "http.response.code",
            operator: "gte",
            value: 400
        })
    })

    it("parses contains", () => {
        expect(parseFilter('url contains "youtube.com"')).toEqual({
            field: "http.request.url",
            operator: "contains",
            value: "youtube.com"
        })
    })

    it("supports AND", () => {
        const result = parseFilter(
            'method == "POST" && status >= 400'
        )

        expect(result).not.toBeNull()
        expect(isFilterGroup(result!)).toBe(true)

        if (result && isFilterGroup(result)) {
            expect(result.operator).toBe("and")
            expect(result.items).toHaveLength(2)
        }
    })

    it("supports OR", () => {
        const result = parseFilter(
            'status == 404 || status == 500'
        )

        expect(result).not.toBeNull()
        expect(isFilterGroup(result!)).toBe(true)

        if (result && isFilterGroup(result)) {
            expect(result.operator).toBe("or")
            expect(result.items).toHaveLength(2)
        }
    })

    it("supports plain search", () => {
        expect(parseFilter("discord")).toEqual({
            field: "data",
            operator: "contains",
            value: "discord"
        })
    })

    it("returns null for empty filters", () => {
        expect(parseFilter("")).toBeNull()
        expect(parseFilter("   ")).toBeNull()
    })
})
