import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

const MonacoEditor = ({ 
  value, 
  onChange, 
  readOnly = false, 
  height = '100%'
}: MonacoEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Create editor instance
  useEffect(() => {
    if (editorRef.current) {
      console.log("[MonacoEditor] Creating editor instance");

      // Create editor instance with minimal configuration
      monacoInstanceRef.current = monaco.editor.create(editorRef.current, {
        value,
        language: 'plaintext',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        readOnly,
        automaticLayout: true,
        fontSize: 14,
        fontFamily: 'monospace',
        mouseStyle: 'text',
        wordWrap: 'off'
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
        console.log("[MonacoEditor] Disposing editor instance");
        mediaQuery.removeEventListener('change', handleThemeChange);
        monacoInstanceRef.current?.dispose();
      };
    }
  }, []);

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