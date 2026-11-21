package com.example

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale
import kotlin.math.abs

@Composable
fun AudioRecorderDialog(
    slot: CustomSoundSlot,
    onDismiss: () -> Unit,
    onConfirmWavDataUrl: (String) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var hasRecordPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasRecordPermission = granted
        if (!granted) {
            Toast.makeText(context, "未授予录音权限，无法录制自定义音效", Toast.LENGTH_SHORT).show()
        }
    }

    var isRecording by remember { mutableStateOf(false) }
    var liveLevel by remember { mutableFloatStateOf(0f) }
    var recordedSamples by remember { mutableStateOf<ShortArray?>(null) }
    val maxTrimSec = slot.maxTrimSeconds
    var trimStartSec by remember { mutableFloatStateOf(0f) }
    var trimDurationSec by remember { mutableFloatStateOf(maxTrimSec) }
    var isPlayingPreview by remember { mutableStateOf(false) }
    var recordElapsedSec by remember { mutableFloatStateOf(0f) }

    var recordJob by remember { mutableStateOf<Job?>(null) }
    var activeTrack by remember { mutableStateOf<AudioTrack?>(null) }
    var previewJob by remember { mutableStateOf<Job?>(null) }

    fun stopPreviewPlayback() {
        previewJob?.cancel()
        previewJob = null
        try {
            activeTrack?.stop()
            activeTrack?.release()
        } catch (_: Exception) {
        }
        activeTrack = null
        isPlayingPreview = false
    }

    fun stopRecordingInternal() {
        isRecording = false
    }

    DisposableEffect(Unit) {
        onDispose {
            isRecording = false
            recordJob?.cancel()
            stopPreviewPlayback()
        }
    }

    @SuppressLint("MissingPermission")
    fun startRecording() {
        if (!hasRecordPermission) {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            return
        }
        stopPreviewPlayback()
        recordedSamples = null
        recordElapsedSec = 0f
        isRecording = true

        recordJob = coroutineScope.launch(Dispatchers.IO) {
            val minBuf = AudioRecord.getMinBufferSize(
                AudioCustomManager.SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            ).coerceAtLeast(2048)

            var audioRecord: AudioRecord? = null
            try {
                audioRecord = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    AudioCustomManager.SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    minBuf * 2
                )
                if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
                    withContext(Dispatchers.Main) {
                        isRecording = false
                        Toast.makeText(context, "麦克风初始化失败，请重试", Toast.LENGTH_SHORT).show()
                    }
                    return@launch
                }

                val maxSamples = AudioCustomManager.SAMPLE_RATE * AudioCustomManager.MAX_RECORD_SECONDS
                val collected = ArrayList<Short>(AudioCustomManager.SAMPLE_RATE * 4)
                val readChunk = ShortArray(1024)

                audioRecord.startRecording()
                while (isActive && isRecording && collected.size < maxSamples) {
                    val count = audioRecord.read(readChunk, 0, readChunk.size)
                    if (count > 0) {
                        var peak = 0
                        for (i in 0 until count) {
                            val s = readChunk[i]
                            collected.add(s)
                            val amp = abs(s.toInt())
                            if (amp > peak) peak = amp
                        }
                        val normPeak = (peak / 32767f).coerceIn(0f, 1f)
                        val elapsed = collected.size.toFloat() / AudioCustomManager.SAMPLE_RATE
                        withContext(Dispatchers.Main) {
                            liveLevel = normPeak
                            recordElapsedSec = elapsed
                        }
                    }
                }

                val finalArray = ShortArray(collected.size) { collected[it] }
                val totalDur = finalArray.size.toFloat() / AudioCustomManager.SAMPLE_RATE
                withContext(Dispatchers.Main) {
                    isRecording = false
                    liveLevel = 0f
                    recordedSamples = finalArray
                    trimStartSec = 0f
                    trimDurationSec = totalDur.coerceIn(0.2f, maxTrimSec)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    isRecording = false
                    Toast.makeText(context, "录音异常: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            } finally {
                try {
                    audioRecord?.stop()
                    audioRecord?.release()
                } catch (_: Exception) {
                }
            }
        }
    }

    fun playTrimmedPreview() {
        val samples = recordedSamples ?: return
        if (samples.isEmpty()) return
        if (isPlayingPreview) {
            stopPreviewPlayback()
            return
        }
        val sliced = AudioCustomManager.slicePcmSamples(samples, trimStartSec, trimDurationSec, maxTrimSec)
        if (sliced.isEmpty()) return

        isPlayingPreview = true
        previewJob = coroutineScope.launch(Dispatchers.IO) {
            try {
                val track = AudioCustomManager.createStaticAudioTrack(sliced)
                if (track == null) {
                    withContext(Dispatchers.Main) { isPlayingPreview = false }
                    return@launch
                }
                withContext(Dispatchers.Main) { activeTrack = track }
                track.play()
                val durationMs = ((sliced.size.toFloat() / AudioCustomManager.SAMPLE_RATE) * 1000).toLong()
                delay(durationMs + 120L)
            } catch (_: Exception) {
            } finally {
                withContext(Dispatchers.Main) {
                    stopPreviewPlayback()
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = {
            stopRecordingInternal()
            stopPreviewPlayback()
            onDismiss()
        },
        title = {
            Text(
                text = "${slot.icon} 自定义${slot.label}",
                style = MaterialTheme.typography.titleMedium.copy(fontSize = 15.sp),
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "用途: ${slot.desc} · 录制后可手动截取最多 ${maxTrimSec.toInt()} 秒音频",
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (!hasRecordPermission) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.45f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "🎙️ 需要麦克风录音权限",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                            Text(
                                text = "请授予录音权限以录制游戏交互与环境音效（音频仅保存在本机）。",
                                fontSize = 10.sp
                            )
                            Button(
                                onClick = { permissionLauncher.launch(Manifest.permission.RECORD_AUDIO) },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("立即请求录音权限", fontSize = 11.sp)
                            }
                        }
                    }
                } else {
                    // Record button + Live Level
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                if (isRecording) stopRecordingInternal() else startRecording()
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isRecording) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                            ),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = if (isRecording) Icons.Default.Stop else Icons.Default.Mic,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isRecording) {
                                    "停止录制 (${String.format(Locale.US, "%.1f", recordElapsedSec)}s)"
                                } else if (recordedSamples != null) {
                                    "重新录制"
                                } else {
                                    "开始录制音效"
                                },
                                fontSize = 11.sp
                            )
                        }
                    }

                    if (isRecording) {
                        LinearProgressIndicator(
                            progress = { liveLevel },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp))
                        )
                    }

                    // Waveform & Manual 3-Second Trimmer
                    val samples = recordedSamples
                    if (samples != null && samples.isNotEmpty()) {
                        val totalDuration = (samples.size.toFloat() / AudioCustomManager.SAMPLE_RATE).coerceAtLeast(0.1f)
                        val bars = remember(samples) { AudioCustomManager.buildWaveformBars(samples, 48) }
                        val maxWindowStart = (totalDuration - trimDurationSec).coerceAtLeast(0f)

                        val barAccent = MaterialTheme.colorScheme.primary
                        val barMuted = MaterialTheme.colorScheme.outlineVariant
                        val selOverlay = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(8.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "已录制 ${String.format(Locale.US, "%.1f", totalDuration)}s · 截取区间: " +
                                        "${String.format(Locale.US, "%.1f", trimStartSec)}s ~ " +
                                        "${String.format(Locale.US, "%.1f", (trimStartSec + trimDurationSec).coerceAtMost(totalDuration))}s " +
                                        "(${String.format(Locale.US, "%.1f", trimDurationSec)}s)",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.primary
                                )

                                // Waveform Canvas showing highlighted 3s window
                                Canvas(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(48.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(MaterialTheme.colorScheme.surface)
                                ) {
                                    val startFrac = (trimStartSec / totalDuration).coerceIn(0f, 1f)
                                    val endFrac = ((trimStartSec + trimDurationSec) / totalDuration).coerceIn(0f, 1f)
                                    val selLeft = startFrac * size.width
                                    val selWidth = ((endFrac - startFrac) * size.width).coerceAtLeast(4f)

                                    drawRect(
                                        color = selOverlay,
                                        topLeft = Offset(selLeft, 0f),
                                        size = Size(selWidth, size.height)
                                    )

                                    val colW = size.width / bars.size
                                    bars.forEachIndexed { idx, amp ->
                                        val frac = idx.toFloat() / bars.size
                                        val inWindow = frac in startFrac..endFrac
                                        val bh = (amp * size.height * 0.86f).coerceAtLeast(4f)
                                        drawRoundRect(
                                            color = if (inWindow) barAccent else barMuted,
                                            topLeft = Offset(idx * colW + 1f, (size.height - bh) * 0.5f),
                                            size = Size((colW - 2f).coerceAtLeast(2f), bh),
                                            cornerRadius = CornerRadius(2f, 2f)
                                        )
                                    }
                                }

                                if (maxWindowStart > 0.05f) {
                                    Text(
                                        text = "手动滑动截取起点 (最多截取 ${maxTrimSec.toInt()} 秒):",
                                        fontSize = 9.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Slider(
                                        value = trimStartSec.coerceIn(0f, maxWindowStart),
                                        onValueChange = { trimStartSec = it },
                                        valueRange = 0f..maxWindowStart,
                                        modifier = Modifier.height(26.dp)
                                    )
                                }

                                val maxSpan = totalDuration.coerceIn(0.2f, maxTrimSec)
                                if (maxSpan > 0.35f) {
                                    Text(
                                        text = "截取长度调节 (${String.format(Locale.US, "%.1f", trimDurationSec)}s / ${maxTrimSec.toInt()}.0s上限):",
                                        fontSize = 9.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Slider(
                                        value = trimDurationSec.coerceIn(0.2f, maxSpan),
                                        onValueChange = { newDur ->
                                            trimDurationSec = newDur
                                            val newMaxStart = (totalDuration - newDur).coerceAtLeast(0f)
                                            if (trimStartSec > newMaxStart) trimStartSec = newMaxStart
                                        },
                                        valueRange = 0.2f..maxSpan,
                                        modifier = Modifier.height(26.dp)
                                    )
                                }

                                FilledTonalButton(
                                    onClick = { playTrimmedPreview() },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(
                                        imageVector = if (isPlayingPreview) Icons.Default.Stop else Icons.Default.PlayArrow,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = if (isPlayingPreview) "停止试听" else "试听截取的音频片段",
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                enabled = !isRecording && recordedSamples != null && recordedSamples!!.isNotEmpty(),
                onClick = {
                    stopPreviewPlayback()
                    val samples = recordedSamples ?: return@Button
                    coroutineScope.launch(Dispatchers.IO) {
                        val sliced = AudioCustomManager.slicePcmSamples(samples, trimStartSec, trimDurationSec, maxTrimSec)
                        val wavBytes = AudioCustomManager.encodePcmToWav(sliced)
                        val dataUrl = AudioCustomManager.saveCustomWav(context, slot.key, wavBytes)
                        withContext(Dispatchers.Main) {
                            onConfirmWavDataUrl(dataUrl)
                        }
                    }
                }
            ) {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(15.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("确认放入游戏", fontSize = 11.sp)
            }
        },
        dismissButton = {
            TextButton(
                onClick = {
                    stopRecordingInternal()
                    stopPreviewPlayback()
                    onDismiss()
                }
            ) {
                Text("取消", fontSize = 11.sp)
            }
        }
    )
}

@Composable
fun MagicWandCameraDialog(
    target: MagicWandTarget,
    onDismiss: () -> Unit,
    onApplyTextureDataUrl: (dataUrl: String, partKey: String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()

    val partOptions = remember(target) {
        val parsed = target.parsedParts()
        if (parsed.isNotEmpty()) parsed else listOf("all" to "整个模型")
    }
    var selectedPartKey by remember(target) {
        mutableStateOf(partOptions.firstOrNull()?.first ?: "all")
    }
    val selectedPartLabel = partOptions.firstOrNull { it.first == selectedPartKey }?.second ?: "整个模型"

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (!granted) {
            Toast.makeText(context, "未授予相机权限，无法拍摄贴图", Toast.LENGTH_SHORT).show()
        }
    }

    var capturedLowResBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var capturedDataUrl by remember { mutableStateOf<String?>(null) }
    var cameraErrorMsg by remember { mutableStateOf<String?>(null) }
    var isCapturing by remember { mutableStateOf(false) }
    var lensFacing by remember { mutableIntStateOf(CameraSelector.LENS_FACING_BACK) }

    val previewView = remember { PreviewView(context) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var boundCameraProvider by remember { mutableStateOf<ProcessCameraProvider?>(null) }

    LaunchedEffect(hasCameraPermission, lensFacing, capturedLowResBitmap) {
        if (!hasCameraPermission || capturedLowResBitmap != null) return@LaunchedEffect
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            try {
                val cameraProvider = cameraProviderFuture.get()
                boundCameraProvider = cameraProvider
                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }
                val capture = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .build()

                val selector = CameraSelector.Builder()
                    .requireLensFacing(lensFacing)
                    .build()

                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(lifecycleOwner, selector, preview, capture)
                imageCapture = capture
                cameraErrorMsg = null
            } catch (e: Exception) {
                cameraErrorMsg = "相机启动失败: ${e.localizedMessage ?: "当前设备无可用相机"}"
            }
        }, ContextCompat.getMainExecutor(context))
    }

    DisposableEffect(Unit) {
        onDispose {
            try {
                boundCameraProvider?.unbindAll()
            } catch (_: Exception) {
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "🪄 魔法棒分部位贴图",
                style = MaterialTheme.typography.titleMedium.copy(fontSize = 14.sp),
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "目标模型: ${target.name} · 当前贴图部位: $selectedPartLabel",
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.sp),
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold
                )

                if (partOptions.size > 1) {
                    Text(
                        text = "选择要更换贴图的部位:",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        partOptions.forEach { (partKey, partLabel) ->
                            val isSel = (partKey == selectedPartKey)
                            Card(
                                modifier = Modifier.clickable { selectedPartKey = partKey },
                                shape = RoundedCornerShape(8.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSel) {
                                        MaterialTheme.colorScheme.primaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant
                                    }
                                ),
                                border = if (isSel) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null
                            ) {
                                Text(
                                    text = partLabel,
                                    fontSize = 10.sp,
                                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                )
                            }
                        }
                    }
                }

                if (!hasCameraPermission) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.45f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(10.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("📷 需要相机拍摄权限", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Text("请授予相机权限以拍摄现实物品，自动转为 96×96 低清纹理贴给所选部位。", fontSize = 10.sp)
                            Button(
                                onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("请求相机权限", fontSize = 11.sp)
                            }
                        }
                    }
                } else if (capturedLowResBitmap != null) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "✨ 96×96 低清纹理已就绪（将贴给「$selectedPartLabel」）：",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Image(
                            bitmap = capturedLowResBitmap!!.asImageBitmap(),
                            contentDescription = "低分辨率纹理预览",
                            filterQuality = FilterQuality.None,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(120.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.Black)
                        )
                        OutlinedButton(
                            onClick = {
                                capturedLowResBitmap = null
                                capturedDataUrl = null
                            }
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("重新拍摄", fontSize = 10.sp)
                        }
                    }
                } else if (cameraErrorMsg != null) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = cameraErrorMsg!!,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(155.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.Black)
                    ) {
                        AndroidView(
                            factory = { previewView },
                            modifier = Modifier.fillMaxSize()
                        )
                        FilledTonalButton(
                            onClick = {
                                lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK) {
                                    CameraSelector.LENS_FACING_FRONT
                                } else {
                                    CameraSelector.LENS_FACING_BACK
                                }
                            },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(6.dp)
                                .height(28.dp)
                        ) {
                            Text("切换镜头", fontSize = 9.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (hasCameraPermission && capturedLowResBitmap == null && cameraErrorMsg == null) {
                Button(
                    enabled = !isCapturing && imageCapture != null,
                    onClick = {
                        val capture = imageCapture ?: return@Button
                        isCapturing = true
                        capture.takePicture(
                            ContextCompat.getMainExecutor(context),
                            object : ImageCapture.OnImageCapturedCallback() {
                                override fun onCaptureSuccess(image: ImageProxy) {
                                    coroutineScope.launch(Dispatchers.Default) {
                                        val bmp = AudioCustomManager.imageProxyToBitmap(image)
                                        image.close()
                                        if (bmp != null) {
                                            val (lowResBmp, dataUrl) = AudioCustomManager.convertBitmapToLowResTexture(bmp, 96)
                                            if (bmp != lowResBmp) bmp.recycle()
                                            withContext(Dispatchers.Main) {
                                                capturedLowResBitmap = lowResBmp
                                                capturedDataUrl = dataUrl
                                                isCapturing = false
                                            }
                                        } else {
                                            withContext(Dispatchers.Main) {
                                                isCapturing = false
                                                Toast.makeText(context, "拍照图像处理失败", Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                    }
                                }

                                override fun onError(exception: ImageCaptureException) {
                                    isCapturing = false
                                    Toast.makeText(context, "拍照失败: ${exception.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        )
                    }
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (isCapturing) "处理中…" else "拍照生成低清贴图", fontSize = 11.sp)
                }
            } else if (capturedDataUrl != null) {
                Button(
                    onClick = {
                        onApplyTextureDataUrl(capturedDataUrl!!, selectedPartKey)
                    }
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("贴到「$selectedPartLabel」", fontSize = 11.sp)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("关闭", fontSize = 11.sp)
            }
        }
    )
}

@Composable
fun EnvTextureDialog(
    slot: CustomEnvTextureSlot,
    onDismiss: () -> Unit,
    onConfirmTextureDataUrl: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()

    var useCameraMode by remember { mutableStateOf(false) }
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
        if (!granted) {
            useCameraMode = false
            Toast.makeText(context, "未授予相机权限，可使用相册图片代替", Toast.LENGTH_SHORT).show()
        }
    }

    var previewBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var pendingDataUrl by remember { mutableStateOf<String?>(null) }
    var isProcessing by remember { mutableStateOf(false) }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            isProcessing = true
            coroutineScope.launch(Dispatchers.IO) {
                val bmp = AudioCustomManager.decodeBitmapFromUri(context, uri)
                if (bmp != null) {
                    val (lowRes, dataUrl) = AudioCustomManager.saveCustomEnvTexture(context, slot.key, bmp, 128)
                    if (bmp != lowRes) bmp.recycle()
                    withContext(Dispatchers.Main) {
                        previewBitmap = lowRes
                        pendingDataUrl = dataUrl
                        isProcessing = false
                        useCameraMode = false
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        isProcessing = false
                        Toast.makeText(context, "读取图片失败，请换一张图片重试", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    val previewView = remember { PreviewView(context) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var boundCameraProvider by remember { mutableStateOf<ProcessCameraProvider?>(null) }
    var cameraErrorMsg by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(useCameraMode, hasCameraPermission, previewBitmap) {
        if (!useCameraMode || !hasCameraPermission || previewBitmap != null) return@LaunchedEffect
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            try {
                val provider = future.get()
                boundCameraProvider = provider
                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }
                val capture = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .build()
                provider.unbindAll()
                provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, capture)
                imageCapture = capture
                cameraErrorMsg = null
            } catch (e: Exception) {
                cameraErrorMsg = "相机启动失败: ${e.localizedMessage ?: "当前设备无可用相机"}"
            }
        }, ContextCompat.getMainExecutor(context))
    }

    DisposableEffect(Unit) {
        onDispose {
            try {
                boundCameraProvider?.unbindAll()
            } catch (_: Exception) {
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "${slot.icon} 自定义${slot.label}",
                style = MaterialTheme.typography.titleMedium.copy(fontSize = 14.sp),
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "${slot.desc}（支持相册选图或相机拍照自动转为平铺纹理）",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilledTonalButton(
                        onClick = {
                            useCameraMode = false
                            photoPickerLauncher.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.PhotoLibrary, contentDescription = null, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("从相册选择", fontSize = 11.sp)
                    }

                    OutlinedButton(
                        onClick = {
                            previewBitmap = null
                            pendingDataUrl = null
                            if (hasCameraPermission) {
                                useCameraMode = true
                            } else {
                                useCameraMode = true
                                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                            }
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(15.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("拍照采集", fontSize = 11.sp)
                    }
                }

                if (previewBitmap != null) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("✅ 128×128 平铺环境纹理预览:", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        Image(
                            bitmap = previewBitmap!!.asImageBitmap(),
                            contentDescription = "自定义环境贴图预览",
                            filterQuality = FilterQuality.None,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(116.dp)
                                .clip(RoundedCornerShape(10.dp))
                        )
                    }
                } else if (useCameraMode && hasCameraPermission) {
                    if (cameraErrorMsg != null) {
                        Text(cameraErrorMsg!!, fontSize = 10.sp, color = MaterialTheme.colorScheme.error)
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(148.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.Black)
                        ) {
                            AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (useCameraMode && hasCameraPermission && previewBitmap == null && cameraErrorMsg == null) {
                Button(
                    enabled = !isProcessing && imageCapture != null,
                    onClick = {
                        val cap = imageCapture ?: return@Button
                        isProcessing = true
                        cap.takePicture(
                            ContextCompat.getMainExecutor(context),
                            object : ImageCapture.OnImageCapturedCallback() {
                                override fun onCaptureSuccess(image: ImageProxy) {
                                    coroutineScope.launch(Dispatchers.IO) {
                                        val bmp = AudioCustomManager.imageProxyToBitmap(image)
                                        image.close()
                                        if (bmp != null) {
                                            val (lowRes, dataUrl) = AudioCustomManager.saveCustomEnvTexture(context, slot.key, bmp, 128)
                                            if (bmp != lowRes) bmp.recycle()
                                            withContext(Dispatchers.Main) {
                                                previewBitmap = lowRes
                                                pendingDataUrl = dataUrl
                                                useCameraMode = false
                                                isProcessing = false
                                            }
                                        } else {
                                            withContext(Dispatchers.Main) { isProcessing = false }
                                        }
                                    }
                                }

                                override fun onError(exception: ImageCaptureException) {
                                    isProcessing = false
                                    Toast.makeText(context, "拍照失败: ${exception.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        )
                    }
                ) {
                    Text(if (isProcessing) "处理中…" else "拍摄并生成贴图", fontSize = 11.sp)
                }
            } else if (pendingDataUrl != null) {
                Button(
                    onClick = { onConfirmTextureDataUrl(pendingDataUrl!!) }
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("应用到${slot.label}", fontSize = 11.sp)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("关闭", fontSize = 11.sp)
            }
        }
    )
}
