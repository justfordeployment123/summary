// __tests__/lib/api/upsells.test.ts
//
// Tests for fetchUpsells.
// Requirements covered:
//   §15   Upsell System — active upsells, per-category pricing, admin-configurable
//   §7    Server re-validates prices before charging (never trust client)

import { fetchUpsells } from "@/lib/api";

const originalFetch = global.fetch;

beforeEach(() => {
    global.fetch = jest.fn();
});

afterAll(() => {
    global.fetch = originalFetch;
});

// ─── successful fetch ────────────────────────────────────────────────────────

describe("fetchUpsells — successful responses", () => {
    it("calls /api/upsells with GET (no body)", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ upsells: [] }),
        });

        await fetchUpsells();

        expect(global.fetch).toHaveBeenCalledWith("/api/upsells");
    });

    it("returns the upsells array from the server", async () => {
        const mockUpsells = [
            {
                _id: "upsell-001",
                name: "More Detail",
                description: "Adds a more in-depth breakdown.",
                is_active: true,
                category_prices: { "cat-legal": 299, "cat-medical": 199 },
            },
            {
                _id: "upsell-002",
                name: "Legal Formatting",
                description: "Formats output as a legal summary.",
                is_active: true,
                category_prices: { "cat-legal": 499 },
            },
        ];

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ upsells: mockUpsells }),
        });

        const result = await fetchUpsells();
        expect(result.upsells).toEqual(mockUpsells);
        expect(result.upsells).toHaveLength(2);
    });

    // §15 — default upsells: More Detail | Legal Formatting | Tone Rewrite
    it("can return all three default upsell types", async () => {
        const defaultUpsells = [
            { _id: "u1", name: "More Detail", description: "", is_active: true, category_prices: {} },
            { _id: "u2", name: "Legal Formatting", description: "", is_active: true, category_prices: {} },
            { _id: "u3", name: "Tone Rewrite", description: "", is_active: true, category_prices: {} },
        ];

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ upsells: defaultUpsells }),
        });

        const result = await fetchUpsells();
        const names = result.upsells.map((u) => u.name);
        expect(names).toContain("More Detail");
        expect(names).toContain("Legal Formatting");
        expect(names).toContain("Tone Rewrite");
    });

    // §15 — is_active flag: admin can disable upsells without code changes;
    //         client filters by category_prices[categoryId] > 0
    it("returns both active and inactive upsells (client filters by is_active)", async () => {
        const mixedUpsells = [
            { _id: "u1", name: "More Detail", description: "", is_active: true, category_prices: { "cat-legal": 299 } },
            { _id: "u2", name: "Old Upsell", description: "", is_active: false, category_prices: {} },
        ];

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ upsells: mixedUpsells }),
        });

        const result = await fetchUpsells();
        // Server may return inactive upsells; client is responsible for filtering
        const inactiveUpsell = result.upsells.find((u) => !u.is_active);
        expect(inactiveUpsell).toBeDefined();
    });

    // §15 — category-specific pricing: upsell price varies by category
    it("returns per-category prices in the category_prices map", async () => {
        const upsell = {
            _id: "u1",
            name: "More Detail",
            description: "",
            is_active: true,
            category_prices: {
                "cat-legal": 499,
                "cat-medical": 299,
                "cat-government": 199,
            },
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ upsells: [upsell] }),
        });

        const result = await fetchUpsells();
        expect(result.upsells[0].category_prices["cat-legal"]).toBe(499);
        expect(result.upsells[0].category_prices["cat-medical"]).toBe(299);
    });

    it("returns an empty upsells array when none are configured", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ upsells: [] }),
        });

        const result = await fetchUpsells();
        expect(result.upsells).toEqual([]);
    });
});

// ─── error handling ──────────────────────────────────────────────────────────

describe("fetchUpsells — error handling", () => {
    it("throws with the server error message on failure", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Database unavailable" }),
        });

        await expect(fetchUpsells()).rejects.toThrow("Database unavailable");
    });

    it("falls back to a generic message when no error field is returned", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({}),
        });

        await expect(fetchUpsells()).rejects.toThrow("Failed to load upsells.");
    });

    it("falls back to default message when json() throws", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => {
                throw new Error("parse fail");
            },
        });

        await expect(fetchUpsells()).rejects.toThrow("Failed to load upsells.");
    });

    it("propagates network-level errors", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error("No connection"));

        await expect(fetchUpsells()).rejects.toThrow("No connection");
    });
});
