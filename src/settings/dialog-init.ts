function confirmWithDialog(
  dialog: HTMLDialogElement,
  titleEl: HTMLElement,
  title: string,
) {
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

function createMutex<T>() {
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
  async function runExclusive(fn: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
  return { acquire, release, runExclusive };
}

const dialogMutex = createMutex();

export { confirmWithDialog, dialogMutex };
