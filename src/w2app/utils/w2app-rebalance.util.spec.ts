import { rebalanceWeights } from "./w2app-rebalance.util";

describe("rebalanceWeights", () => {
    it("розподіляє 100 між трьома streams з залишком largest-remainder", () => {
        const result = rebalanceWeights([
            { id: 1, weight: 33 },
            { id: 2, weight: 33 },
            { id: 3, weight: 34 },
        ]);

        expect(result.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
        expect(result.map((item) => item.weight).sort((a, b) => a - b)).toEqual(
            [33, 33, 34],
        );
    });

    it("при total=0 рівномірно розподіляє 100", () => {
        const result = rebalanceWeights([
            { id: 1, weight: 0 },
            { id: 2, weight: 0 },
            { id: 3, weight: 0 },
        ]);

        expect(result.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    });

    it("для одного stream повертає weight 100", () => {
        const result = rebalanceWeights([{ id: 1, weight: 0 }]);

        expect(result).toEqual([{ id: 1, weight: 100 }]);
    });

    it("повертає порожній масив для порожнього вводу", () => {
        expect(rebalanceWeights([])).toEqual([]);
    });
});
