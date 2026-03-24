import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type EditorState = {
  schema: string;
  expectedRelations: string;
  relationships: string;
  assertions: string;
}

const initialState: EditorState = {
  schema: `definition user {}

/**
 * resource is an example resource.
 */
definition resource {
    relation writer: user
    relation viewer: user

    permission write = writer
    permission view = viewer + writer
}`,
  expectedRelations: "",
  relationships: `// Some example relationships
resource:someresource#viewer@user:somegal
resource:someresource#writer@user:anotherguy
resource:anotherresource#writer@user:somegal`,
  assertions: `assertTrue:
  - resource:someresource#view@user:somegal
  - resource:someresource#view@user:anotherguy
  - resource:someresource#write@user:anotherguy
assertFalse:
  - resource:someresource#write@user:somegal`,
}

export const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    schemaUpdated: (state, action: PayloadAction<string>) => { state.schema = action.payload },
    expectedRelationsUpdated: (state, action: PayloadAction<string>) => { state.expectedRelations = action.payload },
    relationshipsUpdated: (state, action: PayloadAction<string>) => { state.relationships = action.payload },
    assertionsUpdated: (state, action: PayloadAction<string>) => { state.assertions = action.payload },
    yamlLoaded: (_, action: PayloadAction<EditorState>) => action.payload,
  }
})

export const { schemaUpdated, expectedRelationsUpdated, relationshipsUpdated, assertionsUpdated, yamlLoaded } = editorSlice.actions
export default editorSlice.reducer
