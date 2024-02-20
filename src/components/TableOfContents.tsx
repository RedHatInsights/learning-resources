import { JumpLinks, JumpLinksItem } from '@patternfly/react-core';
import * as React from 'react';

const TableOfContents: React.FC<{
  defaultActive: string;
  linkItems: { id: string; label: React.ReactNode }[];
}> = ({ defaultActive, linkItems }) => {
  const tocRef = React.useRef<HTMLDivElement>(null);
  const [activeItem, setActive] = React.useState<string>(defaultActive);

  const intersectionObserver = () => {
    const options = {
      threshold: 0.5,
    };
    const contentLinks: HTMLAnchorElement[] =
      Array.from(document.querySelectorAll('.lr-c-catalog-section')) || [];

    const callback: IntersectionObserverCallback = (elements) => {
      const firstElement = elements.find((ele) => ele.isIntersecting);

      if (firstElement) {
        setActive(firstElement?.target?.id);
      }
    };
    const observer = new IntersectionObserver(callback, options);

    Array.from(contentLinks).forEach((link) => {
      observer.observe(link);
    });
  };

  const onJumpLinkClick = React.useCallback(
    (item: string) => {
      document.location.href = `${document.location.pathname}#${item}`;
      setActive(item);
    },
    [setActive]
  );

  React.useEffect(() => {
    if ('IntersectionObserver' in window) {
      intersectionObserver();
    }
  }, []);

  return (
    <div ref={tocRef}>
      <JumpLinks isVertical label="Jump to section">
        {linkItems.map(({ id, label }) => (
          <JumpLinksItem
            key={id}
            onClick={() => onJumpLinkClick(id)}
            isActive={activeItem === id}
          >
            {label}
          </JumpLinksItem>
        ))}
      </JumpLinks>
    </div>
  );
};

export default TableOfContents;
