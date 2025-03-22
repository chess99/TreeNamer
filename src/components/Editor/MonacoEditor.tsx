import * as monaco from 'monaco-editor';
import React, { useEffect, useRef } from 'react';
import './MonacoEditor.css';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  language?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  height = '500px',
  language = 'plaintext'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      // 创建编辑器
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value,
        language,
        theme: 'vs', // 可以使用'vs', 'vs-dark'或'hc-black'
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        glyphMargin: false,
      });

      // 监听内容变更事件
      monacoEditorRef.current.onDidChangeModelContent(() => {
        if (monacoEditorRef.current) {
          const newValue = monacoEditorRef.current.getValue();
          onChange(newValue);
        }
      });

      // 销毁编辑器
      return () => {
        if (monacoEditorRef.current) {
          monacoEditorRef.current.dispose();
          monacoEditorRef.current = null;
        }
      };
    }
  }, []);

  // 当外部传入的value变化时，更新编辑器内容
  useEffect(() => {
    if (monacoEditorRef.current) {
      const currentValue = monacoEditorRef.current.getValue();
      if (value !== currentValue) {
        monacoEditorRef.current.setValue(value);
      }
    }
  }, [value]);

  return (
    <div 
      ref={editorRef} 
      className="monaco-editor-container" 
      style={{ height }}
    />
  );
};

export default MonacoEditor; 