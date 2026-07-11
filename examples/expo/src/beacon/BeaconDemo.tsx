import { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createMockBeaconControls,
  MockBeaconProvider,
  type BeaconRegion,
  type MockBeaconControls,
} from 'react-native-beacon-kit';
import MonitorThenRangeExample from './MonitorThenRangeExample';
import TestScreen from './TestScreen';
import { initializeBeaconExample } from './beaconSetup';

// Must match TEST_REGION in TestScreen so simulated events pass the region filter.
const MOCK_REGION: BeaconRegion = {
  identifier: 'test-region',
  uuid: 'a1b23c45-d67e-9fab-de12-0034567890ab',
};

export default function BeaconDemo() {
  const [screen, setScreen] = useState<'basics' | 'monitor'>('basics');
  const [mockMode, setMockMode] = useState(false);
  const controlsRef = useRef<MockBeaconControls>(createMockBeaconControls());
  const controls = controlsRef.current;

  useEffect(() => {
    initializeBeaconExample().catch((error: unknown) => {
      console.warn('[beacon] example initialization failed', error);
    });
  }, []);

  const content =
    screen === 'basics' ? <TestScreen /> : <MonitorThenRangeExample />;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.tabs}>
        <Button
          title="Basics"
          onPress={() => setScreen('basics')}
          color={screen === 'basics' ? '#007aff' : '#aaa'}
        />
        <Button
          title="Monitor + Range"
          onPress={() => setScreen('monitor')}
          color={screen === 'monitor' ? '#007aff' : '#aaa'}
        />
        <TouchableOpacity
          style={[styles.mockToggle, mockMode && styles.mockToggleActive]}
          onPress={() => setMockMode((prev) => !prev)}
        >
          <Text
            style={[
              styles.mockToggleText,
              mockMode && styles.mockToggleTextActive,
            ]}
          >
            {mockMode ? 'Mock ON' : 'Mock OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {mockMode ? (
        <MockBeaconProvider controls={controls}>
          <View style={styles.mockControls}>
            <Text style={styles.mockLabel}>Simulate</Text>
            <View style={styles.mockRow}>
              <Button
                title="Beacon nearby"
                onPress={() =>
                  controls.simulateRanging(MOCK_REGION, [
                    {
                      uuid: MOCK_REGION.uuid,
                      major: 1,
                      minor: 2,
                      rssi: -65,
                      distance: 1.2,
                      rawDistance: 1.5,
                      txPower: -59,
                      macAddress: 'AA:BB:CC:DD:EE:FF',
                      timestamp: Date.now(),
                    },
                  ])
                }
              />
              <Button
                title="No beacons"
                onPress={() => controls.simulateRanging(MOCK_REGION, [])}
              />
            </View>
            <View style={styles.mockRow}>
              <Button
                title="Enter region"
                onPress={() => controls.simulateRegionEnter(MOCK_REGION)}
              />
              <Button
                title="Exit region"
                onPress={() => controls.simulateRegionExit(MOCK_REGION)}
              />
            </View>
          </View>
          {content}
        </MockBeaconProvider>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  mockToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#aaa',
  },
  mockToggleActive: {
    borderColor: '#f90',
    backgroundColor: '#fff8ee',
  },
  mockToggleText: { fontSize: 12, color: '#aaa' },
  mockToggleTextActive: { color: '#f90', fontWeight: '600' },
  mockControls: {
    backgroundColor: '#fffbe6',
    borderBottomWidth: 1,
    borderBottomColor: '#ffe58f',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mockLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ad6800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mockRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
});
