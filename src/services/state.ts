let activeID: string | null = null;

const getNoteId = () => activeID;

const setNoteId = (id: string | null) => {
  activeID = id;
};

export { getNoteId, setNoteId };
