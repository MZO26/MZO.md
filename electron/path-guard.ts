import fs from "fs";
import path from "path";

export function isSafePath(
  selectedPath: string,
  allowedFolder: string,
): boolean {
  try {
    // if it's a new file, check the parent directory instead
    const pathToCheck = fs.existsSync(selectedPath)
      ? selectedPath
      : path.dirname(selectedPath);

    // asks the OS for the physical location
    const realSelected = fs.realpathSync(pathToCheck);
    const realAllowed = fs.realpathSync(allowedFolder);

    // case sensitivity for windows and macOS
    const isWindowsOrMac =
      process.platform === "win32" || process.platform === "darwin";
    let normalizedSelected = realSelected;
    let normalizedAllowed = realAllowed;

    if (isWindowsOrMac) {
      normalizedSelected = normalizedSelected.toLowerCase();
      normalizedAllowed = normalizedAllowed.toLowerCase();
    }

    // 4. Secure string comparison with trailing separator
    const folderWithTrailingSep = normalizedAllowed.endsWith(path.sep)
      ? normalizedAllowed
      : normalizedAllowed + path.sep;

    return (
      normalizedSelected === normalizedAllowed ||
      normalizedSelected.startsWith(folderWithTrailingSep)
    );
  } catch (error) {
    console.error("Path validation error:", error);
    return false;
  }
}
