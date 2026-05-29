package com.reactnativebeacon

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import org.altbeacon.beacon.BeaconManager

private const val FOREGROUND_SERVICE_ID = 456
private const val NOTIFICATION_CHANNEL_ID = "beacon-channel"

internal class ForegroundServiceManager(private val context: ReactApplicationContext) {

  fun enable(beaconManager: BeaconManager, notifConfig: ReadableMap?, aggressiveMode: Boolean, wakeLock: PowerManager.WakeLock?) {
    buildNotificationChannel()

    val title = notifConfig?.getString("title") ?: "Beacon"
    val text = notifConfig?.getString("text") ?: "Scanning for beacons..."
    val notification = buildNotification(title, text)

    if (!Companion.enabled) {
      beaconManager.setEnableScheduledScanJobs(false)
      beaconManager.enableForegroundServiceScanning(notification, FOREGROUND_SERVICE_ID)
      Companion.enabled = true
    }

    if (aggressiveMode && wakeLock?.isHeld != true) {
      wakeLock?.acquire()
    }
  }

  fun disable(wakeLock: PowerManager.WakeLock?) {
    wakeLock?.let { if (it.isHeld) it.release() }
    Companion.enabled = false
  }

  fun openAutostartSettings() {
    val intent = oemAutostartIntent() ?: Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.parse("package:${context.packageName}")
    }
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
    try {
      context.startActivity(intent)
    } catch (_: Exception) {
      val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = Uri.parse("package:${context.packageName}")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      context.startActivity(fallback)
    }
  }

  private fun buildNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
      NOTIFICATION_CHANNEL_ID,
      "Beacon Scanning",
      NotificationManager.IMPORTANCE_LOW,
    ).apply { description = "Active while scanning for beacons in background" }
    context.getSystemService(NotificationManager::class.java)
      .createNotificationChannel(channel)
  }

  private fun buildNotification(title: String, text: String): Notification {
    val builder = Notification.Builder(context, NOTIFICATION_CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(android.R.drawable.ic_menu_compass)
      .setOngoing(true)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    }
    return builder.build()
  }

  private fun oemAutostartIntent(): Intent? {
    val manufacturer = Build.MANUFACTURER.lowercase()
    return when {
      manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") ->
        Intent().setClassName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
      manufacturer.contains("oppo") || manufacturer.contains("realme") ->
        Intent().setClassName("com.coloros.safecenter", "com.coloros.privacypermissionsentry.PermissionTopActivity")
      manufacturer.contains("vivo") ->
        Intent().setClassName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
      manufacturer.contains("huawei") ->
        Intent().setClassName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
      manufacturer.contains("samsung") ->
        Intent().setClassName("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity")
      else -> null
    }
  }

  companion object {
    @Volatile var enabled: Boolean = false
  }
}
