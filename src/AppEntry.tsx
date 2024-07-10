import React from 'react';
import { Viewer } from './Viewer';

const AppEntry = (props: { bundle: string }) => <Viewer {...props} />;

export default AppEntry;
