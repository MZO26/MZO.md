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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatUpdatedAt(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diff < 7 * DAY) {
    const days = Math.floor(diff / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export { formatNoteDate, formatUpdatedAt, startAppClock, updateDateTime };
