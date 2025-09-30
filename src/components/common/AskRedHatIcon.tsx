import React from 'react';

interface AskRedHatIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const AskRedHatIcon = ({
  className,
  width = 20,
  height = 20,
}: AskRedHatIconProps) => {
  const iconAskRedHat =
    '/apps/frontend-assets/technology-icons/ai-chat-ask-redhat.svg';
  return (
    <svg width={width} height={height} className={className}>
      <image xlinkHref={iconAskRedHat} width={width} height={height} />
    </svg>
  );
};
