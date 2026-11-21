package com.example

import android.app.Activity
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface
import android.widget.Toast
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class MagicWandTarget(
    val id: String,
    val name: String,
    val partsSpec: String = ""
) {
    fun parsedParts(): List<Pair<String, String>> {
        if (partsSpec.isBlank()) return emptyList()
        return partsSpec.split(",").mapNotNull { token ->
            val idx = token.indexOf(':')
            if (idx > 0 && idx < token.length - 1) {
                Pair(token.substring(0, idx).trim(), token.substring(idx + 1).trim())
            } else {
                null
            }
        }
    }
}

/**
 * JavaScript interface bridging Android native capabilities (vibrations, haptics,
 * state monitoring, model switching, 8-bit music volume/tracks, weather, toasts) directly with Three.js.
 */
class GameWebAppInterface(private val context: Context) {

    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        vibratorManager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    private val _characterState = MutableStateFlow("idle")
    val characterState = _characterState.asStateFlow()

    private val _isGameReady = MutableStateFlow(false)
    val isGameReady = _isGameReady.asStateFlow()

    private val _ballKicks = MutableStateFlow(0)
    val ballKicks = _ballKicks.asStateFlow()

    private val _currentModelName = MutableStateFlow("草帽探险家")
    val currentModelName = _currentModelName.asStateFlow()

    private val _musicVolume = MutableStateFlow(0.7f)
    val musicVolume = _musicVolume.asStateFlow()

    private val _currentTrackIndex = MutableStateFlow(0)
    val currentTrackIndex = _currentTrackIndex.asStateFlow()

    private val _isBgmEnabled = MutableStateFlow(true)
    val isBgmEnabled = _isBgmEnabled.asStateFlow()

    private val _vegetationDensity = MutableStateFlow(1.0f)
    val vegetationDensity = _vegetationDensity.asStateFlow()

    private val _currentWeather = MutableStateFlow("sunny")
    val currentWeather = _currentWeather.asStateFlow()

    private val _weatherAutoEnabled = MutableStateFlow(true)
    val weatherAutoEnabled = _weatherAutoEnabled.asStateFlow()

    private val _webglGpuInfo = MutableStateFlow("硬件加速 WebGL 2.0 (全速运行)")
    val webglGpuInfo = _webglGpuInfo.asStateFlow()

    private val _webglFps = MutableStateFlow(60)
    val webglFps = _webglFps.asStateFlow()

    private val _webglDrawCalls = MutableStateFlow(0)
    val webglDrawCalls = _webglDrawCalls.asStateFlow()

    private val _webglTriangles = MutableStateFlow(0)
    val webglTriangles = _webglTriangles.asStateFlow()

    private val _lastTouchedObject = MutableStateFlow<MagicWandTarget?>(null)
    val lastTouchedObject = _lastTouchedObject.asStateFlow()

    private val _magicWandCameraRequest = MutableStateFlow<MagicWandTarget?>(null)
    val magicWandCameraRequest = _magicWandCameraRequest.asStateFlow()

    fun consumeMagicWandCameraRequest() {
        _magicWandCameraRequest.value = null
    }

    // Safe in-memory buffer for local 3D model data to avoid IPC string limit
    private var pendingModelBase64: String = ""
    private var pendingModelName: String = ""
    private var pendingModelExt: String = "glb"
    private var pendingModelIcon: String = "📦"
    private var pendingCategory: String = "character"
    private var pendingSubType: String = ""

    fun setPendingModelData(
        name: String,
        base64: String,
        ext: String,
        icon: String = "📦",
        category: String = "character",
        subType: String = ""
    ) {
        pendingModelName = name
        pendingModelBase64 = base64
        pendingModelExt = ext
        pendingModelIcon = icon
        pendingCategory = category
        pendingSubType = subType
    }

    @JavascriptInterface
    fun getPendingModelLength(): Int = pendingModelBase64.length

    @JavascriptInterface
    fun getPendingModelChunk(startIndex: Int, length: Int): String {
        if (startIndex >= pendingModelBase64.length) return ""
        val endIndex = (startIndex + length).coerceAtMost(pendingModelBase64.length)
        return pendingModelBase64.substring(startIndex, endIndex)
    }

    @JavascriptInterface
    fun getPendingModelBase64(): String = pendingModelBase64

    @JavascriptInterface
    fun clearPendingModelData() {
        pendingModelBase64 = ""
    }

