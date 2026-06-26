import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'introduction',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'development-guide',
        'glossary',
      ],
    },
    {
      type: 'category',
      label: 'System Design',
      collapsed: false,
      items: [
        'architecture',
        'tech-stack',
        'project-structure',
      ],
    },
    {
      type: 'category',
      label: 'Core Components',
      collapsed: false,
      items: [
        'frontend',
        'backend',
        'database',
        'cpm_engine',
        'state-management',
      ],
    },
    {
      type: 'category',
      label: 'Operations & Workflows',
      collapsed: false,
      items: [
        'workflows',
        'api',
        'authentication',
        'deployment',
      ],
    },
  ],
};

export default sidebars;
