import { act } from '@testing-library/react';
import { useUIStore } from '../shared/model/useUIStore';

const initialState = useUIStore.getState();

export function resetUIStore() {
  act(() => {
    useUIStore.setState(initialState, true);
  });
}
