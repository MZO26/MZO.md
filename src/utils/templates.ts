const noteItemTemplate = (title: string, date: string, tags: string[]) => {
  return `<div class="note-header">
                <h3 class="note-title">${title}</h3>
                <p class="note-date">${date}</p>
                <div class="note-tags">
                  ${tags.map((tag) => `<span class="tag">#${tag}</span>`).join("")}
                </div>
              </div>
              <button class="delete-btn">
                <i data-lucide="trash-2"></i>
              </button>`;
};

export { noteItemTemplate };
