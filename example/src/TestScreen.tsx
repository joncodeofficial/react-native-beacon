import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Beacon, {
  type Beacon as BeaconType,
  type BeaconRegion,
} from 'react-native-beacon-kit';

const TEST_REGION: BeaconRegion = {
  identifier: 'test-region',
  uuid: 'a1b23c45-d67e-9fab-de12-0034567890ab',
};

export default function TestScreen() {
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [beacons, setBeacons] = useState<BeaconType[]>([]);
  const [regionState, setRegionState] = useState<string>('unknown');
  const [isRanging, setIsRanging] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [rangedRegions, setRangedRegions] = useState<BeaconRegion[]>([]);
  const [monitoredRegions, setMonitoredRegions] = useState<BeaconRegion[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  // Step 1: Register listeners at mount — independent of permissions and scanning state.
  useEffect(() => {
    const rangingSub = Beacon.onBeaconsRanged((event) => {
      const ts = new Date().toISOString();
      if (event.beacons.length === 0) {
        console.log(`[beacon] ${ts} — scan fired, 0 beacons`);
      } else {
        event.beacons.forEach((b) => {
          console.log(
            `[beacon] ${ts} — ${b.uuid} (${b.major}/${b.minor}) ` +
              `rssi=${b.rssi} dBm | filtered=${b.distance.toFixed(2)}m | raw=${b.rawDistance.toFixed(2)}m`
          );
        });
      }
      setBeacons(event.beacons);
    });

    const monitorSub = Beacon.onRegionStateChanged((event) => {
      const ts = new Date().toISOString();
      console.log(
        `[beacon] ${ts} — region ${event.state}: ${event.region.identifier}`
      );
      setRegionState(event.state);
    });

    return () => {
      rangingSub.remove();
      monitorSub.remove();
    };
  }, []);

  // Read permission status for display — configure() already ran in App.tsx
  useEffect(() => {
    Beacon.checkPermissions().then(setHasPermissions);
  }, []);

  const handleStartRanging = useCallback(async () => {
    setLastError(null);
    try {
      await Beacon.startRanging(TEST_REGION);
      setIsRanging(true);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.log(`[beacon] startRanging error: ${msg}`);
      setLastError(msg);
    }
  }, []);

  const handleStopRanging = useCallback(async () => {
    setLastError(null);
    await Beacon.stopRanging(TEST_REGION);
    setIsRanging(false);
    setBeacons([]);
  }, []);

  const handleStartMonitoring = useCallback(async () => {
    setLastError(null);
    try {
      await Beacon.startMonitoring(TEST_REGION);
      setIsMonitoring(true);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.log(`[beacon] startMonitoring error: ${msg}`);
      setLastError(msg);
    }
  }, []);

  const handleStopMonitoring = useCallback(async () => {
    setLastError(null);
    await Beacon.stopMonitoring(TEST_REGION);
    setIsMonitoring(false);
    setRegionState('unknown');
  }, []);

  const handleGetRegions = useCallback(async () => {
    const [ranged, monitored] = await Promise.all([
      Beacon.getRangedRegions(),
      Beacon.getMonitoredRegions(),
    ]);
    console.log('[beacon] ranged regions:', JSON.stringify(ranged));
    console.log('[beacon] monitored regions:', JSON.stringify(monitored));
    setRangedRegions(ranged);
    setMonitoredRegions(monitored);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Beacon Test</Text>

      <Text style={styles.status}>
        Permissions:{' '}
        {hasPermissions === null
          ? '...'
          : hasPermissions
            ? 'granted ✓'
            : 'denied ✗'}
      </Text>
      <Text style={styles.status}>Region state: {regionState}</Text>

      {/* --- Ranging --- */}
      <Text style={styles.sectionTitle}>Ranging</Text>
      <View style={styles.row}>
        <Button
          title={isRanging ? 'Stop Ranging' : 'Start Ranging'}
          onPress={isRanging ? handleStopRanging : handleStartRanging}
        />
      </View>

      {/* --- Monitoring --- */}
      <Text style={styles.sectionTitle}>Monitoring</Text>
      <Text style={styles.hint}>
        Start Monitoring while Ranging is active → should show
        RANGING_MONITORING_CONFLICT error below.
      </Text>
      <View style={styles.row}>
        <Button
          title={isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          onPress={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
        />
      </View>

      {/* --- Error display --- */}
      {lastError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{lastError}</Text>
        </View>
      )}

      {/* --- getRangedRegions / getMonitoredRegions --- */}
      <Text style={styles.sectionTitle}>Active Regions</Text>
      <View style={styles.row}>
        <Button title="Get Active Regions" onPress={handleGetRegions} />
      </View>
      <Text style={styles.label}>Ranged ({rangedRegions.length}):</Text>
      {rangedRegions.map((r) => (
        <Text key={r.identifier} style={styles.regionText}>
          {r.identifier} — {r.uuid}
        </Text>
      ))}
      <Text style={styles.label}>Monitored ({monitoredRegions.length}):</Text>
      {monitoredRegions.map((r) => (
        <Text key={r.identifier} style={styles.regionText}>
          {r.identifier} — {r.uuid}
        </Text>
      ))}

      {/* --- Beacon list --- */}
      <Text style={styles.sectionTitle}>
        Beacons detected: {beacons.length}
      </Text>
      <FlatList
        data={beacons}
        scrollEnabled={false}
        keyExtractor={(item) => `${item.uuid}-${item.major}-${item.minor}`}
        renderItem={({ item }) => (
          <View style={styles.beacon}>
            <Text style={styles.beaconUuid}>{item.uuid}</Text>
            <Text style={styles.beaconMac}>{item.macAddress}</Text>
            <Text>
              Major: {item.major} Minor: {item.minor}
            </Text>
            <Text>RSSI: {item.rssi} dBm</Text>
            <Text style={styles.beaconDistance}>
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
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  status: { fontSize: 14, marginBottom: 6, color: '#555' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  hint: { fontSize: 12, color: '#888', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  label: { fontSize: 13, color: '#555', marginTop: 6 },
  regionText: { fontSize: 12, color: '#333', marginLeft: 8, marginBottom: 2 },
  errorBox: {
    backgroundColor: '#fff0f0',
    borderColor: '#f66',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  errorText: { fontSize: 12, color: '#c00' },
  beacon: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  beaconUuid: { fontSize: 12, color: '#888', marginBottom: 2 },
  beaconMac: { fontSize: 12, color: '#aaa', marginBottom: 6 },
  beaconDistance: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
});
