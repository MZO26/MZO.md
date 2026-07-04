import { app, session, type WebContents } from "electron";

const allowedPermissions = [
  "clipboard-read",
  "clipboard-sanitized-write",
  "fullscreen",
  "notifications",
];

const isDev = !app.isPackaged;

const csp =
  [
    "default-src 'none'",
    `script-src 'self' ${isDev ? "http://localhost:5173" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: appimg:",
    `connect-src 'self' ${isDev ? "http://localhost:5173 ws://localhost:5173" : ""}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-src 'none'",
  ].join("; ") + ";";

function setPermissions() {
  const s = session.defaultSession;
  s.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });
  s.setPermissionRequestHandler(
    (
      _webContents: WebContents,
      permission: string,
      callback: (isAllowed: boolean) => void,
      _details: Electron.PermissionCheckHandlerHandlerDetails,
    ) => {
      if (allowedPermissions.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    },
  );

  s.setPermissionCheckHandler(
    (
      _webContents: WebContents | null,
      permission: string,
      _requestingOrigin: string,
      _details: Electron.PermissionCheckHandlerHandlerDetails,
    ): boolean => {
      if (allowedPermissions.includes(permission)) {
        return true;
      }
      return false;
    },
  );
}

export { setPermissions };
