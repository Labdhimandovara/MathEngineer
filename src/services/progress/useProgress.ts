import { useState, useEffect } from 'react';
import { StudentProgressState } from './progressTypes.ts';
import { loadProgress, subscribeProgress } from './progressStore.ts';

export function useProgress(): StudentProgressState {
  const [state, setState] = useState<StudentProgressState>(loadProgress);

  useEffect(() => {
    setState(loadProgress());
    return subscribeProgress((newState) => {
      setState(newState);
    });
  }, []);

  return state;
}
