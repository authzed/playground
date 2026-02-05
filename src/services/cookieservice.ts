import { useCookies } from "react-cookie";

import { DataStoreItemKind } from "./datastore";

export type EditorPosition = [number, number]; // line, column
export type ScrollLocation = [number, number]; // top, left

type EditorPositions = Record<DataStoreItemKind, EditorPosition>;
type EditorScrolls = Record<DataStoreItemKind, ScrollLocation>;

export type RelationshipsEditorType = "grid" | "code";

export interface CookieService {
  lookupEditorPosition(itemKind: DataStoreItemKind): EditorPosition | undefined;
  storeEditorPosition(itemKind: DataStoreItemKind, position: EditorPosition): void;

  lookupEditorScroll(itemKind: DataStoreItemKind): ScrollLocation | undefined;
  storeEditorScroll(itemKind: DataStoreItemKind, location: ScrollLocation): void;

  /**
   * relationshipsEditorType is the chosen type of relationship editor to display.
   */
  relationshipsEditorType: RelationshipsEditorType;
  setRelationshipsEditorType: (type: RelationshipsEditorType) => void;
}

/**
 * useCookieService is a service that provides quick access to various settings stored in cookies.
 */
export function useCookieService(): CookieService {
  const [cookies, setCookies] = useCookies(["editor-positions", "editor-scrolls", "relgrid-type"]);
  return {
    lookupEditorPosition: (itemKind: DataStoreItemKind): EditorPosition | undefined => {
      const existing: EditorPositions = cookies["editor-positions"] ?? {};
      return existing[itemKind];
    },
    storeEditorPosition: (itemKind: DataStoreItemKind, position: EditorPosition) => {
      const existing: EditorPositions = cookies["editor-positions"] ?? {};
      existing[itemKind] = position;
      setCookies("editor-positions", existing);
    },
    lookupEditorScroll: (itemKind: DataStoreItemKind): ScrollLocation | undefined => {
      const existing: EditorScrolls = cookies["editor-scrolls"] ?? {};
      return existing[itemKind];
    },
    storeEditorScroll: (itemKind: DataStoreItemKind, scrollLocation: ScrollLocation) => {
      const existing: EditorScrolls = cookies["editor-scrolls"] ?? {};
      existing[itemKind] = scrollLocation;
      setCookies("editor-scrolls", existing);
    },
    relationshipsEditorType: cookies["relgrid-type"] ?? "grid",
    setRelationshipsEditorType: (type: RelationshipsEditorType): void => {
      setCookies("relgrid-type", type);
    },
  };
}
