import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import ProceduralChatBackground from './ProceduralChatBackground';
import { GlassCard } from '../../../shared/ui/GlassCard';
import { initializeVisualEffects, useVisualEffects } from '../../../shared/model/useVisualEffects';

function Comparison() {
  useEffect(initializeVisualEffects, []);
  const simplified = useVisualEffects((state) => state.simplified);
  const setSimplified = useVisualEffects((state) => state.setSimplified);
  return (
    <main className="relative min-h-screen bg-[#070709] text-white p-8">
      <ProceduralChatBackground shaderId="cosmic-aurora" />
      <div className="relative mx-auto max-w-lg space-y-4">
        <button
          type="button"
          aria-pressed={simplified}
          onClick={() => setSimplified(!simplified)}
          className="min-h-11 bg-neutral-900 rounded-xl px-4"
        >
          Simplify visual effects
        </button>
        {[1, 2, 3].map((item) => (
          <GlassCard key={item}>
            <h2 className="text-xl font-bold">Glass panel {item}</h2>
            <p>Українська, русский, English 👩🏽‍💻. Shader and glass comparison.</p>
          </GlassCard>
        ))}
      </div>
    </main>
  );
}
const meta = {
  title: 'Design/Visual effects',
  component: Comparison,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Comparison>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Effects: Story = {};
