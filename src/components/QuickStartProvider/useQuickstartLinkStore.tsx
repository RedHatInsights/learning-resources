import React, { useEffect, useMemo, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

interface LinkEntry {
  intervalId: ReturnType<typeof setInterval>;
  element: HTMLAnchorElement | null;
  handler: (e: MouseEvent) => void;
}

/**
 * Hook for managing quickstart links in markdown content.
 * Intercepts internal links to use history navigation instead of full page loads.
 */
function useQuickstartLinkStore() {
  const store = useMemo(() => new Map<string, HTMLAnchorElement>(), []);
  const pendingRef = useRef<Map<string, LinkEntry>>(new Map());

  function addLinkElement(id: string) {
    const handler = (e: MouseEvent) => {
      const el = e.currentTarget as HTMLAnchorElement;
      const { href } = el;
      if (!href) {
        return;
      }
      e.preventDefault();
      window.history.replaceState({ quickstartLink: true }, '', href);
      window.dispatchEvent(
        new PopStateEvent('popstate', { state: { quickstartLink: true } })
      );
    };

    let iterations = 0;
    setTimeout(() => {
      const findInterval = setInterval(() => {
        const element = document.getElementById(id);
        const entry = pendingRef.current.get(id);

        if (element) {
          const anchor = element as HTMLAnchorElement;
          store.set(id, anchor);
          anchor.addEventListener('click', handler);
          if (entry) {
            clearInterval(entry.intervalId);
            entry.element = anchor;
            entry.handler = handler;
          }
          return;
        }

        iterations += 1;
        if (iterations > 5) {
          if (entry) {
            clearInterval(entry.intervalId);
            pendingRef.current.delete(id);
          }
        }
      }, 1000);

      pendingRef.current.set(id, {
        intervalId: findInterval,
        element: null,
        handler,
      });
    });
  }

  function emptyElements() {
    store.clear();
  }

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((entry) => {
        clearInterval(entry.intervalId);
        if (entry.element) {
          entry.element.removeEventListener('click', entry.handler);
        }
      });
      pendingRef.current.clear();
      emptyElements();
    };
  }, []);

  return {
    addLinkElement,
    emptyElements,
  };
}

/**
 * Creates a markdown extension for handling links in quickstart content.
 * Internal links are intercepted for SPA navigation.
 */
export function createQuickstartLinkMarkupExtension(
  quickstartLinkStore: ReturnType<typeof useQuickstartLinkStore>
) {
  return {
    type: 'lang',
    // matches MD links like [link text](https://example.com)
    regex: /\[.*\]\(.*\)/g,
    replace: (text: string) => {
      try {
        let [linkText, linkURL] = text.split('](');
        linkText = linkText.replace(/^\[/, '');
        linkURL = linkURL.replace(/\)$/, '');
        let href: string;
        try {
          const fullURL = new URL(linkURL);
          href = fullURL.toString();
          if (fullURL.origin !== window.location.origin) {
            // link is external, do not intercept
            return text;
          }
        } catch {
          // not full URL, is just a pathname
          href = linkURL;
        }
        const linkId = crypto.randomUUID();
        quickstartLinkStore.addLinkElement(linkId);
        const node = (
          <a id={linkId} href={href}>
            {linkText}
          </a>
        );
        return renderToStaticMarkup(node);
      } catch (e) {
        console.error('Error creating quickstart link markup', e);
        return text;
      }
    },
  };
}

export default useQuickstartLinkStore;
