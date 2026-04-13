/**
 * MonitorThenRangeExample
 *
 * Demonstrates the recommended hook-based background pattern:
 *   1. App-level code handles permissions + Beacon.configure()
 *   2. useMonitorThenRange() owns listeners, state, and region transitions
 *   3. The component only decides when to start or stop the workflow
 */

import { useCallback } from 'react';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { useMonitorThenRange } from 'react-native-beacon-kit';

const REGION = {
  identifier: 'my-region',
  uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
};

export default function MonitorThenRangeExample() {
  const {
    beacons,
    error,
    isActive,
    isStarting,
    isStopping,
    regionState,
    start,
    stop,
  } = useMonitorThenRange({
    region: REGION,
  });

  const handleStart = useCallback(async () => {
    try {
      await start();
    } catch {}
  }, [start]);

  const handleStop = useCallback(async () => {
    try {
      await stop();
    } catch {}
  }, [stop]);

  const lastError = error
    ? `[${error.code}] ${error.region?.identifier ? `${error.region.identifier}: ` : ''}${error.message}`
    : null;

  const stateColor =
    regionState === 'inside'
      ? '#2a2'
      : regionState === 'outside'
        ? '#a22'
        : '#888';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monitor → Range Example</Text>

      <View style={styles.stateBox}>
        <Text style={styles.stateLabel}>Region state</Text>
        <Text style={[styles.stateValue, { color: stateColor }]}>
          {regionState}
        </Text>
      </View>

      <Text style={styles.hint}>
        {regionState === 'inside'
          ? 'Inside region — ranging active'
          : regionState === 'outside'
            ? 'Outside region — ranging paused'
            : 'Waiting for first region event...'}
      </Text>

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <View style={styles.buttons}>
        {!isActive ? (
          <Button
            title={isStarting ? 'Starting...' : 'Start'}
            onPress={handleStart}
            disabled={isStarting}
          />
        ) : (
          <Button
            title={isStopping ? 'Stopping...' : 'Stop'}
            onPress={handleStop}
            disabled={isStopping}
          />
        )}
      </View>

      <Text style={styles.sectionTitle}>Beacons ({beacons.length})</Text>
      <FlatList
        data={beacons}
        keyExtractor={(item) => `${item.uuid}-${item.major}-${item.minor}`}
        renderItem={({ item }) => (
          <View style={styles.beacon}>
            <Text style={styles.beaconUuid}>{item.uuid}</Text>
            <Text>
              {item.major}/{item.minor} · {item.rssi} dBm
            </Text>
            <Text style={styles.beaconDistance}>
              {item.distance.toFixed(2)} m
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {regionState === 'inside'
              ? 'No beacons detected'
              : 'Ranging not active'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  stateLabel: {
    fontSize: 14,
    color: '#555',
  },
  stateValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },
  error: {
    color: '#a22',
    fontSize: 12,
    marginBottom: 16,
  },
  buttons: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  beacon: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  beaconUuid: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 4,
  },
  beaconDistance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  empty: {
    color: '#aaa',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
