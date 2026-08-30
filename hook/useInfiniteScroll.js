import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;

const useInfiniteScroll = (allProducts) => {
  const [page, setPage] = useState(1);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setPage(1);
  }, [allProducts]);

  const visibleProducts = allProducts.slice(0, page * PAGE_SIZE);
  const hasMore = visibleProducts.length < allProducts.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setPage((currentPage) => currentPage + 1);
    }
  }, [hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "240px 0px", threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return {
    visibleProducts,
    hasMore,
    sentinelRef,
    total: allProducts.length,
  };
};

export default useInfiniteScroll;
