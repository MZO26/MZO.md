declare module "tinykeys" {
  export interface KeyBindingMap {
    [key: string]: (e: KeyboardEvent) => void;
  }

  export interface TinyKeysOptions {
    e?: "keydown" | "keyup";
  }

  export function tinykeys(
    target: Window | HTMLElement,
    bindings: KeyBindingMap,
    options?: TinyKeysOptions,
  ): () => void;
}
