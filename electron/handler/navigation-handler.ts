import {
  isInsideDirectory,
  isInsideDirectorySync,
} from "@electron/fs/fs-helpers";
import { IS_DEV_MAIN, mainLogger } from "@electron/handler/permission-handler";
import { ALLOWED_PROTOCOLS, LOCALHOST_HOSTS } from "@shared/shared-constants";
import { app, net, protocol, shell, type BrowserWindow } from "electron";
import fs from "fs/promises";
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
  const imagesDir = path.join(app.getPath("userData"), "Images");
  let realImagesDir: string;
  try {
    await fs.mkdir(imagesDir, { recursive: true });
    realImagesDir = await fs.realpath(imagesDir);
  } catch (setupError) {
    mainLogger.appError(
      "Failed to initialize image directory. Images will not load.",
      setupError,
    );
    protocol.handle("appimg", () => {
      return new Response("Image system disabled due to startup error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    });
    return;
  }
  protocol.handle("appimg", async (request) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { "Content-Type": "text/plain" },
      });
    }
    const parsed = URL.parse(request.url);
    if (!parsed || parsed.protocol !== "appimg:") {
      return new Response("Bad Request", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }
    try {
      const rawRelativePath = `${parsed.hostname}${parsed.pathname}`;
      const decodedPath = decodeURIComponent(rawRelativePath).replace(
        /^[/\\]+/,
        "",
      );
      const intendedPath = path.resolve(realImagesDir, decodedPath);
      const inside = await isInsideDirectory(realImagesDir, intendedPath, {
        skipBaseRealpath: true,
      });
      if (!inside) {
        return new Response("Forbidden", {
          status: 403,
          headers: { "Content-Type": "text/plain" },
        });
      }
      return net.fetch(pathToFileURL(intendedPath).toString());
    } catch (error) {
      return new Response("Image not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }
  });
}

function processUrl(url: string) {
  const parsedUrl = URL.parse(url);
  if (!parsedUrl) {
    mainLogger.appError(`[processUrl]: Blocked invalid URL: ${url}`);
    return "block";
  }
  const { protocol, hostname } = parsedUrl;
  if (protocol === "appimg:") {
    return "allow";
  }
  if (protocol === "file:") {
    try {
      const requestedPath = path.resolve(fileURLToPath(parsedUrl));
      const appDir = path.resolve(app.getAppPath());
      if (isInsideDirectorySync(appDir, requestedPath)) {
        return "allow";
      }
    } catch {}
    mainLogger.devLog(`[processUrl]: Blocked unauthorized file access: ${url}`);
    return "block";
  }
  if (ALLOWED_PROTOCOLS.has(protocol)) {
    const isLocalhost = LOCALHOST_HOSTS.has(hostname);
    if (isLocalhost) {
      if (IS_DEV_MAIN) return "allow";
      mainLogger.devLog(
        `[processUrl]: Blocked localhost URL in production: ${url}`,
      );
      return "block";
    }
    return "external";
  }
  mainLogger.devLog(`[processUrl]: Blocked dangerous protocol: ${protocol}`);
  return "block";
}

async function navigationHandler(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    const decision = void processUrl(url);
    if (decision === "external") {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (e, url) => {
    const decision = void processUrl(url);
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
    const decision = void processUrl(url);
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
    const decision = void processUrl(e.url);
    if (decision === "external") {
      e.preventDefault();
      void shell.openExternal(e.url);
      return;
    }
    if (decision === "block") {
      e.preventDefault();
    }
  });

  win.webContents.session.on("will-download", (e, item) => {
    const url = item.getURL();
    const decision = void processUrl(url);
    if (decision === "external") {
      e.preventDefault();
      void shell.openExternal(url);
      return;
    }
    if (decision === "block") {
      e.preventDefault();
      mainLogger.devLog(`Blocked attempt to download: ${url}`);
    }
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
