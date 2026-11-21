package com.example

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ExampleRobolectricTest {

  @Test
  fun readAppNameFromContext() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("Summer Afternoon", appName)
  }

  @Test
  fun testGameWebAppInterfaceStateTransitions() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val webAppInterface = GameWebAppInterface(context)

    assertEquals("idle", webAppInterface.characterState.value)
    assertEquals(false, webAppInterface.isGameReady.value)
    assertEquals(0, webAppInterface.ballKicks.value)
    assertEquals("草帽探险家", webAppInterface.currentModelName.value)
    assertNull(webAppInterface.lastTouchedObject.value)
    assertNull(webAppInterface.magicWandCameraRequest.value)

    webAppInterface.onCharacterState("walk")
    assertEquals("walk", webAppInterface.characterState.value)

    webAppInterface.onGameReady()
    assertEquals(true, webAppInterface.isGameReady.value)

    webAppInterface.onBallKicked()
    assertEquals(1, webAppInterface.ballKicks.value)

    webAppInterface.onModelLoaded("小橘猫", true)
    assertEquals("小橘猫", webAppInterface.currentModelName.value)

    webAppInterface.onObjectTouched("tree_1_2", "橡树")
    assertEquals(MagicWandTarget("tree_1_2", "橡树", ""), webAppInterface.lastTouchedObject.value)

    webAppInterface.onObjectTouchedWithParts("0_0_cabin_main", "起点木屋", "roof:屋顶,wall:外墙,window:窗子,door:门")
    val cabinTarget = webAppInterface.lastTouchedObject.value
    assertNotNull(cabinTarget)
    assertEquals(
      listOf("roof" to "屋顶", "wall" to "外墙", "window" to "窗子", "door" to "门"),
      cabinTarget!!.parsedParts()
    )

    webAppInterface.requestMagicWandCameraWithParts("0_0_cabin_main", "起点木屋", "roof:屋顶,wall:外墙")
    assertEquals(
      MagicWandTarget("0_0_cabin_main", "起点木屋", "roof:屋顶,wall:外墙"),
      webAppInterface.magicWandCameraRequest.value
    )

    webAppInterface.consumeMagicWandCameraRequest()
    assertNull(webAppInterface.magicWandCameraRequest.value)

    webAppInterface.onBgmEnabledChanged(false)
    assertEquals(false, webAppInterface.isBgmEnabled.value)

    webAppInterface.onVegetationDensityChanged(1.6f)
    assertEquals(1.6f, webAppInterface.vegetationDensity.value, 0.001f)

    webAppInterface.onWeatherChanged("thunderstorm", false)
    assertEquals("thunderstorm", webAppInterface.currentWeather.value)
    assertEquals(false, webAppInterface.weatherAutoEnabled.value)
  }

  @Test
  fun testCustomSoundSlotsCoverAllRequestedCategories() {
    val keys = CustomSoundSlot.entries.map { it.key }.toSet()
    val expected = setOf(
      "collision", "attack", "jump", "walk",
      "cat", "chicken", "sheep",
      "wind", "rain", "thunder", "bgm"
    )
    assertEquals(expected, keys)
    assertEquals(10.0f, CustomSoundSlot.BGM.maxTrimSeconds, 0.001f)
    assertEquals(3.0f, CustomSoundSlot.COLLISION.maxTrimSeconds, 0.001f)
  }

  @Test
  fun testAudioCustomManagerPcmSliceAndWavPersistence() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    // 11 seconds of 16kHz PCM audio
    val totalSamples = AudioCustomManager.SAMPLE_RATE * 11
    val samples = ShortArray(totalSamples) { i -> ((i % 200) * 100).toShort() }

    // Standard SFX slot clamps to 3.0s max window
    val slicedSfx = AudioCustomManager.slicePcmSamples(samples, startSec = 1.0f, durationSec = 5.0f)
    assertEquals(AudioCustomManager.SAMPLE_RATE * 3, slicedSfx.size)

    // BGM slot allows up to 10.0s window
    val slicedBgm = AudioCustomManager.slicePcmSamples(
      samples,
      startSec = 0.0f,
      durationSec = 10.0f,
      maxTrimSeconds = CustomSoundSlot.BGM.maxTrimSeconds
    )
    assertEquals(AudioCustomManager.SAMPLE_RATE * 10, slicedBgm.size)

    val bars = AudioCustomManager.buildWaveformBars(slicedSfx, barCount = 32)
    assertEquals(32, bars.size)
    assertTrue(bars.all { it in 0.06f..1.0f })

    val wavBytes = AudioCustomManager.encodePcmToWav(slicedSfx)
    assertEquals(44 + slicedSfx.size * 2, wavBytes.size)
    assertEquals('R'.code.toByte(), wavBytes[0])
    assertEquals('I'.code.toByte(), wavBytes[1])
    assertEquals('F'.code.toByte(), wavBytes[2])
    assertEquals('F'.code.toByte(), wavBytes[3])
    assertEquals('W'.code.toByte(), wavBytes[8])
    assertEquals('A'.code.toByte(), wavBytes[9])
    assertEquals('V'.code.toByte(), wavBytes[10])
    assertEquals('E'.code.toByte(), wavBytes[11])

    val dataUrl = AudioCustomManager.saveCustomWav(context, CustomSoundSlot.COLLISION.key, wavBytes)
    assertTrue(dataUrl.startsWith("data:audio/wav;base64,"))
    assertTrue(AudioCustomManager.getConfiguredSlotKeys(context).contains("collision"))
    assertTrue(AudioCustomManager.loadAllSavedCustomSounds(context).containsKey("collision"))

    AudioCustomManager.deleteCustomWav(context, CustomSoundSlot.COLLISION.key)
    assertTrue(!AudioCustomManager.getConfiguredSlotKeys(context).contains("collision"))
  }

  @Test
  fun testConvertBitmapToLowResTextureAndCustomEnvPersistence() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val wideBitmap = Bitmap.createBitmap(400, 200, Bitmap.Config.ARGB_8888)
    wideBitmap.eraseColor(Color.GREEN)

    val (lowRes, dataUrl) = AudioCustomManager.convertBitmapToLowResTexture(wideBitmap, targetSize = 96)
    assertEquals(96, lowRes.width)
    assertEquals(96, lowRes.height)
    assertTrue(dataUrl.startsWith("data:image/jpeg;base64,"))

    val envKeys = CustomEnvTextureSlot.entries.map { it.key }.toSet()
    assertEquals(setOf("desert", "grass", "water"), envKeys)

    val (envBitmap, envDataUrl) = AudioCustomManager.saveCustomEnvTexture(context, CustomEnvTextureSlot.GRASS.key, wideBitmap)
    assertEquals(128, envBitmap.width)
    assertEquals(128, envBitmap.height)
    assertTrue(envDataUrl.startsWith("data:image/jpeg;base64,"))
    assertTrue(AudioCustomManager.getConfiguredEnvTextureKeys(context).contains("grass"))
    assertTrue(AudioCustomManager.loadAllSavedEnvTextures(context).containsKey("grass"))

    AudioCustomManager.deleteCustomEnvTexture(context, CustomEnvTextureSlot.GRASS.key)
    assertTrue(!AudioCustomManager.getConfiguredEnvTextureKeys(context).contains("grass"))

    envBitmap.recycle()
    lowRes.recycle()
    wideBitmap.recycle()
  }

  @Test
  fun testAssetsBundledLocally() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val assetManager = context.assets

    val threeJsStream = assetManager.open("three.min.js")
    assertNotNull(threeJsStream)
    assertTrue(threeJsStream.available() > 100000)
    threeJsStream.close()

    val gltfLoaderStream = assetManager.open("GLTFLoader.js")
    assertNotNull(gltfLoaderStream)
    assertTrue(gltfLoaderStream.available() > 50000)
    gltfLoaderStream.close()

    val objLoaderStream = assetManager.open("OBJLoader.js")
    assertNotNull(objLoaderStream)
    assertTrue(objLoaderStream.available() > 10000)
    objLoaderStream.close()

    val indexStream = assetManager.open("index.html")
    assertNotNull(indexStream)
    assertTrue(indexStream.available() > 100)
    indexStream.close()

    val gameStream = assetManager.open("game.js")
    assertNotNull(gameStream)
    assertTrue(gameStream.available() > 500)
    gameStream.close()
  }
}
