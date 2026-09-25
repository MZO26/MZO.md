import { requireElement } from "@/utils/dom";

function initDeleteDialog() {
  const deleteDialog = requireElement<HTMLDialogElement>("#delete-dialog");
  return { deleteDialog };
}

function initSettingsDialog() {
  const settingsDialog = requireElement<HTMLDialogElement>(".settings-modal");
  const settingsContainer = requireElement<HTMLDivElement>(".settings-content");
  return { settingsDialog, settingsContainer };
}

function initSyncDialog() {
  const syncDialog = requireElement<HTMLDialogElement>("#sync-dialog");
  return { syncDialog };
}

function initQuickSwitchDialog() {
  const switchDialog = requireElement<HTMLDialogElement>(
    ".quick-switch-dialog",
  );
  const listEl = requireElement<HTMLDivElement>(".quick-switch-list");
  return { switchDialog, listEl };
}

function initMathDialog() {
  const mathDialog = requireElement<HTMLDialogElement>(".math-dialog");
  return { mathDialog };
}

function confirmWithDialog(
  dialog: HTMLDialogElement,
  titleEl: HTMLElement,
  title: string,
): Promise<boolean> {
  titleEl.textContent = title;
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => {
    const onClose = () => {
      titleEl.textContent = "";
      resolve(dialog.returnValue === "confirm");
    };
    dialog.addEventListener("close", onClose, { once: true });
  });
}

function createMutex() {
  let locked = false;
  const waiters: (() => void)[] = [];
  async function acquire() {
    if (!locked) {
      locked = true;
      return;
    }
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  function release() {
    const next = waiters.shift();
    if (next) next();
    else locked = false;
  }
  return { acquire, release };
}

const dialogMutex = createMutex();

async function withDialogLock<T>(fn: () => Promise<T>): Promise<T> {
  await dialogMutex.acquire();
  try {
    return await fn();
  } finally {
    dialogMutex.release();
  }
}

export const { deleteDialog } = initDeleteDialog();
export const { syncDialog } = initSyncDialog();
export const { settingsDialog, settingsContainer } = initSettingsDialog();
export const { switchDialog, listEl } = initQuickSwitchDialog();
export const { mathDialog } = initMathDialog();

export {
  confirmWithDialog,
  initDeleteDialog,
  initMathDialog,
  initQuickSwitchDialog,
  initSettingsDialog,
  initSyncDialog,
  withDialogLock,
};
