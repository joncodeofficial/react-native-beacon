# Roadmap

## Next priority: Reliability and validation

This is the most important track before adding more surface area.

### Cross-platform confidence

- [ ] Add iOS build validation in CI
- [ ] Validate on real iPhone hardware
- [ ] Verify Android permissions and behavior on Android 12, 13, and 14
- [ ] Test with multiple beacon vendors:
  - Estimote
  - Kontakt.io
  - Minew

### Test strategy

- [ ] Add stronger cross-platform confidence beyond JS contract tests
- [x] Add a documented real-device validation matrix for releases

---

## Protocol expansion

### Eddystone-UID support

- [x] Add Eddystone parser support on Android
- [x] Design the public reading model (`EddystoneUidReading`, `EddystoneRegion`)
- [x] Update region/filter types to support Eddystone namespace and instance filtering
- [x] Document the platform story clearly

---

## Mock Provider for testing

- [x] `MockBeaconProvider` + `createMockBeaconControls` injection API
- [x] Support simulating ranging events with configurable RSSI and distance
- [x] Support simulating region enter/exit events
- [x] Works with Jest and `@testing-library/react-native`

---

## API and core improvements

- [ ] Moving average filter as an alternative to Kalman

---

## Release checklist

- [ ] Add iOS build validation in CI
- [ ] Validate Android permission behavior on Android 12, 13, and 14
- [ ] Validate on real iOS devices
- [ ] Test with multiple beacon manufacturers
- [ ] Maintain a documented hardware validation matrix for release confidence
