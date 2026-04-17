import { useCallback, useRef, useState } from 'react';
import {
  Button,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type BeaconRegion, useBeaconRanging } from 'react-native-beacon-kit';

// Intentionally inline (not a module-level constant) to exercise regionKey stability fix.
function makeRegion(): BeaconRegion {
  return {
    identifier: 'stability-test',
    uuid: 'a1b23c45-d67e-9fab-de12-0034567890ab',
  };
}

export default function StabilityScreen() {
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Inline region — new object reference every render.
  const [region] = useState<BeaconRegion>(makeRegion);

  // Force a re-render without changing any beacon state.
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const startCallCount = useRef(0);

  const ranging = useBeaconRanging({
    region,
    autoStart: true,
    stopOnUnmount: true,
  });

  // Track how many times the native startRanging fires — should be 1.
  // We can only observe this via isStarting toggling; log it.
  const prevIsStarting = useRef(ranging.isStarting);
  if (prevIsStarting.current !== ranging.isStarting) {
    if (ranging.isStarting) startCallCount.current += 1;
    prevIsStarting.current = ranging.isStarting;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Hook Stability Test</Text>
      <Text style={styles.hint}>
        autoStart=true, stopOnUnmount=true, inline region object.{'\n'}
        Tap "Force Re-render" repeatedly — scanning must stay active.
      </Text>

      <View style={styles.statsBox}>
        <Text style={styles.stat}>
          Renders: <Text style={styles.bold}>{renderCount.current}</Text>
        </Text>
        <Text style={styles.stat}>
          startRanging calls:{' '}
          <Text style={[styles.bold, startCallCount.current > 1 && styles.bad]}>
            {startCallCount.current}
          </Text>
          <Text style={styles.hint2}> (expected 1)</Text>
        </Text>
        <Text style={styles.stat}>
          Status:{' '}
          <Text
            style={[styles.bold, ranging.isActive ? styles.good : styles.warn]}
          >
            {ranging.isStarting
              ? 'starting…'
              : ranging.isStopping
                ? 'stopping…'
                : ranging.isActive
                  ? 'ACTIVE ✓'
                  : 'inactive'}
          </Text>
        </Text>
        <Text style={styles.stat}>
          Beacons: <Text style={styles.bold}>{ranging.beacons.length}</Text>
        </Text>
        <Text style={styles.stat}>
          Tick (re-render driver): <Text style={styles.bold}>{tick}</Text>
        </Text>
      </View>

      {ranging.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{ranging.error.message}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Button title="Force Re-render" onPress={bump} />
        <Button
          title={ranging.isActive ? 'Stop' : 'Start'}
          onPress={ranging.isActive ? ranging.stop : ranging.start}
          disabled={ranging.isStarting || ranging.isStopping}
        />
      </View>

      <Text style={styles.sectionTitle}>
        Beacons ({ranging.beacons.length})
      </Text>
      <FlatList
        data={ranging.beacons}
        scrollEnabled={false}
        keyExtractor={(item) => `${item.uuid}-${item.major}-${item.minor}`}
        renderItem={({ item }) => (
          <View style={styles.beacon}>
            <Text style={styles.beaconUuid}>{item.uuid}</Text>
            <Text>
              {item.major}/{item.minor} — {item.rssi} dBm —{' '}
              {item.distance.toFixed(2)} m
            </Text>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  hint: { fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 18 },
  hint2: { fontSize: 11, color: '#aaa' },
  statsBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  stat: { fontSize: 14, color: '#333' },
  bold: { fontWeight: '700' },
  good: { color: '#0a0' },
  warn: { color: '#888' },
  bad: { color: '#c00' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  errorBox: {
    backgroundColor: '#fff0f0',
    borderColor: '#f66',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 12, color: '#c00' },
  beacon: {
    padding: 10,
    marginBottom: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  beaconUuid: { fontSize: 11, color: '#999', marginBottom: 2 },
});
