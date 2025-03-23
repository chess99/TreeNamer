declare module 'monaco-editor' {
  export namespace editor {
    interface IStandaloneDiffEditor extends IEditor {
      setModel(model: { original: ITextModel; modified: ITextModel }): void;
      getModel(): { original: ITextModel; modified: ITextModel } | null;
      getLineChanges(): Array<{
        originalStartLineNumber: number;
        originalEndLineNumber: number;
        modifiedStartLineNumber: number;
        modifiedEndLineNumber: number;
      }> | null;
    }

    interface IStandaloneCodeEditor extends IEditor {
      getValue(): string;
      setValue(value: string): void;
      getPosition(): IPosition | null;
      setPosition(position: IPosition): void;
      onDidChangeModelContent(listener: (e: any) => void): IDisposable;
    }

    interface IPosition {
      lineNumber: number;
      column: number;
    }

    interface IDisposable {
      dispose(): void;
    }

    interface ITextModel {
      dispose(): void;
    }

    interface IEditor {
      dispose(): void;
    }

    interface IEditorConstructionOptions {
      value?: string;
      language?: string;
      theme?: string;
      minimap?: { enabled?: boolean };
      scrollBeyondLastLine?: boolean;
      lineNumbers?: 'on' | 'off' | 'relative';
      folding?: boolean;
      fontSize?: number;
      automaticLayout?: boolean;
      readOnly?: boolean;
      contextmenu?: boolean;
      scrollbar?: {
        vertical?: string;
        horizontal?: string;
      };
      wordWrap?: 'on' | 'off';
      [key: string]: any;
    }

    function createDiffEditor(element: HTMLElement, options?: IEditorConstructionOptions): IStandaloneDiffEditor;
    function create(element: HTMLElement, options?: IEditorConstructionOptions): IStandaloneCodeEditor;
    function createModel(value: string, language?: string): ITextModel;
  }
} 