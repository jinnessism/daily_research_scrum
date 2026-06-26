'use client';

import { useState } from 'react';
import AutogradGraphDemo from '@/components/viz/AutogradGraphDemo';
import GradientDescentDemo from '@/components/viz/GradientDescentDemo';
import ActivationPlot from '@/components/viz/ActivationPlot';
import NetworkView from '@/components/viz/NetworkView';
import ConvDemo from '@/components/viz/ConvDemo';

const TABS = [
  { id: 'autograd', label: 'Autograd graph', el: <AutogradGraphDemo /> },
  { id: 'gd', label: 'Gradient descent', el: <GradientDescentDemo /> },
  { id: 'act', label: 'Activations', el: <ActivationPlot /> },
  { id: 'conv', label: 'Convolution', el: <ConvDemo /> },
  { id: 'arch', label: 'Architecture', el: <NetworkView /> },
];

export default function VisualizePage() {
  const [tab, setTab] = useState('autograd');
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div>
      <h1 className="text-3xl font-bold">Visualize</h1>
      <p className="mt-2 text-white/70">
        Interactive demos of the core ideas — all computed live in your browser.
      </p>

      <div className="mt-5 flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              t.id === tab
                ? 'bg-torch/20 text-torch-light'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">{active.el}</div>
    </div>
  );
}
