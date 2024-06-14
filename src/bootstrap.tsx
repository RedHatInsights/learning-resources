import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AppEntry from './AppEntry';

const container = document.getElementById('root');
function RenderApp() {
  useEffect(() => {
    container?.setAttribute('data-ouia-safe', 'true');
  });

  return <AppEntry bundle="settings" />;
}
if (container) {
  const root = createRoot(container);

  root.render(<RenderApp />);
}
