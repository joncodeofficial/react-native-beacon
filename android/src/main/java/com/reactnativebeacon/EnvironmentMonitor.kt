package com.reactnativebeacon

import android.Manifest
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap

data class EnvironmentState(
  val bluetoothEnabled: Boolean,
  val locationServicesEnabled: Boolean,
  val locationPermissionGranted: Boolean,
  val bluetoothPermissionGranted: Boolean,
  val backgroundPermissionGranted: Boolean,
  val permissionsGranted: Boolean,
  val canScanInForeground: Boolean,
  val canScanInBackground: Boolean,
)

internal class EnvironmentMonitor(
  private val context: ReactApplicationContext,
  private val onStateChanged: (WritableMap) -> Unit,
) {
  private var lastState: EnvironmentState? = null
  private var receiverRegistered = false

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
      emitIfNeeded()
    }
  }

  fun start() {
    lastState = snapshot()
    if (receiverRegistered) return
    val filter = IntentFilter().apply {
      addAction(android.bluetooth.BluetoothAdapter.ACTION_STATE_CHANGED)
      addAction(LocationManager.MODE_CHANGED_ACTION)
      addAction(LocationManager.PROVIDERS_CHANGED_ACTION)
    }
    context.registerReceiver(receiver, filter)
    receiverRegistered = true
  }

  fun stop() {
    if (!receiverRegistered) return
    try { context.unregisterReceiver(receiver) } catch (_: Exception) {}
    receiverRegistered = false
  }

  fun snapshot(): EnvironmentState {
    val bluetoothEnabled = isBluetoothEnabled()
    val locationServicesEnabled = isLocationServicesEnabled()
    val locationPermissionGranted = hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)
    val bluetoothPermissionGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      hasPermission(Manifest.permission.BLUETOOTH_SCAN)
    } else true
    val backgroundPermissionGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      hasPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
    } else true
    val permissionsGranted = locationPermissionGranted && bluetoothPermissionGranted && backgroundPermissionGranted
    val canScanInForeground = bluetoothEnabled && locationServicesEnabled && locationPermissionGranted && bluetoothPermissionGranted
    val canScanInBackground = canScanInForeground && backgroundPermissionGranted
    return EnvironmentState(
      bluetoothEnabled = bluetoothEnabled,
      locationServicesEnabled = locationServicesEnabled,
      locationPermissionGranted = locationPermissionGranted,
      bluetoothPermissionGranted = bluetoothPermissionGranted,
      backgroundPermissionGranted = backgroundPermissionGranted,
      permissionsGranted = permissionsGranted,
      canScanInForeground = canScanInForeground,
      canScanInBackground = canScanInBackground,
    )
  }

  fun emitIfNeeded() {
    val next = snapshot()
    if (next == lastState) return
    lastState = next
    if (!context.hasActiveReactInstance()) return
    onStateChanged(toWritableMap(next))
  }

  fun toWritableMap(state: EnvironmentState): WritableMap =
    Arguments.createMap().apply {
      putBoolean("bluetoothEnabled", state.bluetoothEnabled)
      putBoolean("locationServicesEnabled", state.locationServicesEnabled)
      putBoolean("locationPermissionGranted", state.locationPermissionGranted)
      putBoolean("bluetoothPermissionGranted", state.bluetoothPermissionGranted)
      putBoolean("backgroundPermissionGranted", state.backgroundPermissionGranted)
      putBoolean("permissionsGranted", state.permissionsGranted)
      putBoolean("canScanInForeground", state.canScanInForeground)
      putBoolean("canScanInBackground", state.canScanInBackground)
    }

  private fun hasPermission(permission: String) =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

  private fun isBluetoothEnabled(): Boolean {
    val mgr = context.getSystemService(BluetoothManager::class.java)
    return mgr?.adapter?.isEnabled == true
  }

  private fun isLocationServicesEnabled(): Boolean {
    val mgr = context.getSystemService(LocationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return mgr?.isLocationEnabled == true
    @Suppress("DEPRECATION")
    return mgr?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true ||
      mgr?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true
  }
}
