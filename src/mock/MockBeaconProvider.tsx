import React from 'react';
import { BeaconContext } from '../context/BeaconContext';
import type { MockBeaconControls } from './createMockBeaconControls';

interface MockBeaconProviderProps {
  controls: MockBeaconControls;
  children: React.ReactNode;
}

export function MockBeaconProvider({
  controls,
  children,
}: MockBeaconProviderProps) {
  return (
    <BeaconContext.Provider value={controls.adapter}>
      {children}
    </BeaconContext.Provider>
  );
}
