import { configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit'
import editorReducer from './editorSlice'
import zedTerminalReducer from './zedTerminalSlice'
import liveCheckReducer from './liveCheckSlice'
import validationReducer from './validationSlice'

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    terminal: zedTerminalReducer,
    liveCheck: liveCheckReducer,
    validation: validationReducer,
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
// NOTE: The third type arg is for ExtraArgument, which you can use for injecting services etc into
// the thunk middleware.
// https://redux.js.org/usage/writing-logic-thunks#injecting-config-values-into-thunks
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, undefined, UnknownAction>
