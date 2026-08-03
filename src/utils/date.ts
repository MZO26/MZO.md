const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

function createDateTimeUpdater() {
  let displayElement: HTMLDivElement | null = null;
  return function updateDateTime() {
    displayElement ??=
      document.querySelector<HTMLDivElement>("#datetime-display");
    if (!displayElement) return;
    const now = new Date();
    displayElement.textContent = `${dateFormatter.format(now)} - ${timeFormatter.format(now)}`;
  };
}

const updateDateTime = createDateTimeUpdater();

function startAppClock() {
  updateDateTime();
  const now = new Date();
  const msUntilNextMinute =
    (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  setTimeout(() => {
    updateDateTime();
    setInterval(updateDateTime, 60000);
  }, msUntilNextMinute);
}

function formatNoteDate(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export { formatNoteDate, startAppClock, updateDateTime };
