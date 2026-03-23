import type { Editor } from "@tiptap/core";
import { getElement } from "../utils/helpers";

const setupToolbar = (editor: Editor) => {
  const btnUndo = getElement<HTMLButtonElement>("#btn-undo");
  const btnRedo = getElement<HTMLButtonElement>("#btn-redo");

  const btnBold = getElement<HTMLButtonElement>("#btn-bold");
  const btnItalic = getElement<HTMLButtonElement>("#btn-italic");
  const btnStrike = getElement<HTMLButtonElement>("#btn-strike");

  const btnH1 = getElement<HTMLButtonElement>("#btn-h1");
  const btnH2 = getElement<HTMLButtonElement>("#btn-h2");
  const btnH3 = getElement<HTMLButtonElement>("#btn-h3");

  const btnBullet = getElement<HTMLButtonElement>("#btn-bullet");
  const btnOrdered = getElement<HTMLButtonElement>("#btn-ordered");
  const btnQuote = getElement<HTMLButtonElement>("#btn-quote");
  const btnCodeBlock = getElement<HTMLButtonElement>("#btn-codeblock");
  const btnHr = getElement<HTMLButtonElement>("#btn-hr");

  const btnUnderline = getElement<HTMLButtonElement>("#btn-underline");
  const btnHighlight = getElement<HTMLButtonElement>("#btn-highlight");
  const btnTable = getElement<HTMLButtonElement>("#btn-table");

  btnUndo.addEventListener("click", () => editor.chain().focus().undo().run());
  btnRedo.addEventListener("click", () => editor.chain().focus().redo().run());

  btnBold.addEventListener("click", () =>
    editor.chain().focus().toggleBold().run(),
  );
  btnItalic.addEventListener("click", () =>
    editor.chain().focus().toggleItalic().run(),
  );
  btnStrike.addEventListener("click", () =>
    editor.chain().focus().toggleStrike().run(),
  );
  btnH1.addEventListener("click", () =>
    editor.chain().focus().toggleHeading({ level: 1 }).run(),
  );
  btnH2.addEventListener("click", () =>
    editor.chain().focus().toggleHeading({ level: 2 }).run(),
  );
  btnH3.addEventListener("click", () =>
    editor.chain().focus().toggleHeading({ level: 3 }).run(),
  );

  btnBullet.addEventListener("click", () =>
    editor.chain().focus().toggleBulletList().run(),
  );
  btnOrdered.addEventListener("click", () =>
    editor.chain().focus().toggleOrderedList().run(),
  );
  btnQuote.addEventListener("click", () =>
    editor.chain().focus().toggleBlockquote().run(),
  );
  btnCodeBlock.addEventListener("click", () =>
    editor.chain().focus().toggleCodeBlock().run(),
  );
  btnHr.addEventListener("click", () =>
    editor.chain().focus().setHorizontalRule().run(),
  );
  btnUnderline.addEventListener("click", () =>
    editor.chain().focus().toggleUnderline().run(),
  );

  btnHighlight.addEventListener("click", () =>
    editor.chain().focus().toggleHighlight().run(),
  );

  btnTable.addEventListener("click", () =>
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run(),
  );

  editor.on("transaction", () => {
    if (btnUndo) btnUndo.disabled = !editor.can().undo();
    if (btnRedo) btnRedo.disabled = !editor.can().redo();

    btnBold.classList.toggle("is-active", editor.isActive("bold"));
    btnItalic.classList.toggle("is-active", editor.isActive("italic"));
    btnStrike.classList.toggle("is-active", editor.isActive("strike"));

    btnH1.classList.toggle(
      "is-active",
      editor.isActive("heading", { level: 1 }),
    );
    btnH2.classList.toggle(
      "is-active",
      editor.isActive("heading", { level: 2 }),
    );
    btnH3.classList.toggle(
      "is-active",
      editor.isActive("heading", { level: 3 }),
    );

    btnBullet.classList.toggle("is-active", editor.isActive("bulletList"));
    btnOrdered.classList.toggle("is-active", editor.isActive("orderedList"));
    btnQuote.classList.toggle("is-active", editor.isActive("blockquote"));
    btnCodeBlock.classList.toggle("is-active", editor.isActive("codeBlock"));
    btnUnderline.classList.toggle("is-active", editor.isActive("underline"));
    btnHighlight.classList.toggle("is-active", editor.isActive("highlight"));
    btnTable.classList.toggle("is-active", editor.isActive("table"));
  });
};

export { setupToolbar };
