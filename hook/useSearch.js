import { useEffect, useMemo, useState } from "react";
import { normalizePersian } from "../utilities/function";

// کلمات بسیار کوتاه یا پسوندهایی که به‌تنهایی معنا ندارند و باعث match اشتباه می‌شوند
const STOPWORDS = new Set(["ای", "ها", "و", "در", "از", "به", "با", "که", "را", "این", "آن"]);

/**
 * کلمه‌ی کامل‌شده (قبلی) را با word-boundary چک می‌کند.
 * چون فارسی \b ندارد، از فاصله/ابتدا/انتها به‌عنوان مرز استفاده می‌کنیم.
 * برای جلوگیری از false positive، فقط substring کامل (>=3 حرف) قبول می‌کنیم.
 */
const matchesCompletedWord = (text, word) => {
    if (STOPWORDS.has(word)) return true;

    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // ابتدا دنبال word boundary دقیق بگرد
    const boundaryRegex = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
    if (boundaryRegex.test(text)) return true;

    // اگر کلمه >=3 حرف بود substring معمولی هم قبول کن
    if (word.length >= 2) return text.includes(word);

    return false;
};

/**
 * آخرین کلمه (که هنوز در حال تایپ شدن است) را فقط به‌صورت prefix چک می‌کند.
 */
const matchesPrefixWord = (text, word) => {
    if (word.length < 1) return true;
    return text.includes(word);
};

export const filterByProductSearch = (
    products,
    query,
    getSearchFields = (product) => ({
        title: product["عنوان کالا"] || "",
        barcode: product["بارکد کالا"] || "",
    }),
) => {
        const normalizedQuery = normalizePersian(query).trim();

        if (!normalizedQuery) return products;

        const allTokens = normalizedQuery.split(/\s+/).filter(Boolean);

        const endsWithSpace = query.endsWith(" ");
        const prefixToken = endsWithSpace ? null : allTokens[allTokens.length - 1];
        const completedTokens = endsWithSpace ? allTokens : allTokens.slice(0, -1);

        const meaningfulCompleted = completedTokens.filter(
            w => w.length >= 2 && !STOPWORDS.has(w)
        );

        const effectivePrefix =
            prefixToken && prefixToken.length >= 1 && !STOPWORDS.has(prefixToken)
                ? prefixToken
                : null;

        if (meaningfulCompleted.length === 0 && !effectivePrefix) return products;

        return products.filter((p) => {
            const { title: rawTitle = "", barcode: rawBarcode = "" } =
                getSearchFields(p) || {};
            const title = normalizePersian(rawTitle);
            const productBarcode = String(rawBarcode || "");

            const completedMatch = meaningfulCompleted.every(w =>
                matchesCompletedWord(title, w)
            );

            const prefixMatch = effectivePrefix
                ? matchesPrefixWord(title, effectivePrefix)
                : true;

            const matchTitle = completedMatch && prefixMatch;

            const matchBarcode = productBarcode.includes(normalizedQuery);

            return matchTitle || matchBarcode;
        });
};

const useSearch = (products) => {
    const [query, setQuery] = useState("");

    useEffect(() => {
        console.log(products[0]);
    }, [products]);

    const filteredProducts = useMemo(() => {
        return filterByProductSearch(products, query);
    }, [products, query]);

    return { query, setQuery, filteredProducts };
};

export default useSearch;
