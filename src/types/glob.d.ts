export {};

declare module "*.css";
declare global {
  type Theme = "light" | "dark";
  interface Window {
    api: {
      openFile: () => Promise<{ path: string; content: string } | null>;
      saveFile: (data: {
        path: string | null;
        content: string;
      }) => Promise<string | boolean>;
    };
    electronAPI: {
      getTheme: () => Promise<Theme>;
      setTheme: (theme: Theme) => Promise<void>;
      toggleTheme: () => Promise<Theme>;
      onThemeChanged: (callback: (theme: Theme) => void) => void;
    };
    notesAPI: {
      getAll: () => Promise<Note[]>;
      create: (title: string, content: string) => Promise<string>;
      update: (id: string, title: string, content: string) => Promise<boolean>;
      delete: (id: string) => Promise<boolean>;
      getById: (id: string) => Promise<Note | undefined>;
    };
  }
}
