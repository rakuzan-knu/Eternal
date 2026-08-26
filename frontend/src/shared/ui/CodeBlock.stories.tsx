import type { Meta, StoryObj } from '@storybook/react';
import CodeBlock from './CodeBlock';

const meta: Meta<typeof CodeBlock> = {
  title: 'Shared/UI/CodeBlock',
  component: CodeBlock,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

export const TypeScriptSnippet: Story = {
  args: {
    language: 'tsx',
    value: `import React, { useState } from 'react';

interface CounterProps {
  initialCount?: number;
}

export const Counter: React.FC<CounterProps> = ({ initialCount = 0 }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-900/20 border border-purple-500/30">
      <button 
        onClick={() => setCount((c) => c - 1)}
        className="px-3 py-1 bg-white/10 rounded-lg text-white font-bold"
      >
        -
      </button>
      <span className="font-mono text-lg text-purple-300">{count}</span>
      <button 
        onClick={() => setCount((c) => c + 1)}
        className="px-3 py-1 bg-purple-600 rounded-lg text-white font-bold"
      >
        +
      </button>
    </div>
  );
};`,
  },
};

export const RunnableHtmlSandbox: Story = {
  args: {
    language: 'html',
    value: `<div class="p-6 max-w-sm mx-auto bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl shadow-xl border border-purple-500/30 text-white font-sans">
  <h2 class="text-xl font-bold text-purple-200">Interactive Card</h2>
  <p class="text-sm text-purple-300/80 mt-2">Rendered dynamically inside the safe isolated iframe sandbox.</p>
  <button onclick="console.log('Button clicked at ' + new Date().toLocaleTimeString())" class="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white font-semibold rounded-xl transition-all shadow-lg active:scale-95">
    Click for Console Log
  </button>
</div>`,
  },
};

export const LongCodeCollapsible: Story = {
  args: {
    language: 'python',
    value: `# Machine Learning Pipeline Example
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

def train_pipeline(data_path: str):
    print("Loading dataset from:", data_path)
    df = pd.read_csv(data_path)
    
    # Preprocessing
    df = df.dropna()
    X = df.drop('target', axis=1)
    y = df['target']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Model Initialization
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42
    )
    
    print("Training Random Forest model...")
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    print(classification_report(y_test, preds))
    return clf

if __name__ == "__main__":
    model = train_pipeline("dataset.csv")
    print("Pipeline finished successfully.")`,
  },
};
