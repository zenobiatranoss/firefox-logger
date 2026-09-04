import { describe, expect, it } from "vitest"
import { compileFilter } from "../../src/storage/filter-sql.js"
import { parseFilter } from "../../src/core/filter.js"

describe("Filter SQL Compiler", () => {
    it("compiles equality", () => {
        const filter = parseFilter('method == "POST"')
        const result = compileFilter(filter)

        expect(result.sql).toContain("json_extract")
        expect(result.params).toEqual(["POST"])
    })

    it("compiles numeric comparison", () => {
        const filter = parseFilter("status >= 400")
        const result = compileFilter(filter)

        expect(result.sql).toContain(">=")
        expect(result.params).toEqual([400])
    })

    it("compiles contains search", () => {
        const filter = parseFilter("discord")
        const result = compileFilter(filter)

        expect(result.sql).toContain("LIKE")
        expect(result.params).toEqual(["%discord%", "%discord%", "%discord%", "%discord%", "%discord%"])
    })

    it("compiles AND", () => {
        const filter = parseFilter(
            'method == "POST" && status >= 400'
        )
        const result = compileFilter(filter)

        expect(result.sql).toContain(" AND ")
        expect(result.params).toEqual(["POST", 400])
    })

    it("compiles OR", () => {
        const filter = parseFilter(
            "status == 404 || status == 500"
        )
        const result = compileFilter(filter)

        expect(result.sql).toContain(" OR ")
        expect(result.params).toEqual([404, 500])
    })

    it("handles empty filter", () => {
        const result = compileFilter(null)

        expect(result.sql).toBe("1 = 1")
        expect(result.params).toEqual([])
    })
})
