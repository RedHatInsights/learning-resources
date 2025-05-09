import React, { ButtonHTMLAttributes, ReactNode } from 'react';

const SimpleButton = ({
  type = 'button',
  children,
  icon,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
}) => {
  return (
    <button
      {...rest}
      type={type}
      className={`pf-v6-u-background-color-200 ${rest.className ?? ''}`}
      style={{ border: 'none', ...(rest.style ?? {}) }}
    >
      <span className={icon !== undefined ? 'pf-v6-u-mr-sm' : ''}>
        {children}
      </span>
      {icon}
    </button>
  );
};

export default SimpleButton;
