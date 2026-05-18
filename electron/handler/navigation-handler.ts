import { app, net, protocol, shell, type BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

function registerCustomProtocol() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "appimg",
      privileges: {
        standard: true, // tells chrome to look at theme like it looks at http:// or https:// and unlocks file-system API
        secure: true, // tells chrome it's as secure as https://
        supportFetchAPI: true, // for editor to fetch image data
        stream: true,
      },
    },
  ]);
}

async function setupLocalImageProtocol() {
  const imagesDir = path.join(app.getPath("userData"), "editor-images");
  protocol.handle("appimg", async (request) => {
    // remove the appimg:// prefix
    let pathPart = request.url.replace(/^appimg:\/+/i, "");
    // remove trailing slashes
    pathPart = pathPart.replace(/\/+$/, "");
    const fileName = decodeURIComponent(pathPart);
    const filePath = path.normalize(path.join(imagesDir, fileName));
    if (!filePath.startsWith(imagesDir)) {
      return new Response("Forbidden", { status: 403 });
    }
    try {
      const fileUrl = pathToFileURL(filePath).toString();
      const result = await net.fetch(fileUrl);
      if (!result.ok) throw new Error("File not found");
      return result;
    } catch {
      return new Response(null, { status: 204 });
    }
  });
}

function processUrl(url: string, preventDefault?: () => void) {
  // preventDefault if electron is trying to load url inside of the app. This will stop it and allow for the definition of a custom action
  try {
    const parsedUrl = new URL(url);
    const isLocalhost =
      parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1"; // allow local host. Together with vite port it creates: http://127.0.0.1:5173
    const isWebProtocol =
      parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    const isCustomAppProtocol = parsedUrl.protocol === "appimg:";

    let isSafeLocalFile = false;

    if (parsedUrl.protocol === "file:") {
      // creates file path out of URL
      const requestedPath = path.resolve(fileURLToPath(url));
      // creates absolute path of the apps directory
      const appDir = app.getAppPath();
      // if requested path doesn't align with app directory, local file gets marked as unsafe and doesn't pass check
      isSafeLocalFile = requestedPath.startsWith(appDir);
    }
    if (isWebProtocol && !isLocalhost) {
      if (preventDefault) preventDefault();
      shell.openExternal(url);
      return;
      // this means protocol is valid but electron shouldn't open it in its window. Instead it hands off the URL to the os to open it with users default browser
    }
    if (
      (isWebProtocol && isLocalhost) ||
      isSafeLocalFile ||
      isCustomAppProtocol
    ) {
      return;
    }
    if (preventDefault) preventDefault();
    console.warn(`Blocked dangerous protocol: ${parsedUrl.protocol}`);
  } catch (error) {
    if (preventDefault) preventDefault();
    console.error(`Blocked invalid URL: ${url}`);
  }
}

function navigationHandler(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    processUrl(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (e, url) => {
    processUrl(url, () => e.preventDefault());
  });

  win.webContents.on("will-redirect", (e, url) => {
    processUrl(url, () => e.preventDefault());
  });
  win.webContents.on("will-frame-navigate", (e) => {
    if (!e.isMainFrame) {
      processUrl(e.url, () => e.preventDefault());
    }
  });
  win.webContents.session.on("will-download", (e, item) => {
    e.preventDefault();
    console.log(`Blocked attempt to download: ${item.getURL()}`);
  });
  win.webContents.on("will-attach-webview", (e) => {
    e.preventDefault();
  });
}

export { navigationHandler, registerCustomProtocol, setupLocalImageProtocol };
