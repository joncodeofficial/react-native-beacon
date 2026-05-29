package com.reactnativebeacon

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.altbeacon.beacon.Beacon
import org.altbeacon.beacon.Identifier
import org.altbeacon.beacon.Region

internal object BeaconConverter {

  // ─── Region ──────────────────────────────────────────────────────────────

  fun readableMapToRegion(map: ReadableMap): Region {
    val identifier = map.getString("identifier")
      ?: throw IllegalArgumentException("identifier is required")
    val uuid = map.getString("uuid")
      ?: throw IllegalArgumentException("uuid is required")
    val major = if (map.hasKey("major")) Identifier.fromInt(map.getInt("major")) else null
    val minor = if (map.hasKey("minor")) Identifier.fromInt(map.getInt("minor")) else null
    return Region(identifier, Identifier.parse(uuid), major, minor)
  }

  fun regionToWritableMap(region: Region): WritableMap =
    Arguments.createMap().apply {
      putString("identifier", region.uniqueId)
      putString("uuid", region.id1?.toString() ?: "")
      region.id2?.let { putInt("major", it.toInt()) }
      region.id3?.let { putInt("minor", it.toInt()) }
    }

  // ─── Beacon ──────────────────────────────────────────────────────────────

  fun beaconToWritableMap(beacon: Beacon, distance: Double, rawDistance: Double): WritableMap =
    Arguments.createMap().apply {
      putString("uuid", beacon.id1?.toString() ?: "")
      putInt("major", beacon.id2?.toInt() ?: 0)
      putInt("minor", beacon.id3?.toInt() ?: 0)
      putInt("rssi", beacon.rssi)
      putDouble("distance", distance)
      putDouble("rawDistance", rawDistance)
      putInt("txPower", beacon.txPower)
      putString("macAddress", beacon.bluetoothAddress ?: "")
      putDouble("timestamp", System.currentTimeMillis().toDouble())
    }
}
