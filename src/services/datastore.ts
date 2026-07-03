import { useRef } from "react";
import sjcl from "sjcl";
import { v4 as uuidv4 } from "uuid";
import yaml from "yaml";

import { ParsedValidation } from "../spicedb-common/validationfileformat";

// NOTE: Remember to set lineWidth to 0 for yaml.stringify. Important to prevent string folding.

/**
 * DataStorePaths defines functions for mapping from names to the associated
 * URL path for a specific section stored in the datastore.
 */
export const DataStorePaths = {
  Schema: () => "/schema",
  Relationships: () => "/relationships",
  Assertions: () => "/assertions",
  ExpectedRelations: () => "/expected",
};

export enum DataStoreItemKind {
  SCHEMA = 0,
  RELATIONSHIPS = 1,
  EXPECTED_RELATIONS = 2,
  ASSERTIONS = 3,
}

type ID = string;

export interface DataStoreItem {
  id: ID;
  kind: DataStoreItemKind;
  pathname: string;
  editableContents: string;
}

export type Baseline = {
  kind: "example" | "shared";
  identifier: string;
  hash: string;
};

interface DataStorageData {
  items: Record<ID, DataStoreItem>;
  editIndex: string;
  baseline: Baseline | null;
}

const EMPTY_STORE: DataStorageData = {
  editIndex: "",
  baseline: null,
  items: {
    [DataStorePaths.Schema()]: {
      id: "(schema)",
      kind: DataStoreItemKind.SCHEMA,
      pathname: DataStorePaths.Schema(),
      editableContents: `definition user {}

/**
 * resource is an example resource.
 */
definition resource {
    relation writer: user
    relation viewer: user

    permission write = writer
    permission view = viewer + writer
}
`,
    },
    [DataStorePaths.ExpectedRelations()]: {
      id: "(expected)",
      kind: DataStoreItemKind.EXPECTED_RELATIONS,
      pathname: DataStorePaths.ExpectedRelations(),
      editableContents: ``,
    },
    [DataStorePaths.Relationships()]: {
      id: "(relationships)",
      kind: DataStoreItemKind.RELATIONSHIPS,
      pathname: DataStorePaths.Relationships(),
      editableContents: `// Some example relationships
resource:someresource#viewer@user:somegal
resource:someresource#writer@user:anotherguy
resource:anotherresource#writer@user:somegal`,
    },
    [DataStorePaths.Assertions()]: {
      id: "(asserts)",
      kind: DataStoreItemKind.ASSERTIONS,
      pathname: DataStorePaths.Assertions(),
      editableContents: `assertTrue:
  - resource:someresource#view@user:somegal
  - resource:someresource#view@user:anotherguy
  - resource:someresource#write@user:anotherguy
assertFalse:
  - resource:someresource#write@user:somegal`,
    },
  },
};

export type ListenerCallback = (index: string) => void;
export type RemovalCallback = () => void;

/**
 * DataStore defines the storage layer for data in the playground.
 */
export abstract class DataStore {
  abstract getStored(): DataStorageData;
  abstract setStored(data: DataStorageData): void;
  abstract isOutOfDate(): boolean;
  abstract isPopulated(): boolean;

  private listeners: Record<string, ListenerCallback> = {};

  protected setStoredAndReport(data: DataStorageData): void {
    this.setStored(data);
    const editIndex = this.getStored().editIndex;

    Object.values(this.listeners).forEach((callback: ListenerCallback) => {
      callback(editIndex);
    });
  }

  /**
   * registerListener registers a listener callback to be invoked whenever the
   * datastore's contents have changed.
   * @param callback The callback to be invoked on change.
   * @returns A callback to invoke to remove the listener.
   */
  public registerListener(callback: ListenerCallback): RemovalCallback {
    const key = uuidv4();
    this.listeners[key] = callback;
    return () => {
      delete this.listeners[key];
    };
  }

  /**
   * currentIndex returns the current edit index for the datastore, which will
   * change whenever the datastore's data changes.
   */
  public currentIndex(): string {
    const deserialized = this.getStored();
    return deserialized.editIndex;
  }

  /**
   * getById returns the datastore item with the given ID or undefined if none.
   */
  public getById(id: string): DataStoreItem | undefined {
    const deserialized = this.getStored();
    const items = Object.values(deserialized.items);
    return items.find((item: DataStoreItem) => item.id === id);
  }

  /**
   * get returns the datastore item with the given path or undefined if none.
   */
  public get(pathname: string): DataStoreItem | undefined {
    const deserialized = this.getStored();
    const items = Object.values(deserialized.items);
    return items.find((item: DataStoreItem) => item.pathname === pathname);
  }

  /**
   * getSingletonByKind returns the single datastore item with the given kind.
   * Throws an error if not found or more than one is found.
   */
  public getSingletonByKind(kind: DataStoreItemKind): DataStoreItem {
    const deserialized = this.getStored();
    const items = Object.values(deserialized.items);
    const found = items.filter((item: DataStoreItem) => item.kind === kind);
    if (found.length !== 1) {
      throw Error("Found non-singleton");
    }
    return found[0];
  }

  /**
   * update sets the new editable contents for an existing item, updating the item's
   * path if necessary.
   * @param item The item to update.
   * @param newEditableContents The new editable contents for the item.
   * @returns The updated item, or undefined if the item was not found.
   */
  public update(item: DataStoreItem, newEditableContents: string): DataStoreItem | undefined {
    const deserialized = this.getStored();

    // Add back the new/updated item.
    const newItem = {
      ...item,
      editableContents: newEditableContents,
      pathname: item.pathname,
    };

    // For existing references.
    item.editableContents = newEditableContents;

    deserialized.items[item.pathname] = newItem;
    this.setStoredAndReport(deserialized);
    return newItem;
  }

