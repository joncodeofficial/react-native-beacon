package com.reactnativebeacon

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import org.altbeacon.beacon.BeaconManager

private const val FOREGROUND_SERVICE_ID = 456
private const val NOTIFICATION_CHANNEL_ID = "beacon-channel"
private const val TAG = "ForegroundServiceManager"

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

  // packageName/className, when both present, target a specific OEM settings
  // screen (e.g. Xiaomi's Autostart manager). This module has no knowledge of
  // which manufacturer needs which pair — the caller decides that. It just
  // tries to launch what it's given and falls back to the app's generic
  // system settings screen if that fails or nothing was given.
  fun openAutostartSettings(packageName: String?, className: String?) {
    val target = if (packageName != null && className != null) {
      Intent().setClassName(packageName, className)
    } else {
      null
    }

    val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.parse("package:${context.packageName}")
    }

    val intent = (target ?: fallback).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
    try {
      context.startActivity(intent)
    } catch (e: Exception) {
      Log.w(TAG, "openAutostartSettings: failed to open $packageName/$className, falling back to app settings", e)
      fallback.flags = Intent.FLAG_ACTIVITY_NEW_TASK
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

  companion object {
    @Volatile var enabled: Boolean = false
  }
}
