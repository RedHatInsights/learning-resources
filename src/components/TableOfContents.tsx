import { JumpLinks, JumpLinksItem } from '@patternfly/react-core';
import * as React from 'react';

const SCROLL_ANIMATION_DURATION = 1000; // ms to wait for scroll animation completion

const TableOfContents: React.FC<{
  defaultActive: string;
  linkItems: { id: string; label: React.ReactNode }[];
}> = ({ defaultActive, linkItems }) => {
  const tocRef = React.useRef<HTMLDivElement>(null);
  const [activeItem, setActive] = React.useState<string>(defaultActive);
  const isClickingRef = React.useRef(false);

  const intersectionObserver = () => {
    const options = {
      threshold: 0.3,
      rootMargin: '0px 0px -50% 0px',
    };
    const contentSections: HTMLElement[] =
      Array.from(document.querySelectorAll('.lr-c-catalog-section')) || [];

    const callback: IntersectionObserverCallback = (elements) => {
      // Don't update active state if user just clicked
      if (isClickingRef.current) {
        return;
      }

      const visibleElements = elements.filter((ele) => ele.isIntersecting);

      if (visibleElements.length > 0) {
        const firstVisible = visibleElements[0];
        const targetId = firstVisible.target.id;
        if (targetId) {
          setActive(targetId);
        }
      }
    };
    const observer = new IntersectionObserver(callback, options);

    contentSections.forEach((section) => {
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  };

  const onJumpLinkClick = React.useCallback(
    (item: string) => {
      // Set flag to prevent intersection observer from overriding
      isClickingRef.current = true;
      setActive(item);

      const contentContainer = document.getElementById('quick-starts');

      if (!contentContainer) {
        isClickingRef.current = false;
        return;
      }

      const targetElement = contentContainer.querySelector(
        `#${item}`
      ) as HTMLElement;

      if (!targetElement) {
        isClickingRef.current = false;
        return;
      }

      // Find the actual scrollable parent
      let scrollContainer: HTMLElement | null = null;
      let parent = contentContainer.parentElement;

      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);

        if (
          (style.overflow === 'auto' ||
            style.overflow === 'scroll' ||
            style.overflowY === 'auto' ||
            style.overflowY === 'scroll') &&
          parent.scrollHeight > parent.clientHeight
        ) {
          scrollContainer = parent;
          break;
        }
        parent = parent.parentElement;
      }

      if (!scrollContainer) {
        const targetRect = targetElement.getBoundingClientRect();
        const scrollOffset =
          window.scrollY + targetRect.top - window.innerHeight * 0.1;

        window.scrollTo({
          top: scrollOffset,
          behavior: 'smooth',
        });
      } else {
        // Calculate the scroll position relative to the scrollable parent
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const scrollOffset =
          targetRect.top - containerRect.top + scrollContainer.scrollTop;

        // Scroll to the target section
        scrollContainer.scrollTo({
          top: scrollOffset - 20, // Add small offset for better visual positioning
          behavior: 'smooth',
        });
      }

      // Reset flag after scroll animation completes
      setTimeout(() => {
        isClickingRef.current = false; // Re-enable intersection observer
      }, SCROLL_ANIMATION_DURATION);

      // Update URL hash for browser history
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}#${item}`
      );
    },
    [setActive]
  );

  React.useEffect(() => {
    let cleanup: (() => void) | undefined;
    if ('IntersectionObserver' in window) {
      cleanup = intersectionObserver();
    }
    return cleanup;
  }, []);

  return (
    <div ref={tocRef}>
      <JumpLinks isVertical label="Jump to section">
        {linkItems.map(({ id, label }) => (
          <JumpLinksItem
            key={id}
            onClick={() => onJumpLinkClick(id)}
            isActive={activeItem === id}
            href="#"
          >
            {label}
          </JumpLinksItem>
        ))}
      </JumpLinks>
    </div>
  );
};

export default TableOfContents;