  /**
   * load loads the given parsed data into the datastore,
   * erasing any data already existing in the store.
   */
  public load({
    schema,
    relationshipsYaml,
    assertionsYaml,
    verificationYaml,
  }: {
    schema: string;
    relationshipsYaml: string;
    assertionsYaml: string;
    verificationYaml: string;
  }) {
    // NOTE: Quick way to deep clone.
    const store: DataStorageData = JSON.parse(JSON.stringify(EMPTY_STORE));

    // Add the schema.
    store.items[DataStorePaths.Schema()].editableContents = schema;

    // Add the relationships.
    store.items[DataStorePaths.Relationships()].editableContents = relationshipsYaml;

    // Add the assertions data.
    store.items[DataStorePaths.Assertions()].editableContents = assertionsYaml ?? "";

    // Add the expected config.
    store.items[DataStorePaths.ExpectedRelations()].editableContents = verificationYaml;

    this.setStoredAndReport(store);
  }

  /**
   * loadFromParsed loads the given parsed validation data into the datastore,
   * erasing any data already existing in the store.
   */
  public loadFromParsed(p: ParsedValidation) {
    this.load({
      schema: p.schema,
      relationshipsYaml: p.relationships,
      assertionsYaml: yaml.stringify(p.assertions ?? { assertTrue: [], assertFalse: [] }, {
        lineWidth: 0,
      }),
      verificationYaml: yaml.stringify(p.validation, { lineWidth: 0 }),
    });
  }

  /**
   * computeContentHash returns a stable hash over the editable contents of all items.
   */
  public computeContentHash(): string {
    const data = this.getStored();
    const ordered = Object.values(data.items)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((item) => `${item.id}\n${item.editableContents}`)
      .join("\n---\n");
    return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(ordered));
  }

  /**
   * setBaseline marks the current contents as the "baseline" — modified detection
   * compares future contents against this baseline.
   */
  public setBaseline(kind: "example" | "shared", identifier: string): void {
    const data = this.getStored();
    data.baseline = {
      kind,
      identifier,
      hash: this.computeContentHash(),
    };
    this.setStoredAndReport(data);
  }

  /**
   * getBaseline returns the current baseline or null if none is set.
   */
  public getBaseline(): Baseline | null {
    return this.getStored().baseline;
  }

  /**
   * isModified returns true if the current contents diverge from the baseline.
   * Returns false if no baseline exists (e.g., the default seed schema).
   */
  public isModified(): boolean {
    const baseline = this.getBaseline();
    if (!baseline) return false;
    return this.computeContentHash() !== baseline.hash;
  }

  /**
   * clearBaseline removes the baseline (e.g., when resetting to the default schema).
   */
  public clearBaseline(): void {
    const data = this.getStored();
    data.baseline = null;
    this.setStoredAndReport(data);
  }
}

const LOCAL_STORAGE_DATASTORE_KEY_PREFIX = "playgrounddata";
const LOCAL_STORAGE_DATASTORE_VERSION = "0.21";
const LOCAL_STORAGE_DATASTORE_KEY = `${LOCAL_STORAGE_DATASTORE_KEY_PREFIX}-${LOCAL_STORAGE_DATASTORE_VERSION}`;

class LocalStorageDataStore extends DataStore {
  private lastStoredIndex: string | undefined = undefined;

  getStored(): DataStorageData {
    try {
      const loaded = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DATASTORE_KEY) || "null");
      if (loaded) {
        return loaded;
      }
    } catch (e) {
      console.log(e);
    }
    return EMPTY_STORE;
  }

  setStored(data: DataStorageData): void {
    data.editIndex = uuidv4();
    this.lastStoredIndex = data.editIndex;
    localStorage.setItem(LOCAL_STORAGE_DATASTORE_KEY, JSON.stringify(data));
  }

  isOutOfDate(): boolean {
    return (
      this.lastStoredIndex !== undefined && this.lastStoredIndex !== this.getStored().editIndex
    );
  }

  isPopulated(): boolean {
    return this.getStored() !== EMPTY_STORE;
  }
}

export class EphemeralDataStore extends DataStore {
  private data: DataStorageData = EMPTY_STORE;
  private wasEdited: boolean = false;

  getStored(): DataStorageData {
    return this.data;
  }

  setStored(data: DataStorageData): void {
    data.editIndex = uuidv4();
    this.data = data;
    this.wasEdited = true;
  }

  isOutOfDate(): boolean {
    return false;
  }

  isPopulated(): boolean {
    return this.wasEdited;
  }
}

/**
 * useReadonlyDatastore returns a read-only datastore, which can be loaded into
 * but otherwise not modified.
 */
export function useReadonlyDatastore(): DataStore {
  const datastoreRef = useRef(new EphemeralDataStore());
  return datastoreRef.current;
}

/**
 * usePlaygroundDatastore returns a hook for interacting with the backing datastore
 * for the playground. Data is retrieved and stored in local storage.
 * When fresh is true, an ephemeral datastore is used instead, avoiding any
 * persisted state (useful for screen sharing).
 */
export function usePlaygroundDatastore(fresh?: boolean): DataStore {
  // Only the selected store is instantiated. Constructing LocalStorageDataStore
  // in fresh mode is avoided so a fresh session never touches local storage, and
  // lazy refs avoid allocating a throwaway instance on every render.
  const storeRef = useRef<DataStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = fresh ? new EphemeralDataStore() : new LocalStorageDataStore();
  }
  return storeRef.current;
}
