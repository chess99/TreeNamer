import * as monaco from 'monaco-editor';
import React, { useEffect, useRef } from 'react';
import './MonacoEditor.css';

interface MonacoEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  height?: string;
  language?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  height = '500px',
  language = 'plaintext'
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<string>(value); // Keep track of the latest value

  useEffect(() => {
    if (containerRef.current) {
      // Create editor with simple default configuration
      const editor = monaco.editor.create(containerRef.current, {
        value,
        language,
        theme: 'vs', // Use default light theme
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        folding: true,
        fontSize: 14,
        automaticLayout: true
      });
      
      editorRef.current = editor;
      
      // Listen for changes
      const changeDisposable = editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        valueRef.current = newValue;
        onChange(newValue);
      });
      
      return () => {
        changeDisposable.dispose();
        editor.dispose();
      };
    }
  }, []);
  
  // Handle value updates from outside
  useEffect(() => {
    if (editorRef.current && value !== valueRef.current) {
      const editor = editorRef.current;
      
      // Save cursor position 
      const currentPosition = editor.getPosition();
      
      // Update value
      editor.setValue(value);
      valueRef.current = value;
      
      // Restore cursor position
      if (currentPosition) {
        editor.setPosition(currentPosition);
      }
    }
  }, [value]);

  return (
    <div 
      ref={containerRef} 
      className="monaco-editor-container" 
      style={{ height }}
    />
  );
};

export default MonacoEditor; 