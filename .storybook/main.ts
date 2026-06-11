import type { StorybookConfig } from '@storybook/react-webpack5';
import remarkGfm from 'remark-gfm';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/docs/*.mdx', '../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-webpack5-compiler-swc',
    {
      name: '@storybook/addon-docs',
      options: {
        mdxPluginOptions: {
          mdxCompileOptions: {
            remarkPlugins: [remarkGfm],
          },
        },
      },
    },
    'msw-storybook-addon',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    defaultName: 'Documentation',
  },
  webpackFinal: async (config) => {
    // Mock external dependencies for Storybook (same pattern as insights-rbac-ui)
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        // External dependency mocks
        '@redhat-cloud-services/frontend-components/useChrome': path.resolve(
          process.cwd(),
          '.storybook/hooks/useChrome.tsx'
        ),
        '@unleash/proxy-client-react': path.resolve(
          process.cwd(),
          '.storybook/hooks/unleash.js'
        ),
        '@scalprum/react-core': path.resolve(
          process.cwd(),
          '.storybook/hooks/scalprum.js'
        ),
      },
    };

    // Add SCSS support
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    // Add SCSS rule
    config.module.rules.push({
      test: /\.s[ac]ss$/i,
      use: ['style-loader', 'css-loader', 'sass-loader'],
    });

    return config;
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  staticDirs: ['../public'],
};

export default config;
