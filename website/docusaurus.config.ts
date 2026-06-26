import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'CPM Platform',
  tagline: 'Critical Path Method Scheduling Platform',
  favicon: 'img/favicon.ico',

  // Future flags
  future: {
    v4: true,
  },

  url: 'https://dhruv-meshram.github.io',
  baseUrl: '/projects/cpm-planner.html/docs/',

  organizationName: 'dhruv-meshram',
  projectName: 'cpm',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: ['@docusaurus/theme-mermaid'],
  markdown: {
    mermaid: true,
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          exclude: [
            'cpm_engine_guide.md',
            'design.md',
            'notion-DESIGN.md',
            'notion-design.css',
            'notion-design.json'
          ],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        docsRouteBasePath: '/',
        indexBlog: false,
      },
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'CPM Platform',
      logo: {
        alt: 'CPM Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/dhruv-meshram/cpm',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/',
            },
            {
              label: 'System Architecture',
              to: '/architecture',
            },
            {
              label: 'CPM Engine',
              to: '/cpm_engine',
            },
          ],
        },
        {
          title: 'Developer Guides',
          items: [
            {
              label: 'Development Guide',
              to: '/development-guide',
            },
            {
              label: 'API Reference',
              to: '/api',
            },
            {
              label: 'Deployment',
              to: '/deployment',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub Repository',
              href: 'https://github.com/dhruv-meshram/cpm',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} CPM Project Management. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
