export {};
import { Note } from "../shared/types";

declare module "*.css";

interface IpcResponse<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

declare global {
  interface Window {
    api: {
      openFile: () => Promise<{ path: string; content: string } | null>;
      saveFile: (data: {
        path: string | null;
        content: string;
      }) => Promise<string | boolean>;
    };
    electronAPI: {
      getTheme: () => Promise<IpcResponse<Theme>>;
      setTheme: (theme: Theme) => Promise<IpcResponse<Theme>>;
      onThemeChanged: (
        callback: (response: IpcResponse<Theme>) => void,
      ) => void;
    };
    noteAPI: {
      getAll: () => Promise<IpcResponse<Note[]>>;
      getById: (id: string) => Promise<IpcResponse<Note>>;
      create: (
        title: string,
        content: string,
        tags?: string[],
      ) => Promise<IpcResponse<Note>>;
      update: (
        id: string,
        title: string,
        content: string,
        tags?: string[],
      ) => Promise<IpcResponse<boolean>>;
      delete: (id: string) => Promise<IpcResponse<boolean>>;
    };
  }
}