    @JavascriptInterface
    fun getPendingModelName(): String = pendingModelName

    @JavascriptInterface
    fun getPendingModelExt(): String = pendingModelExt

    @JavascriptInterface
    fun getPendingModelIcon(): String = pendingModelIcon

    @JavascriptInterface
    fun getPendingCategory(): String = pendingCategory

    @JavascriptInterface
    fun getPendingSubType(): String = pendingSubType

    @JavascriptInterface
    fun onWebGLTelemetry(gpuRenderer: String, fps: Int, drawCalls: Int, triangles: Int) {
        if (gpuRenderer.isNotBlank()) {
            _webglGpuInfo.value = gpuRenderer
        }
        _webglFps.value = fps
        _webglDrawCalls.value = drawCalls
        _webglTriangles.value = triangles
    }

    @JavascriptInterface
    fun vibrate(durationMs: Long, amplitude: Int) {
        try {
            vibrator?.let { v ->
                if (v.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val clampedAmp = amplitude.coerceIn(1, 255)
                        val clampedDur = durationMs.coerceIn(5, 500)
                        v.vibrate(VibrationEffect.createOneShot(clampedDur, clampedAmp))
                    } else {
                        @Suppress("DEPRECATION")
                        v.vibrate(durationMs.coerceIn(5, 500))
                    }
                }
            }
        } catch (_: Exception) {
            // Ignore vibration errors if hardware unsupported
        }
    }

    @JavascriptInterface
    fun onCharacterState(state: String) {
        _characterState.value = state
    }

    @JavascriptInterface
    fun onGameReady() {
        _isGameReady.value = true
    }

    @JavascriptInterface
    fun onBallKicked() {
        _ballKicks.value += 1
    }

    @JavascriptInterface
    fun onModelLoaded(name: String, success: Boolean) {
        if (success) {
            _currentModelName.value = name
            (context as? Activity)?.runOnUiThread {
                Toast.makeText(context, "已成功应用人物模型: $name", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @JavascriptInterface
    fun onModelLoadFailed(errorMessage: String) {
        (context as? Activity)?.runOnUiThread {
            Toast.makeText(context, "模型导入失败: $errorMessage", Toast.LENGTH_LONG).show()
        }
    }

    @JavascriptInterface
    fun onMusicVolumeChanged(volume: Float) {
        _musicVolume.value = volume.coerceIn(0f, 1f)
    }

    @JavascriptInterface
    fun onTrackChanged(index: Int) {
        _currentTrackIndex.value = index
    }

    @JavascriptInterface
    fun onBgmEnabledChanged(enabled: Boolean) {
        _isBgmEnabled.value = enabled
    }

    @JavascriptInterface
    fun onVegetationDensityChanged(density: Float) {
        _vegetationDensity.value = density.coerceIn(0f, 2f)
    }

    @JavascriptInterface
    fun onWeatherChanged(weatherKey: String, autoEnabled: Boolean) {
        if (weatherKey.isNotBlank()) {
            _currentWeather.value = weatherKey
        }
        _weatherAutoEnabled.value = autoEnabled
    }

    @JavascriptInterface
    fun onObjectTouched(targetId: String, targetName: String) {
        _lastTouchedObject.value = MagicWandTarget(targetId, targetName, "")
    }

    @JavascriptInterface
    fun onObjectTouchedWithParts(targetId: String, targetName: String, partsSpec: String) {
        _lastTouchedObject.value = MagicWandTarget(targetId, targetName, partsSpec)
    }

    @JavascriptInterface
    fun requestMagicWandCamera(targetId: String, targetName: String) {
        if (targetId.isNotBlank()) {
            _magicWandCameraRequest.value = MagicWandTarget(targetId, targetName.ifBlank { "3D 模型" }, "")
        }
    }

    @JavascriptInterface
    fun requestMagicWandCameraWithParts(targetId: String, targetName: String, partsSpec: String) {
        if (targetId.isNotBlank()) {
            _magicWandCameraRequest.value = MagicWandTarget(targetId, targetName.ifBlank { "3D 模型" }, partsSpec)
        }
    }

    @JavascriptInterface
    fun exitApp() {
        (context as? Activity)?.finish()
    }

    @JavascriptInterface
    fun showToast(message: String) {
        (context as? Activity)?.runOnUiThread {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }
}
