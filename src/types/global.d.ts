// Type definitions for external modules
import * as Monaco from 'monaco-editor';

// Monaco Editor
declare global {
  interface Window {
    MonacoEnvironment?: any;
  }
}

declare module 'monaco-editor' {
  export interface IStandaloneDiffEditor extends Monaco.editor.IStandaloneDiffEditor {
    getLineChanges(): Array<{
      originalStartLineNumber: number;
      originalEndLineNumber: number;
      modifiedStartLineNumber: number;
      modifiedEndLineNumber: number;
    }> | null;
  }
}

// Tauri API type augmentation
declare module '@tauri-apps/api/core' {
  export function invoke<T = any>(command: string, args?: Record<string, unknown>): Promise<T>;
}

declare module '@tauri-apps/plugin-dialog' {
  export interface OpenOptions {
    directory?: boolean;
    multiple?: boolean;
    title?: string;
    defaultPath?: string;
    filters?: {
      name: string;
      extensions: string[];
    }[];
  }
  
  export interface ConfirmOptions {
    title?: string;
    type?: string;
    kind?: 'info' | 'warning' | 'error';
    okLabel?: string;
    cancelLabel?: string;
  }
  
  export function open(options?: OpenOptions): Promise<string | string[] | null>;
  export function save(options?: Omit<OpenOptions, 'multiple' | 'directory'>): Promise<string | null>;
  export function confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
  export function message(message: string, options?: Omit<ConfirmOptions, 'cancelLabel'>): Promise<void>;
} 