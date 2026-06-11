import React from 'react';

interface AiExperienceIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const AiExperienceIcon = ({
  className,
  width = 20,
  height = 20,
}: AiExperienceIconProps) => {
  const iconPath =
    '/apps/frontend-assets/technology-icons/rh-ui-icon-ai-experience-fill.svg';
  return (
    <svg width={width} height={height} className={className}>
      <image xlinkHref={iconPath} width={width} height={height} />
    </svg>
  );
};
