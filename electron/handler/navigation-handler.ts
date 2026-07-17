import { app, net, protocol, shell, type BrowserWindow } from "electron";
import fs from "fs";
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
  let realImagesDir = "";
  try {
    fs.mkdirSync(imagesDir, { recursive: true });
    realImagesDir = fs.realpathSync(imagesDir);
  } catch (setupError) {
    console.warn(
      "Failed to initialize image directory. Images will not load.",
      setupError,
    );
    // Register a fallback protocol handler that returns a 500 error for all requests
    protocol.handle("appimg", () => {
      return new Response("Image system disabled due to startup error", {
        status: 500,
      });
    });
    return;
  }
  // Standard protocol handler for appimg: URLs
  protocol.handle("appimg", async (request) => {
    try {
      let pathPart = request.url.replace(/^appimg:\/+/i, "");
      pathPart = pathPart.replace(/\/+$/, "");
      const fileName = decodeURIComponent(pathPart);
      const intendedPath = path.resolve(realImagesDir, fileName);
      const realFilePath = await fs.promises.realpath(intendedPath);
      const relative = path.relative(realImagesDir, realFilePath);
      const isOutside =
        relative === ".." ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative);
      if (isOutside) {
        return new Response("Forbidden", { status: 403 });
      }
      const fileUrl = pathToFileURL(realFilePath).toString();
      const result = await net.fetch(fileUrl);
      if (!result.ok) {
        return new Response("Image not fetchable", { status: 404 });
      }
      return result;
    } catch (error) {
      return new Response("Image not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }
  });
}

type UrlDecision = "allow" | "block" | "external";

function processUrl(url: string): UrlDecision {
  try {
    const parsedUrl = new URL(url);
    const isLocalhost =
      parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";
    const isWebProtocol =
      parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    const isCustomAppProtocol = parsedUrl.protocol === "appimg:";
    let isSafeLocalFile = false;
    if (parsedUrl.protocol === "file:") {
      const requestedPath = path.resolve(fileURLToPath(url));
      const appDir = path.resolve(app.getAppPath());
      const relative = path.relative(appDir, requestedPath);
      const isOutside =
        relative === ".." ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative);
      isSafeLocalFile = !isOutside;
    }
    if (isWebProtocol && !isLocalhost) {
      return "external";
    }
    if (
      (isWebProtocol && isLocalhost) ||
      isSafeLocalFile ||
      isCustomAppProtocol
    ) {
      return "allow";
    }
    console.warn(
      `[processUrl]: Blocked dangerous protocol: ${parsedUrl.protocol}`,
    );
    return "block";
  } catch {
    console.error(`[processUrl]: Blocked invalid URL: ${url}`);
    return "block";
  }
}

function navigationHandler(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    const decision = processUrl(url);
    if (decision === "external") {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (e, url) => {
    const decision = processUrl(url);
    if (decision === "external") {
      e.preventDefault();
      void shell.openExternal(url);
      return;
    }
    if (decision === "block") {
      e.preventDefault();
    }
  });

  win.webContents.on("will-redirect", (e, url) => {
    const decision = processUrl(url);
    if (decision === "external") {
      e.preventDefault();
      void shell.openExternal(url);
      return;
    }
    if (decision === "block") {
      e.preventDefault();
    }
  });

  win.webContents.on("will-frame-navigate", (e) => {
    if (!e.isMainFrame) {
      const decision = processUrl(e.url);
      if (decision === "external") {
        e.preventDefault();
        void shell.openExternal(e.url);
        return;
      }

      if (decision === "block") {
        e.preventDefault();
      }
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
export {
  navigationHandler,
  processUrl,
  registerCustomProtocol,
  setupLocalImageProtocol,
};
