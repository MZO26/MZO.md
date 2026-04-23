import Store from "electron-store";
import z from "zod";
import { StoreSchema, type Settings } from "../shared/schemas/storeSchema";

export const store = new Store<Settings>();

function validateStore() {
  const data = store.store;
  const validatedData = StoreSchema.safeParse(data);
  if (!validatedData.success) {
    console.warn("Error: ", z.treeifyError(validatedData.error));
    const safeData = StoreSchema.parse({});
    store.store = safeData;
  } else {
    store.store = validatedData.data;
  }
}

validateStore();
