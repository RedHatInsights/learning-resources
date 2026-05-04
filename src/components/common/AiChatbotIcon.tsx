import React from 'react';

interface AiChatbotIconProps {
  className?: string;
  width?: number;
  height?: number;
}

export const AiChatbotIcon = ({
  className,
  width = 20,
  height = 20,
}: AiChatbotIconProps) => {
  const iconPath =
    '/apps/frontend-assets/technology-icons/rh-ui-icon-ai-chatbot.svg';
  return (
    <svg width={width} height={height} className={className}>
      <image xlinkHref={iconPath} width={width} height={height} />
    </svg>
  );
};
