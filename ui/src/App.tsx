import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageInfinite } from "./Api";
import "./App.css";
import { Tweet } from "react-tweet";

function App() {
  const startBatch = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get("batch") || undefined;
  }, []);
  const { data, error, isLoading, isValidating, size, setSize } =
    usePageInfinite(startBatch);

  const observer = useInteractionObserver(
    useCallback(
      (entries) => {
        if (isValidating || isLoading) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) setSize(size + 1);
        });
      },
      [isValidating, isLoading, size, setSize]
    ),
    {}
  );

  const flattenTweets = useMemo(
    () => (data ?? []).flatMap((b) => (!b.batch ? [] : b.page.statuses)),
    [data]
  );

  const [focusIndex, setFocusIndex] = useState(-1);
  useEffect(() => {
    if (!data) {
      return;
    }
    if (focusIndex === -1) {
      return;
    }

    const url = new URL(location.href);
    url.hash = `#tweet-${flattenTweets[focusIndex].id}`;
    location.replace(url.toString());
    if (focusIndex === flattenTweets.length - 1) {
      setSize((curr) => curr + 1);
    }
  }, [data, flattenTweets, focusIndex, setSize]);

  useEffect(() => {
    const handleKeydown = (evt: KeyboardEvent): void => {
      switch (evt.key) {
        case "j":
          setFocusIndex((curr) => Math.min(curr + 1, flattenTweets.length - 1));
          break;
        case "k":
          setFocusIndex((curr) => Math.max(curr - 1, 0));
          break;
        case ".":
          location.replace("/");
          break;
      }
    };
    document.documentElement.addEventListener("keydown", handleKeydown);
    return () =>
      document.documentElement.removeEventListener("keydown", handleKeydown);
  }, [flattenTweets.length]);

  useEffect(() => {
    if (!data) return;
    if (size < 2) return;
    const batchId = data[data.length - 1]?.batch?.id;
    if (batchId) {
      const url = new URL(location.href);
      url.searchParams.set("batch", batchId);
      history.replaceState({}, "", url.toString());
    }
  }, [size, data]);

  const lastPage = data ? data[data.length - 1] : undefined;
  const reachedLastPage =
    !isLoading &&
    !isValidating &&
    lastPage &&
    (lastPage.batch ? !lastPage.batch.head && !lastPage.batch.next : true);

  useEffect(() => {}, []);

  return (
    <>
      <header>
        <h1>{import.meta.env.VITE_HTML_TITLE}</h1>
        <p className="powered-by">
          Powered by{" "}
          <a href="https://github.com/sorah/publikes">sorah/publikes</a>
        </p>
      </header>
      {startBatch ? (
        <p className="past-page-warning">
          Browsing the past page ({startBatch}).
          <br />
          <a href="/">Back to the most recent like</a>
        </p>
      ) : null}
      <main lang={import.meta.env.VITE_HTML_LANG}>
        {data?.map((b) => {
          if (!b.batch) return null;
          const page = b.page;
          return (
            <div key={`${b.batch.id}-${page.id}`}>
              {page.statuses.map((status) => {
                return (
                  <div
                    key={`${page.id}-${status.id}`}
                    className="liked-tweet"
                    id={`tweet-${status.id}`}
                    data-status-id={status.id}
                  >
                    <Tweet id={status.id} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </main>
      {error ? <p>Error: {error}</p> : null}
      <div className="load-more" ref={observer}>
        {reachedLastPage ? (
          <p className="last-page">You've reached the last page.</p>
        ) : null}
        {isLoading || isValidating ? <p>👊</p> : null}
      </div>
    </>
  );
}

function useInteractionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit
) {
  const ref = useRef(null);
  const observer = useMemo(
    () => new IntersectionObserver(callback, options),
    [callback, options]
  );
  useEffect(() => {
    const elem = ref.current;
    if (!elem) return;
    observer.observe(elem);
    return () => observer.unobserve(elem);
  }, [observer, ref]);
  return ref;
}

export default App;
