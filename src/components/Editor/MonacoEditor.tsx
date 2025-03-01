import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

const MonacoEditor = ({ value, onChange, readOnly = false, height = '100%' }: MonacoEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      // Create editor instance
      monacoInstanceRef.current = monaco.editor.create(editorRef.current, {
        value,
        language: 'plaintext',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        readOnly,
        automaticLayout: true,
        wordWrap: 'off',
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs',
        fontSize: 14,
        fontFamily: 'var(--font-mono)',
      });

      // Add change event listener
      if (onChange && !readOnly) {
        monacoInstanceRef.current.onDidChangeModelContent(() => {
          const newValue = monacoInstanceRef.current?.getValue() || '';
          onChange(newValue);
        });
      }

      // Listen for theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = (e: MediaQueryListEvent) => {
        monaco.editor.setTheme(e.matches ? 'vs-dark' : 'vs');
      };
      mediaQuery.addEventListener('change', handleThemeChange);

      return () => {
        mediaQuery.removeEventListener('change', handleThemeChange);
        monacoInstanceRef.current?.dispose();
      };
    }
  }, [value, onChange, readOnly]);

  // Update editor value when prop changes
  useEffect(() => {
    if (monacoInstanceRef.current) {
      const currentValue = monacoInstanceRef.current.getValue();
      if (value !== currentValue) {
        monacoInstanceRef.current.setValue(value);
      }
    }
  }, [value]);

  return <div ref={editorRef} style={{ width: '100%', height }} />;
};

export default MonacoEditor; 