import { StoreSchema, type AppSettings } from "@shared/schemas/store-schema";
import Store from "electron-store";
import z from "zod";

export const store = new Store<AppSettings>();

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
