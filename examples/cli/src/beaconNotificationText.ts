const APP_LABEL = 'CLI';

// Formats the foreground service notification text: a static "scanning"
// message at zero beacons, a live count once ranging finds any. Used both as
// the initial config text (beaconSetup.ts) and for live updates
// (TestScreen.tsx via Beacon.updateNotification), so the two never drift.
export const formatNotificationText = (beaconCount: number): string =>
  beaconCount === 0
    ? `Scanning for beacons with ${APP_LABEL}...`
    : `${beaconCount} beacon${beaconCount === 1 ? '' : 's'} nearby`;
