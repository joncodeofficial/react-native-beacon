package com.reactnativebeacon

data class KalmanState(
  var estimate: Double,
  var errorCovariance: Double,
)

class KalmanFilter(
  private val q: Double = 0.008,
  private val r: Double = 0.1,
) {
  private val states = mutableMapOf<String, KalmanState>()

  fun apply(key: String, measurement: Double): Double {
    val state = states.getOrPut(key) { KalmanState(measurement, 1.0) }
    val predictedError = state.errorCovariance + q
    val gain = predictedError / (predictedError + r)
    state.estimate = state.estimate + gain * (measurement - state.estimate)
    state.errorCovariance = (1 - gain) * predictedError
    return state.estimate
  }

  fun reset() = states.clear()
}
