import type { Meta, StoryObj } from '@storybook/react';
import { designTokens } from '@social-network/shared-ui-primitives';

function TypographyReference() {
  return (
    <main className="min-h-screen bg-[#070709] text-white p-4 space-y-5 break-words">
      <h1 className="text-2xl font-bold">System typography</h1>
      <p className="text-sm text-gray-400">
        OS fonts, Cyrillic and emoji fallback; no remote font request.
      </p>
      {[400, 500, 600, 700].map((weight) => (
        <section key={weight} className="space-y-2 border border-white/10 rounded-2xl p-4">
          <h2 className="text-sm text-gray-400">Weight {weight}</h2>
          <p className="text-base" style={{ fontWeight: weight }}>
            Українська: і ї є ґ І Ї Є Ґ. Русский: ё й щ ы э. English: Aa Bb 0123456789.
          </p>
          <p className="text-base" style={{ fontWeight: weight }}>
            👩🏽‍💻 👨‍👩‍👧‍👦 🇺🇦 🌍 — emoji sequences
          </p>
        </section>
      ))}
      <p className="font-mono text-sm">Monospace: const message = 'Привіт 👋';</p>
      <p className="font-serif text-lg">Serif fallback: Eternal — Вітаємо — Добро пожаловать</p>
    </main>
  );
}

const meta = {
  title: 'Design/Typography',
  component: TypographyReference,
  parameters: { layout: 'fullscreen', typography: designTokens.typography.familyWeb },
} satisfies Meta<typeof TypographyReference>;
export default meta;
type Story = StoryObj<typeof meta>;
export const System: Story = {};
