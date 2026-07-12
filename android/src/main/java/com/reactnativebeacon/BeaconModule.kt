package com.reactnativebeacon

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.altbeacon.beacon.BeaconManager
import org.altbeacon.beacon.BeaconParser
import org.altbeacon.beacon.MonitorNotifier
import org.altbeacon.beacon.RangeNotifier
import org.altbeacon.beacon.Region

class BeaconModule(reactContext: ReactApplicationContext) :
  NativeBeaconSpec(reactContext),
  LifecycleEventListener {

  private var beaconManager: BeaconManager? = null
  private var rangeNotifier: RangeNotifier? = null
  private var monitorNotifier: MonitorNotifier? = null

  private var kalman = KalmanFilter()
  private var kalmanEnabled = false

  private val environmentMonitor = EnvironmentMonitor(reactContext) { map ->
    sendEvent("onScannerStateChanged", map)
  }
  private val foregroundService = ForegroundServiceManager(reactContext)

  private var aggressiveMode = false
  private var userForegroundScanPeriod = 10_000L
  private var userBackgroundScanPeriod = 10_000L
  private var wakeLock: PowerManager.WakeLock? = null

  private var screenReceiverRegistered = false
  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      when (intent.action) {
        Intent.ACTION_SCREEN_OFF -> onScreenOff()
        Intent.ACTION_SCREEN_ON  -> onScreenOn()
      }
    }
  }

  private val watchdogHandler = Handler(Looper.getMainLooper())
  private var watchdogRunnable: Runnable? = null
  private val activeRangingRegions = java.util.concurrent.CopyOnWriteArrayList<Region>()
  private val activeMonitoringRegions = java.util.concurrent.CopyOnWriteArrayList<Region>()

  init {
    reactApplicationContext.addLifecycleEventListener(this)
    environmentMonitor.start()
  }

  // ─── BeaconManager ───────────────────────────────────────────────────────

  private fun getOrCreateBeaconManager(): BeaconManager {
    return beaconManager ?: BeaconManager.getInstanceForApplication(reactApplicationContext).also {
      if (!Companion.beaconManagerInitialized) {
        it.beaconParsers.add(BeaconParser().setBeaconLayout("m:2-3=0215,i:4-19,i:20-21,i:22-23,p:24-24,d:25-25"))
        it.beaconParsers.add(BeaconParser().setBeaconLayout("m:2-3=beac,i:4-19,i:20-21,i:22-23,p:24-24,d:25-25"))
        it.beaconParsers.add(BeaconParser().setBeaconLayout("s:0-1=feaa,m:2-2=00,p:3-3:-41,i:4-13,i:14-19"))
        it.foregroundScanPeriod = 10_000L
        it.backgroundScanPeriod = 10_000L
        Companion.beaconManagerInitialized = true
      }
      if (aggressiveMode) it.setBackgroundMode(false)
      beaconManager = it
    }
  }

  // ─── RN bridge ───────────────────────────────────────────────────────────

  override fun checkPermissions(promise: Promise) {
    promise.resolve(environmentMonitor.snapshot().permissionsGranted)
  }

  override fun getEnvironmentState(promise: Promise) {
    val state = environmentMonitor.snapshot()
    promise.resolve(environmentMonitor.toWritableMap(state))
  }

  override fun configure(config: ReadableMap) {
    if (config.hasKey("aggressiveBackground")) {
      aggressiveMode = config.getBoolean("aggressiveBackground")
    }

    val manager = getOrCreateBeaconManager()

    if (config.hasKey("scanPeriod")) userForegroundScanPeriod = config.getDouble("scanPeriod").toLong()
    if (config.hasKey("backgroundScanPeriod")) userBackgroundScanPeriod = config.getDouble("backgroundScanPeriod").toLong()

    if (aggressiveMode) {
      val isScreenOn = reactApplicationContext.getSystemService(PowerManager::class.java).isInteractive
      manager.foregroundScanPeriod = if (isScreenOn) userForegroundScanPeriod else userBackgroundScanPeriod
    } else {
      manager.foregroundScanPeriod = userForegroundScanPeriod
      manager.backgroundScanPeriod = userBackgroundScanPeriod
    }

    if (config.hasKey("betweenScanPeriod")) {
      val between = config.getDouble("betweenScanPeriod").toLong()
      manager.foregroundBetweenScanPeriod = between
      manager.backgroundBetweenScanPeriod = between
    }

    if (config.hasKey("foregroundService")) {
      if (config.getBoolean("foregroundService")) {
        val notifConfig = if (config.hasKey("foregroundServiceNotification")) config.getMap("foregroundServiceNotification") else null
        if (aggressiveMode) {
          val pm = reactApplicationContext.getSystemService(PowerManager::class.java)
          wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "beacon-kit:scanning")
        }
        foregroundService.enable(manager, notifConfig, aggressiveMode, wakeLock)
        if (aggressiveMode) registerScreenReceiver()
      } else {
        foregroundService.disable(wakeLock)
        wakeLock = null
        unregisterScreenReceiver()
      }
    }

    if (config.hasKey("kalmanFilter")) {
      val k = config.getMap("kalmanFilter")!!
      kalmanEnabled = k.hasKey("enabled") && k.getBoolean("enabled")
      val q = if (k.hasKey("q")) k.getDouble("q") else 0.008
      val r = if (k.hasKey("r")) k.getDouble("r") else 0.1
      kalman = KalmanFilter(q, r)
    }

    try { manager.updateScanPeriods() } catch (_: Exception) {}
  }

  // ─── Ranging ─────────────────────────────────────────────────────────────

  override fun startRanging(region: ReadableMap, promise: Promise) {
    try {
      val beaconRegion = BeaconConverter.readableMapToRegion(region)

      if (activeMonitoringRegions.any { it.uniqueId == beaconRegion.uniqueId }) {
        promise.reject("RANGING_MONITORING_CONFLICT",
          "Cannot call startRanging on region '${beaconRegion.uniqueId}' — " +
          "startMonitoring is already active on the same region. " +
          "They interfere with each other. Call stopMonitoring first, or use a different region identifier.")
        return
      }

      val manager = getOrCreateBeaconManager()
      if (rangeNotifier == null) {
        manager.removeAllRangeNotifiers()
        rangeNotifier = RangeNotifier { beacons, rgn -> sendBeaconsRangedEvent(beacons, rgn) }
        manager.addRangeNotifier(rangeNotifier!!)
      }

      manager.startRangingBeacons(beaconRegion)
      if (activeRangingRegions.none { it.uniqueId == beaconRegion.uniqueId }) activeRangingRegions.add(beaconRegion)

      if (aggressiveMode) {
        val isScreenOn = reactApplicationContext.getSystemService(PowerManager::class.java).isInteractive
        if (!isScreenOn) startWatchdog()
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("RANGING_ERROR", e.message, e)
    }
  }

  override fun stopRanging(region: ReadableMap, promise: Promise) {
    try {
      val beaconRegion = BeaconConverter.readableMapToRegion(region)
      getOrCreateBeaconManager().stopRangingBeacons(beaconRegion)
      activeRangingRegions.removeAll { it.uniqueId == beaconRegion.uniqueId }
      if (activeRangingRegions.isEmpty()) stopWatchdog()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("RANGING_ERROR", e.message, e)
    }
  }

  // ─── Monitoring ──────────────────────────────────────────────────────────

  override fun startMonitoring(region: ReadableMap, promise: Promise) {
    try {
      val beaconRegion = BeaconConverter.readableMapToRegion(region)

      if (activeRangingRegions.any { it.uniqueId == beaconRegion.uniqueId }) {
        promise.reject("RANGING_MONITORING_CONFLICT",
          "Cannot call startMonitoring on region '${beaconRegion.uniqueId}' — " +
          "startRanging is already active on the same region. " +
          "They interfere with each other. Call stopRanging first, or use a different region identifier.")
        return
      }

      val manager = getOrCreateBeaconManager()
      if (monitorNotifier == null) {
        manager.removeAllMonitorNotifiers()
        monitorNotifier = object : MonitorNotifier {
          override fun didEnterRegion(rgn: Region) = sendRegionStateChangedEvent(rgn, "inside")
          override fun didExitRegion(rgn: Region) = sendRegionStateChangedEvent(rgn, "outside")
          override fun didDetermineStateForRegion(state: Int, rgn: Region) {}
        }
        manager.addMonitorNotifier(monitorNotifier!!)
      }

      manager.startMonitoring(beaconRegion)
      if (activeMonitoringRegions.none { it.uniqueId == beaconRegion.uniqueId }) activeMonitoringRegions.add(beaconRegion)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("MONITORING_ERROR", e.message, e)
    }
  }

  override fun stopMonitoring(region: ReadableMap, promise: Promise) {
    try {
      val beaconRegion = BeaconConverter.readableMapToRegion(region)
      getOrCreateBeaconManager().stopMonitoring(beaconRegion)
      activeMonitoringRegions.removeAll { it.uniqueId == beaconRegion.uniqueId }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("MONITORING_ERROR", e.message, e)
    }
  }

  // ─── Regions ─────────────────────────────────────────────────────────────

  override fun getRangedRegions(promise: Promise) {
    val array = Arguments.createArray()
    activeRangingRegions.forEach { array.pushMap(BeaconConverter.regionToWritableMap(it)) }
    promise.resolve(array)
  }

  override fun getMonitoredRegions(promise: Promise) {
    val array = Arguments.createArray()
    activeMonitoringRegions.forEach { array.pushMap(BeaconConverter.regionToWritableMap(it)) }
    promise.resolve(array)
  }

  // ─── Battery / OEM ───────────────────────────────────────────────────────

  override fun isIgnoringBatteryOptimizations(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val pm = reactApplicationContext.getSystemService(PowerManager::class.java)
      promise.resolve(pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName))
    } else {
      promise.resolve(true)
    }
  }

  override fun requestIgnoreBatteryOptimizations() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:${reactApplicationContext.packageName}")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      reactApplicationContext.startActivity(intent)
    }
  }

  override fun openAutostartSettings(packageName: String?, className: String?) =
    foregroundService.openAutostartSettings(packageName, className)

  // ─── NativeEventEmitter ──────────────────────────────────────────────────

  override fun addListener(eventName: String) {}
  override fun removeListeners(count: Double) {}

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  override fun onHostResume() = environmentMonitor.emitIfNeeded()
  override fun onHostPause() {}
  override fun onHostDestroy() {}

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    environmentMonitor.stop()
    unregisterScreenReceiver()
    stopWatchdog()
    activeRangingRegions.clear()
    activeMonitoringRegions.clear()
    rangeNotifier = null
    monitorNotifier = null
    wakeLock?.let { if (it.isHeld) it.release() }
    super.invalidate()
  }

  // ─── Aggressive background ───────────────────────────────────────────────

  private fun registerScreenReceiver() {
    if (screenReceiverRegistered) return
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_OFF)
      addAction(Intent.ACTION_SCREEN_ON)
    }
    reactApplicationContext.registerReceiver(screenReceiver, filter)
    screenReceiverRegistered = true
  }

  private fun unregisterScreenReceiver() {
    if (!screenReceiverRegistered) return
    try { reactApplicationContext.unregisterReceiver(screenReceiver) } catch (_: Exception) {}
    screenReceiverRegistered = false
  }

  private fun onScreenOff() {
    val manager = beaconManager ?: return
    manager.foregroundScanPeriod = userBackgroundScanPeriod
    try { manager.updateScanPeriods() } catch (_: Exception) {}
    if (activeRangingRegions.isNotEmpty()) startWatchdog()
  }

  private fun onScreenOn() {
    stopWatchdog()
    val manager = beaconManager ?: return
    manager.foregroundScanPeriod = userForegroundScanPeriod
    for (region in activeRangingRegions) {
      try {
        manager.stopRangingBeacons(region)
        manager.startRangingBeacons(region)
      } catch (_: Exception) {}
    }
  }

  private fun startWatchdog() {
    if (watchdogRunnable != null) return
    watchdogRunnable = object : Runnable {
      override fun run() {
        try {
          val manager = beaconManager ?: return
          manager.setBackgroundMode(false)
          for (region in activeRangingRegions) {
            try {
              manager.stopRangingBeacons(region)
              manager.startRangingBeacons(region)
            } catch (_: Exception) {}
          }
        } finally {
          watchdogHandler.postDelayed(this, WATCHDOG_INTERVAL_MS)
        }
      }
    }
    watchdogHandler.postDelayed(watchdogRunnable!!, WATCHDOG_INTERVAL_MS)
  }

  private fun stopWatchdog() {
    watchdogRunnable?.let { watchdogHandler.removeCallbacks(it) }
    watchdogRunnable = null
  }

  // ─── Event emission ──────────────────────────────────────────────────────

  private fun sendBeaconsRangedEvent(beacons: Collection<org.altbeacon.beacon.Beacon>, region: Region) {
    if (!reactApplicationContext.hasActiveReactInstance()) return

    val iBeacons = Arguments.createArray()
    val eddystoneBeacons = Arguments.createArray()

    for (beacon in beacons) {
      val key = "${beacon.id1}:${beacon.id2}:${beacon.id3}"
      val rawDistance = beacon.distance
      val distance = if (kalmanEnabled) kalman.apply(key, rawDistance) else rawDistance

      if (BeaconConverter.isEddystoneUid(beacon)) {
        eddystoneBeacons.pushMap(BeaconConverter.eddystoneBeaconToWritableMap(beacon, distance, rawDistance))
      } else {
        iBeacons.pushMap(BeaconConverter.beaconToWritableMap(beacon, distance, rawDistance))
      }
    }

    if (iBeacons.size() > 0) {
      sendEvent("onBeaconsRanged", Arguments.createMap().apply {
        putMap("region", BeaconConverter.regionToWritableMap(region))
        putArray("beacons", iBeacons)
      })
    }

    if (eddystoneBeacons.size() > 0) {
      sendEvent("onEddystoneRanged", Arguments.createMap().apply {
        putMap("region", BeaconConverter.eddystoneRegionToWritableMap(region))
        putArray("beacons", eddystoneBeacons)
      })
    }
  }

  private fun sendRegionStateChangedEvent(region: Region, state: String) {
    if (!reactApplicationContext.hasActiveReactInstance()) return
    sendEvent("onRegionStateChanged", Arguments.createMap().apply {
      putMap("region", BeaconConverter.regionToWritableMap(region))
      putString("state", state)
    })
  }

  private fun sendEvent(eventName: String, params: Any) {
    try {
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    } catch (_: Exception) {}
  }

  companion object {
    const val NAME = NativeBeaconSpec.NAME
    private const val WATCHDOG_INTERVAL_MS = 20_000L
    @Volatile private var beaconManagerInitialized: Boolean = false
  }
}
