import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;

const useInfiniteScroll = (allProducts) => {
  const [page, setPage] = useState(1);
  const sentinelElementRef = useRef(null);
  const [sentinelElement, setSentinelElement] = useState(null);

  const sentinelRef = useCallback((element) => {
    sentinelElementRef.current = element;
    setSentinelElement(element);
  }, []);

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
    const sentinel = sentinelElement;
    if (!sentinel) return;

    let frameId = null;
    const checkSentinelPosition = () => {
      if (!sentinelElementRef.current) return;

      if (
        sentinelElementRef.current.getBoundingClientRect().top <=
        window.innerHeight + 240
      ) {
        loadMore();
      }
    };

    const schedulePositionCheck = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        checkSentinelPosition();
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "240px 0px", threshold: 0.1 },
    );

    observer.observe(sentinel);
    schedulePositionCheck();
    window.addEventListener("scroll", schedulePositionCheck, { passive: true });
    window.addEventListener("resize", schedulePositionCheck);
    document.addEventListener("visibilitychange", schedulePositionCheck);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedulePositionCheck);
      window.removeEventListener("resize", schedulePositionCheck);
      document.removeEventListener("visibilitychange", schedulePositionCheck);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [loadMore, sentinelElement]);

  return {
    visibleProducts,
    hasMore,
    sentinelRef,
    total: allProducts.length,
  };
};

export default useInfiniteScroll;
