'use client';

import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

export default function CodeEditor({
  value,
  onChange,
  minHeight = '180px',
}: {
  value: string;
  onChange: (v: string) => void;
  minHeight?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={oneDark}
        extensions={[python()]}
        minHeight={minHeight}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: false,
          autocompletion: false,
        }}
      />
    </div>
  );
}
