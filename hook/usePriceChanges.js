import { useCallback, useState } from "react";
import {
    addDismissed,
    detectPriceChanges,
} from "../lib/priceHistoryService";

/**
 * usePriceChanges
 * ─────────────────────────────────────────────────────────────
 */
const usePriceChanges = () => {
    const [priceChanges, setPriceChanges] = useState([]);

    /** بعد از هر sync/import فراخوانی می‌شه */
    const computeChanges = useCallback((newProducts) => {
        const changes = detectPriceChanges(newProducts);
        setPriceChanges(changes);
        return changes;
    }, []);

    const dismissProduct = useCallback((code) => {
        addDismissed(code);
        setPriceChanges((prev) => prev.filter((p) => p._code !== String(code)));
    }, []);

    return { priceChanges, computeChanges, dismissProduct };
};

export default usePriceChanges;