import { debounce, getElement, getElementOrNull } from "../../utils/helpers";

function updateDateTime() {
  const displayElement = getElementOrNull<HTMLDivElement>("#datetime-display");

  if (displayElement) {
    const now = new Date();

    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const dateString = now.toLocaleDateString("de-DE", dateOptions);
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    const timeString = now.toLocaleTimeString("de-DE", timeOptions);
    displayElement.textContent = `${dateString} - ${timeString}`;
  }
}

const updateStats = debounce((text: string) => {
  const chars = text.match(/[\p{L}\p{N}]/gu);
  const charCount = chars ? chars.length : 0;
  const words = text.match(/[\p{L}\d]+(?:['’]\p{L}+)*/gu);
  const wordCount = words ? words.length : 0;

  const charCountEl = getElementOrNull<HTMLDivElement>("#char-count");
  if (charCountEl) {
    charCountEl.innerText = charCount.toString();
  }

  const wordCountEl = getElementOrNull<HTMLDivElement>("#word-count");
  if (wordCountEl) {
    if (wordCount === 1) {
      wordCountEl.innerText = "1 word";
    } else {
      wordCountEl.innerText = `${wordCount} words`;
    }
  }
}, 500);

function setupZoomBar() {
  const btnIn = getElement<HTMLButtonElement>("#btn-zoom-in");
  const btnOut = getElement<HTMLButtonElement>("#btn-zoom-out");
  const label = getElement<HTMLDivElement>("#zoom-level");

  const DEFAULT_ZOOM = 100;
  let currentZoom = DEFAULT_ZOOM;
  const MIN_ZOOM = 75;
  const MAX_ZOOM = 150;
  const ZOOM_STEP = 12.5;

  const applyZoom = (newZoom: number) => {
    currentZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));

    const editorEl = getElementOrNull<HTMLElement>("#editor .ProseMirror");
    if (editorEl) {
      editorEl.style.setProperty("--zoom", currentZoom.toString());
    }

    const percentage = Math.round(currentZoom);
    label.innerText = `${percentage}%`;
  };
  btnIn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    applyZoom(currentZoom + ZOOM_STEP);
  });

  btnOut.addEventListener("mousedown", (e) => {
    e.preventDefault();
    applyZoom(currentZoom - ZOOM_STEP);
  });

  label.addEventListener("mousedown", (e) => {
    e.preventDefault();
    applyZoom(DEFAULT_ZOOM);
  });
  label.style.cursor = "pointer";
}

export { setupZoomBar, updateDateTime, updateStats };
