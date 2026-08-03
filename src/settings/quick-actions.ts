import {
  databaseBackup,
  databaseBackupRestore,
  openAppPath,
  showNotification,
} from "@/api/api";
import { rendererLogger } from "@/app";
import { exportSelection } from "@/components/sidebar/sidebar-selection";
import { noteStore } from "@/state/state";
import { createGlobalSpinner } from "@/utils/ui";
import type { QuickAction } from "@shared/types";

async function getQuickAction(action: QuickAction) {
  switch (action) {
    case "open-path":
      const open = await openAppPath();
      if (!open.success) {
        rendererLogger.appError(
          "[quickActions -> open-path]: Failed to open app path:",
          open.error,
        );
        return;
      }
      break;
    case "backup-db":
      const dbBackup = await databaseBackup();
      if (!dbBackup.success) {
        rendererLogger.appError(
          "[quickActions -> backup-db]: Failed to backup db:",
          dbBackup.error,
        );
        await showNotification("Failed to save Backup", "");
        return;
      }
      await showNotification("Backup saved", "");
      return;
    case "backup-db-restore":
      const restore = await databaseBackupRestore();
      if (!restore.success) {
        rendererLogger.appError(
          "[quickActions -> backup-db-restore]: Failed to restore db:",
          restore.error,
        );
        await showNotification("Failed to restore Backup", "");
        return;
      }
      await showNotification("Backup restored", "");
      return;
    case "backup-notes":
      const allIds = noteStore.get("notes").map((n) => n.id);
      if (!Array.isArray(allIds) || allIds.length === 0) return;
      const loading = createGlobalSpinner();
      await loading.wrap(async () => {
        await exportSelection(allIds);
      });
      break;
  }
}

export { getQuickAction };
