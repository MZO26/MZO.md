import { getElement } from "@/utils/helpers";

const displayElement = getElement<HTMLDivElement>("#datetime-display");

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

function updateDateTime() {
  if (!displayElement) return;
  const now = new Date();
  const dateString = dateFormatter.format(now);
  const timeString = timeFormatter.format(now);
  displayElement.textContent = `${dateString} - ${timeString}`;
}

function formatNoteDate(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

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

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    updateDateTime();
  }
});

export { formatNoteDate, startAppClock };
