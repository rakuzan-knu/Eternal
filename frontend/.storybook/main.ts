import type { StorybookConfig } from '@storybook/react-vite';
import { fileURLToPath } from 'url';

const srcDir = fileURLToPath(new URL('../src', import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  staticDirs: ['../public'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  viteFinal: async (config) => {
    if (config.plugins) {
      config.plugins = config.plugins.filter((plugin) => {
        if (!plugin || typeof plugin !== 'object') return true;
        const p = plugin as { name?: string };
        return p.name !== 'tailwindcss' && p.name !== '@tailwindcss/vite';
      });
    }
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': srcDir,
    };
    return config;
  },
};

export default config;
