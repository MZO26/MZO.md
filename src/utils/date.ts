import { findElement } from "./dom";

let displayElement: HTMLDivElement | null = null;

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
  if (!displayElement) {
    displayElement = findElement<HTMLDivElement>("#datetime-display");
  }
  if (!displayElement) {
    console.warn("Datetime display not found.");
    return;
  }
  const now = new Date();
  const dateString = dateFormatter.format(now);
  const timeString = timeFormatter.format(now);
  displayElement.textContent = `${dateString} - ${timeString}`;
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

export { startAppClock, updateDateTime };
