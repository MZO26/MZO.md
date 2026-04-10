import { nativeTheme } from "electron";

type TitleBarOverlayOptions = {
  color: string;
  symbolColor: string;
  height: number;
};

nativeTheme.themeSource = "system";

function getTitleBarOverlay(): TitleBarOverlayOptions {
  let isDark = nativeTheme.shouldUseDarkColors;
  //boolean to check if the system theme is dark or light, used to set the title bar overlay colors accordingly
  return isDark === true
    ? { color: "#00000000", symbolColor: "#a1a1aa", height: 30 }
    : {
        color: "#00000000",
        symbolColor: "#71717a",
        height: 30,
      };
}

export { getTitleBarOverlay };
