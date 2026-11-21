package com.example

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import androidx.camera.core.ImageProxy
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.min

enum class CustomSoundSlot(
    val key: String,
    val label: String,
    val icon: String,
    val desc: String,
    val maxTrimSeconds: Float = 3.0f
) {
    COLLISION("collision", "碰撞音效", "💥", "撞击建筑/树木/动物(仅单次)"),
    ATTACK("attack", "攻击音效", "⚔️", "挥舞武器或拳击"),
    JUMP("jump", "跳跃音效", "⬆️", "角色起跳瞬间"),
    WALK("walk", "走路音效", "👣", "草地/地面脚步声"),
    CAT("cat", "猫叫音效", "🐱", "小猫互动与叫声"),
    CHICKEN("chicken", "鸡叫音效", "🐔", "小鸡觅食咯咯叫"),
    SHEEP("sheep", "羊叫音效", "🐑", "草原绵羊咩咩叫"),
    WIND("wind", "环境风声", "🌬️", "微风持续背景音"),
    RAIN("rain", "雨声音效", "🌧️", "阴雨/雷雨环境雨声"),
    THUNDER("thunder", "环境雷声", "⚡", "雷鸣闪电环境音"),
    BGM("bgm", "自定义背景音", "🎵", "自定义录制循环背景音乐", maxTrimSeconds = 10.0f)
}

enum class CustomEnvTextureSlot(
    val key: String,
    val label: String,
    val icon: String,
    val desc: String
) {
    DESERT("desert", "沙漠贴图", "🏜️", "自定义沙漠沙丘地表纹理"),
    GRASS("grass", "草地贴图", "🌿", "自定义草原草坪地表纹理"),
    WATER("water", "水面贴图", "💧", "自定义湖泊清澈水面纹理")
}

object AudioCustomManager {
    const val SAMPLE_RATE = 16000
    const val MAX_RECORD_SECONDS = 12
    const val TRIM_WINDOW_SECONDS = 3.0f

