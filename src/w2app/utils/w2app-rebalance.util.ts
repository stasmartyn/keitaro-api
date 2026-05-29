export function rebalanceWeights<T extends { id: number; weight?: number }>(
    streams: T[],
): Array<T & { weight: number }> {
    if (streams.length === 0) {
        return [];
    }

    const total = streams.reduce(
        (sum, stream) => sum + Math.max(0, Number(stream.weight ?? 0)),
        0,
    );

    if (total <= 0) {
        const base = Math.floor(100 / streams.length);
        let remainder = 100 - base * streams.length;
        return streams.map((stream) => {
            const nextWeight = base + (remainder > 0 ? 1 : 0);
            remainder = Math.max(0, remainder - 1);
            return { ...stream, weight: nextWeight };
        });
    }

    const weighted = streams.map((stream) => {
        const raw = (Math.max(0, Number(stream.weight ?? 0)) / total) * 100;
        const floorWeight = Math.floor(raw);

        return {
            stream,
            floorWeight,
            fraction: raw - floorWeight,
        };
    });

    let remainder =
        100 - weighted.reduce((sum, item) => sum + item.floorWeight, 0);

    weighted.sort((left, right) => right.fraction - left.fraction);
    for (const item of weighted) {
        if (remainder <= 0) {
            break;
        }
        item.floorWeight += 1;
        remainder -= 1;
    }

    return weighted.map((item) => ({
        ...item.stream,
        weight: item.floorWeight,
    }));
}
