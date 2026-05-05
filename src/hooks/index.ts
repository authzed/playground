import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../store'

// These are typed wrappers around RTK hooks that give nicer handles
// on dispatch and selectors
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
