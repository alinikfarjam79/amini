import { useCallback, useEffect, useState } from "react";
import { loadProducts } from "../services/dataService";
import { cacheService } from "../lib/cacheService";
import { CACHE_KEY } from "../config/constants";

const PRODUCT_SOURCE_KEY = "amini_xls_product_source";
const PRODUCT_SOURCE = {
    SERVER: "server",
    LOCAL_IMPORT: "local_import",
};

const STATUS = {
    IDLE: "idle",
    LOADING: "loading",
    SUCCESS: "success",
    NETWORK_ERROR: "network_error",
    PARSE_ERROR: "parse_error",
};

const normalizeCachedProducts = (cached) => {
    if (Array.isArray(cached)) return cached;
    if (Array.isArray(cached?.products)) return cached.products;
    return [];
};

const getProductSource = () =>
    localStorage.getItem(PRODUCT_SOURCE_KEY) || PRODUCT_SOURCE.SERVER;

const setProductSource = (source) => {
    localStorage.setItem(PRODUCT_SOURCE_KEY, source);
};

const useProductData = () => {
    const [status, setStatus] = useState(STATUS.IDLE);
    const [products, setProducts] = useState([]);
    const [isUsingCache, setIsUsingCache] = useState(false);

    const sync = useCallback(async ({ forceServer = false } = {}) => {
        setStatus(STATUS.LOADING);
        setIsUsingCache(false);
        setProducts([]);

        if (!forceServer && getProductSource() === PRODUCT_SOURCE.LOCAL_IMPORT) {
            const cachedProducts = normalizeCachedProducts(cacheService.read(CACHE_KEY));

            if (cachedProducts.length) {
                setProducts(cachedProducts);
                setIsUsingCache(true);
                setStatus(STATUS.SUCCESS);
                return;
            }

            setProductSource(PRODUCT_SOURCE.SERVER);
        }

        try {
            const data = await loadProducts();
            setProductSource(PRODUCT_SOURCE.SERVER);
            cacheService.write(CACHE_KEY, data.products);
            setProducts(data.products);
            setStatus(STATUS.SUCCESS);
        } catch (err) {
            const errorType = err.type === "PARSE" ? STATUS.PARSE_ERROR : STATUS.NETWORK_ERROR;
            setStatus(errorType);

            if (errorType === STATUS.NETWORK_ERROR) {
                const cached = cacheService.read(CACHE_KEY);
                const cachedProducts = normalizeCachedProducts(cached);

                if (cachedProducts.length) {
                    setProducts(cachedProducts);
                    setIsUsingCache(true);
                }
            }
        }
    }, []);

    useEffect(() => {
        sync();
    }, [sync]);

    const replaceProducts = useCallback((newProducts) => {
        setProducts(newProducts);
        cacheService.write(CACHE_KEY, newProducts);
        setProductSource(PRODUCT_SOURCE.LOCAL_IMPORT);
        setIsUsingCache(false);
        setStatus(STATUS.SUCCESS);
    }, []);

    return {
        status,
        products,
        isUsingCache,
        sync: () => sync({ forceServer: true }),
        STATUS,
        replaceProducts,
    };
}

export default useProductData
