import type { Meta, StoryObj } from '@storybook/react';
import MarkdownContent from './MarkdownContent';

const meta: Meta<typeof MarkdownContent> = {
  title: 'Shared/UI/MarkdownContent',
  component: MarkdownContent,
  decorators: [
    (Story) => (
      <div className="max-w-xl p-6 bg-[#0e0e16] rounded-2xl border border-white/10 text-white">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MarkdownContent>;

export const RichPostExample: Story = {
  args: {
    content: `# Welcome to Social Media Markdown! 🚀

We now support rich formatting, including **bold**, *italic*, and ~~strikethrough~~ text!

> "Code is like humor. When you have to explain it, it’s bad." – Cory House

### Features:
- Mention users like @alexmercer or tag topics with #coding
- Spoiler protection: ||This is a secret surprise!||
- Tables and inline code like \`const answer = 42;\`

| Feature | Support | Status |
| :--- | :---: | ---: |
| Syntax Highlighting | ✅ | Live |
| Live Sandboxes | ⚡ | Active |
| Safe Isolation | 🛡️ | Secured |

\`\`\`tsx
export function HeroBanner({ title }: { title: string }) {
  return (
    <div className="p-4 rounded-xl bg-purple-600/30 border border-purple-400">
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
  );
}
\`\`\`
`,
  },
};

export const SpoilersAndInlineCode: Story = {
  args: {
    content: `Check out this spoiler: ||The ending of the movie was completely unexpected!||
    
You can also run \`npm run build\` to verify production bundles.`,
  },
};

export const DiscordFormattingCheatSheet: Story = {
  args: {
    content: `# Discord Text Formatting Demo

*Italics* or _Italics_
**Bold text**
***Bold Italics***
__Underline text__
__*Underline Italics*__
__**Underline Bold**__
__***Underline Bold Italics***__
~~Strikethrough~~

## Headers Support
### Even Smaller Header

-# This is a small muted subtext message

[Masked Link to GitHub](https://github.com)

- Bullet item 1
- Bullet item 2
  - Sub-item with indentation
`,
  },
};
