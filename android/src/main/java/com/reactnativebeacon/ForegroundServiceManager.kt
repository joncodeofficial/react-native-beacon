package com.reactnativebeacon

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.drawable.Icon
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
private const val STOP_ACTION = "com.reactnativebeacon.ACTION_STOP_SCANNING"
private const val TAG = "ForegroundServiceManager"

internal class ForegroundServiceManager(private val context: ReactApplicationContext) {

  private var currentTitle = "Beacon"
  private var currentText = "Scanning for beacons..."
  private val iconRes = R.drawable.ic_beacon_notification
  private var color: Int? = null
  private var showStopAction = false
  private var stopActionText = "Stop"

  private var onStopRequested: (() -> Unit)? = null
  private var stopReceiverRegistered = false
  private val stopReceiver = object : BroadcastReceiver() {
    override fun onReceive(receiverContext: Context, intent: Intent) {
      if (intent.action == STOP_ACTION) onStopRequested?.invoke()
    }
  }

  fun enable(
    beaconManager: BeaconManager,
    notifConfig: ReadableMap?,
    aggressiveMode: Boolean,
    wakeLock: PowerManager.WakeLock?,
    onStopRequested: () -> Unit,
  ) {
    buildNotificationChannel()

    this.onStopRequested = onStopRequested
    applyNotifConfig(notifConfig)
    if (showStopAction) registerStopReceiver()

    val notification = buildNotification()

    if (!Companion.enabled) {
      beaconManager.setEnableScheduledScanJobs(false)
      beaconManager.enableForegroundServiceScanning(notification, FOREGROUND_SERVICE_ID)
      Companion.enabled = true
    }

    if (aggressiveMode && wakeLock?.isHeld != true) {
      wakeLock?.acquire()
    }
  }

  // Updates the notification's title/text live, without touching the icon,
  // color, or stop action. No-op if the foreground service isn't running.
  fun update(config: ReadableMap) {
    if (!Companion.enabled) return
    if (config.hasKey("title")) currentTitle = config.getString("title") ?: currentTitle
    if (config.hasKey("text")) currentText = config.getString("text") ?: currentText

    val notification = buildNotification()
    context.getSystemService(NotificationManager::class.java)
      .notify(FOREGROUND_SERVICE_ID, notification)
  }

  fun disable(wakeLock: PowerManager.WakeLock?) {
    wakeLock?.let { if (it.isHeld) it.release() }
    unregisterStopReceiver()
    onStopRequested = null
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

  private fun applyNotifConfig(notifConfig: ReadableMap?) {
    currentTitle = notifConfig?.getString("title") ?: currentTitle
    currentText = notifConfig?.getString("text") ?: currentText
    showStopAction = notifConfig?.hasKey("showStopAction") == true && notifConfig.getBoolean("showStopAction")
    stopActionText = notifConfig?.getString("stopActionText") ?: stopActionText

    val colorHex = notifConfig?.getString("color")
    color = if (colorHex != null) {
      try { Color.parseColor(colorHex) } catch (e: IllegalArgumentException) {
        Log.w(TAG, "Invalid notification color '$colorHex', ignoring", e)
        null
      }
    } else {
      null
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

  private fun buildNotification(): Notification {
    val builder = Notification.Builder(context, NOTIFICATION_CHANNEL_ID)
      .setContentTitle(currentTitle)
      .setContentText(currentText)
      .setSmallIcon(iconRes)
      .setOngoing(true)
    color?.let { builder.setColor(it) }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    }
    if (showStopAction) {
      val actionIcon = Icon.createWithResource(context, iconRes)
      builder.addAction(Notification.Action.Builder(actionIcon, stopActionText, stopPendingIntent()).build())
    }
    return builder.build()
  }

  private fun stopPendingIntent(): PendingIntent {
    val intent = Intent(STOP_ACTION).setPackage(context.packageName)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(context, 0, intent, flags)
  }

  // Registered dynamically rather than via the manifest: the notification
  // (and therefore the stop action) only ever exists while this process is
  // already alive and running the foreground service, so there's no need to
  // wake the app from a killed state to handle the tap.
  private fun registerStopReceiver() {
    if (stopReceiverRegistered) return
    val filter = IntentFilter(STOP_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(stopReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      context.registerReceiver(stopReceiver, filter)
    }
    stopReceiverRegistered = true
  }

  private fun unregisterStopReceiver() {
    if (!stopReceiverRegistered) return
    try { context.unregisterReceiver(stopReceiver) } catch (_: Exception) {}
    stopReceiverRegistered = false
  }

  companion object {
    @Volatile var enabled: Boolean = false
  }
}