    private fun getSoundsDir(context: Context): File {
        val dir = File(context.filesDir, "custom_sounds")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    private fun getEnvTexturesDir(context: Context): File {
        val dir = File(context.filesDir, "custom_env_textures")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    fun saveCustomWav(context: Context, slotKey: String, wavBytes: ByteArray): String {
        val outFile = File(getSoundsDir(context), "$slotKey.wav")
        outFile.writeBytes(wavBytes)
        val b64 = Base64.encodeToString(wavBytes, Base64.NO_WRAP)
        return "data:audio/wav;base64,$b64"
    }

    fun deleteCustomWav(context: Context, slotKey: String) {
        val f = File(getSoundsDir(context), "$slotKey.wav")
        if (f.exists()) f.delete()
    }

    fun getConfiguredSlotKeys(context: Context): Set<String> {
        val dir = getSoundsDir(context)
        return CustomSoundSlot.entries
            .filter { File(dir, "${it.key}.wav").exists() }
            .map { it.key }
            .toSet()
    }

    fun loadAllSavedCustomSounds(context: Context): Map<String, String> {
        val dir = getSoundsDir(context)
        val result = mutableMapOf<String, String>()
        CustomSoundSlot.entries.forEach { slot ->
            val file = File(dir, "${slot.key}.wav")
            if (file.exists() && file.length() > 44) {
                try {
                    val b64 = Base64.encodeToString(file.readBytes(), Base64.NO_WRAP)
                    result[slot.key] = "data:audio/wav;base64,$b64"
                } catch (_: Exception) {
                }
            }
        }
        return result
    }

    fun saveCustomEnvTexture(context: Context, envKey: String, sourceBitmap: Bitmap, targetSize: Int = 128): Pair<Bitmap, String> {
        val side = min(sourceBitmap.width, sourceBitmap.height).coerceAtLeast(1)
        val xOffset = ((sourceBitmap.width - side) / 2).coerceAtLeast(0)
        val yOffset = ((sourceBitmap.height - side) / 2).coerceAtLeast(0)
        val square = Bitmap.createBitmap(sourceBitmap, xOffset, yOffset, side, side)
        val lowRes = Bitmap.createScaledBitmap(square, targetSize, targetSize, true)
        if (square != sourceBitmap && square != lowRes) {
            square.recycle()
        }

        val outStream = ByteArrayOutputStream()
        lowRes.compress(Bitmap.CompressFormat.JPEG, 86, outStream)
        val jpegBytes = outStream.toByteArray()
        File(getEnvTexturesDir(context), "$envKey.jpg").writeBytes(jpegBytes)
        val b64 = Base64.encodeToString(jpegBytes, Base64.NO_WRAP)
        return Pair(lowRes, "data:image/jpeg;base64,$b64")
    }

    fun deleteCustomEnvTexture(context: Context, envKey: String) {
        val f = File(getEnvTexturesDir(context), "$envKey.jpg")
        if (f.exists()) f.delete()
    }

    fun getConfiguredEnvTextureKeys(context: Context): Set<String> {
        val dir = getEnvTexturesDir(context)
        return CustomEnvTextureSlot.entries
            .filter { File(dir, "${it.key}.jpg").exists() }
            .map { it.key }
            .toSet()
    }

    fun loadAllSavedEnvTextures(context: Context): Map<String, String> {
        val dir = getEnvTexturesDir(context)
        val result = mutableMapOf<String, String>()
        CustomEnvTextureSlot.entries.forEach { slot ->
            val file = File(dir, "${slot.key}.jpg")
            if (file.exists() && file.length() > 16) {
                try {
                    val b64 = Base64.encodeToString(file.readBytes(), Base64.NO_WRAP)
                    result[slot.key] = "data:image/jpeg;base64,$b64"
                } catch (_: Exception) {
                }
            }
        }
        return result
    }

    fun decodeBitmapFromUri(context: Context, uri: Uri): Bitmap? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val src = ImageDecoder.createSource(context.contentResolver, uri)
                ImageDecoder.decodeBitmap(src) { decoder, info, _ ->
                    val maxDim = maxOf(info.size.width, info.size.height).coerceAtLeast(1)
                    if (maxDim > 512) {
                        val scale = 512f / maxDim
                        decoder.setTargetSize(
                            (info.size.width * scale).toInt().coerceAtLeast(1),
                            (info.size.height * scale).toInt().coerceAtLeast(1)
                        )
                    }
                    decoder.isMutableRequired = true
                }
            } else {
                @Suppress("DEPRECATION")
                MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
            }
        } catch (_: Exception) {
            null
        }
    }

    fun slicePcmSamples(
        samples: ShortArray,
        startSec: Float,
        durationSec: Float,
        maxTrimSeconds: Float = TRIM_WINDOW_SECONDS
    ): ShortArray {
        if (samples.isEmpty()) return ShortArray(0)
        val totalDurSec = samples.size.toFloat() / SAMPLE_RATE
        val clampedStart = startSec.coerceIn(0f, (totalDurSec - 0.1f).coerceAtLeast(0f))
        val clampedDur = durationSec.coerceIn(0.2f, maxTrimSeconds.coerceAtLeast(0.2f))
        val startIdx = (clampedStart * SAMPLE_RATE).toInt().coerceIn(0, samples.size - 1)
        val endIdx = ((clampedStart + clampedDur) * SAMPLE_RATE).toInt().coerceIn(startIdx + 1, samples.size)
        return samples.copyOfRange(startIdx, endIdx)
    }

    fun buildWaveformBars(samples: ShortArray, barCount: Int = 56): List<Float> {
        if (samples.isEmpty() || barCount <= 0) return List(barCount.coerceAtLeast(1)) { 0.08f }
        val step = (samples.size / barCount).coerceAtLeast(1)
        return (0 until barCount).map { i ->
            val from = (i * step).coerceAtMost(samples.size - 1)
            val to = min(samples.size, from + step)
            var peak = 0
            for (idx in from until to) {
                val amp = abs(samples[idx].toInt())
                if (amp > peak) peak = amp
            }
            (peak / 32767f).coerceIn(0.06f, 1f)
        }
    }

    fun encodePcmToWav(samples: ShortArray, sampleRate: Int = SAMPLE_RATE): ByteArray {
        val byteDataLen = samples.size * 2
        val totalLen = 36 + byteDataLen
        val buffer = ByteBuffer.allocate(44 + byteDataLen).order(ByteOrder.LITTLE_ENDIAN)

        // RIFF header
        buffer.put('R'.code.toByte())
        buffer.put('I'.code.toByte())
        buffer.put('F'.code.toByte())
        buffer.put('F'.code.toByte())
        buffer.putInt(totalLen)
        buffer.put('W'.code.toByte())
        buffer.put('A'.code.toByte())
        buffer.put('V'.code.toByte())
        buffer.put('E'.code.toByte())

        // fmt chunk
        buffer.put('f'.code.toByte())
        buffer.put('m'.code.toByte())
        buffer.put('t'.code.toByte())
        buffer.put(' '.code.toByte())
        buffer.putInt(16) // PCM chunk size
        buffer.putShort(1.toShort()) // PCM format
        buffer.putShort(1.toShort()) // Mono
        buffer.putInt(sampleRate)
        buffer.putInt(sampleRate * 2) // Byte rate
        buffer.putShort(2.toShort()) // Block align
        buffer.putShort(16.toShort()) // Bits per sample

        // data chunk
        buffer.put('d'.code.toByte())
        buffer.put('a'.code.toByte())
        buffer.put('t'.code.toByte())
        buffer.put('a'.code.toByte())
        buffer.putInt(byteDataLen)

        samples.forEach { sample ->
            buffer.putShort(sample)
        }
        return buffer.array()
    }

    fun createStaticAudioTrack(samples: ShortArray, sampleRate: Int = SAMPLE_RATE): AudioTrack? {
        if (samples.isEmpty()) return null
        val byteLen = samples.size * 2
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(byteLen.coerceAtLeast(4096))
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()

        track.write(samples, 0, samples.size)
        return track
    }

    fun imageProxyToBitmap(imageProxy: ImageProxy): Bitmap? {
        return try {
            val plane = imageProxy.planes.firstOrNull() ?: return null
            val buffer = plane.buffer
            val bytes = ByteArray(buffer.remaining())
            buffer.get(bytes)
            val rawBitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
            val rotation = imageProxy.imageInfo.rotationDegrees
            if (rotation != 0) {
                val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
                val rotated = Bitmap.createBitmap(
                    rawBitmap,
                    0,
                    0,
                    rawBitmap.width,
                    rawBitmap.height,
                    matrix,
                    true
                )
                if (rotated != rawBitmap) rawBitmap.recycle()
                rotated
            } else {
                rawBitmap
            }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Center-crops the captured camera bitmap into a square and downscales to a crisp
     * low-resolution 96x96 texture (returned as both Bitmap preview & JPEG Base64 data URL).
     */
    fun convertBitmapToLowResTexture(source: Bitmap, targetSize: Int = 96): Pair<Bitmap, String> {
        val side = min(source.width, source.height).coerceAtLeast(1)
        val xOffset = ((source.width - side) / 2).coerceAtLeast(0)
        val yOffset = ((source.height - side) / 2).coerceAtLeast(0)
        val square = Bitmap.createBitmap(source, xOffset, yOffset, side, side)
        val lowRes = Bitmap.createScaledBitmap(square, targetSize, targetSize, false)
        if (square != source && square != lowRes) {
            square.recycle()
        }

        val outStream = ByteArrayOutputStream()
        lowRes.compress(Bitmap.CompressFormat.JPEG, 82, outStream)
        val b64 = Base64.encodeToString(outStream.toByteArray(), Base64.NO_WRAP)
        return Pair(lowRes, "data:image/jpeg;base64,$b64")
    }
}
