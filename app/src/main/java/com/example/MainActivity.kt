package com.example

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.util.Base64
import android.view.WindowManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import org.json.JSONObject
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.FileOpen
import androidx.compose.material3.Surface
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VolumeMute
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class CustomModelData(
    val id: String,
    val name: String,
    val icon: String,
    val fileName: String,
    val base64Data: String,
    val extension: String,
    val category: String = "character", // "character", "animal", "environment"
    val subType: String = "" // "quadruped", "bird", "fish", "building", "vegetation"
)

class MainActivity : ComponentActivity() {

    private var webView: WebView? = null
    private lateinit var webAppInterface: GameWebAppInterface

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        enableEdgeToEdge()

        // Keep screen awake during gameplay
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Hide system bars for console-style fullscreen gaming
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())

        webAppInterface = GameWebAppInterface(this)

        setContent {
            MyApplicationTheme {
                GameScreen(
                    onWebViewCreated = { wv ->
                        webView = wv
                    },
                    webAppInterface = webAppInterface,
                    onResetGame = {
                        webView?.evaluateJavascript(
                            "if(typeof resetPosition === 'function') resetPosition();",
                            null
                        )
                    },
                    onCycleMood = {
                        webView?.evaluateJavascript(
                            "if(typeof cycleMood === 'function') cycleMood();",
                            null
                        )
                    },
                    onToggleStyle = {
                        webView?.evaluateJavascript(
                            "if(typeof toggleRenderStyle === 'function') toggleRenderStyle();",
                            null
                        )
                    },
                    onSelectCharacter = { type ->
                        val safeTypeJson = JSONObject.quote(type)
                        webView?.evaluateJavascript(
                            "if(typeof switchCharacterModel === 'function') switchCharacterModel($safeTypeJson);",
                            null
                        )
                    },
                    onLoadCustomModel = { fileName, base64Data, extension, icon, category, subType ->
                        webAppInterface.setPendingModelData(fileName, base64Data, extension, icon, category, subType)
                        val safeNameJson = JSONObject.quote(fileName)
                        val safeExtJson = JSONObject.quote(extension)
                        val safeIconJson = JSONObject.quote(icon)
                        webView?.postDelayed({
                            webView?.evaluateJavascript(
                                "if(typeof loadPendingCustomModel === 'function') loadPendingCustomModel($safeNameJson, $safeExtJson, $safeIconJson);",
                                null
                            )
                        }, 120)
                    },
                    onOpenStudio = { category, name ->
                        val safeCatJson = JSONObject.quote(category)
                        val safeNameJson = JSONObject.quote(name)
                        webView?.evaluateJavascript(
                            "if(typeof openModelStudio === 'function') openModelStudio($safeCatJson, $safeNameJson);",
                            null
                        )
                    },
                    onDeleteCustomModel = { category, name ->
                        val safeCatJson = JSONObject.quote(category)
                        val safeNameJson = JSONObject.quote(name)
                        webView?.evaluateJavascript(
                            "if(typeof deleteCustomModel === 'function') deleteCustomModel($safeCatJson, $safeNameJson);",
                            null
                        )
                    },
                    onSetMusicVolume = { vol ->
                        webView?.evaluateJavascript(
                            "if(typeof setMusicVolume === 'function') setMusicVolume($vol);",
                            null
                        )
                    },
                    onSwitchMusicTrack = { index ->
                        webView?.evaluateJavascript(
                            "if(typeof switchMusicTrack === 'function') switchMusicTrack($index);",
                            null
                        )
                    },
                    onSetAmbientLight = { lightVal ->
                        webView?.evaluateJavascript(
                            "if(typeof setAmbientIntensity === 'function') setAmbientIntensity($lightVal);",
                            null
                        )
                    },
                    onSelectSkyTexture = { skyIdx ->
                        webView?.evaluateJavascript(
                            "if(typeof setSkyTexture === 'function') setSkyTexture($skyIdx);",
                            null
                        )
                    },
                    onToggleTurboRender = { enabled ->
                        webView?.evaluateJavascript(
                            "if(typeof setTurboRender === 'function') setTurboRender($enabled);",
                            null
                        )
                    },
                    onSetCustomSound = { slotKey, wavDataUrl ->
                        val safeSlot = JSONObject.quote(slotKey)
                        val safeUrl = JSONObject.quote(wavDataUrl)
                        webView?.evaluateJavascript(
                            "if(typeof setCustomSound === 'function') setCustomSound($safeSlot, $safeUrl);",
                            null
                        )
                    },
                    onClearCustomSound = { slotKey ->
                        val safeSlot = JSONObject.quote(slotKey)
                        webView?.evaluateJavascript(
                            "if(typeof clearCustomSound === 'function') clearCustomSound($safeSlot);",
                            null
                        )
                    },
                    onApplyMagicTexture = { targetId, imageDataUrl, partKey ->
                        val safeId = JSONObject.quote(targetId)
                        val safeImg = JSONObject.quote(imageDataUrl)
                        val safePart = JSONObject.quote(partKey)
                        webView?.evaluateJavascript(
                            "if(typeof applyMagicTextureToModel === 'function') applyMagicTextureToModel($safeId, $safeImg, $safePart);",
                            null
                        )
                    },
                    onToggleBgmEnabled = { enabled ->
                        webView?.evaluateJavascript(
                            "if(typeof setBgmEnabled === 'function') setBgmEnabled($enabled);",
                            null
                        )
                    },
                    onSetCustomEnvTexture = { envKey, imageDataUrl ->
                        val safeKey = JSONObject.quote(envKey)
                        val safeImg = JSONObject.quote(imageDataUrl)
                        webView?.evaluateJavascript(
                            "if(typeof setCustomEnvironmentTexture === 'function') setCustomEnvironmentTexture($safeKey, $safeImg);",
                            null
                        )
                    },
                    onClearCustomEnvTexture = { envKey ->
                        val safeKey = JSONObject.quote(envKey)
                        webView?.evaluateJavascript(
                            "if(typeof clearCustomEnvironmentTexture === 'function') clearCustomEnvironmentTexture($safeKey);",
                            null
                        )
                    },
                    onSetVegetationDensity = { density ->
                        webView?.evaluateJavascript(
                            "if(typeof setVegetationDensity === 'function') setVegetationDensity($density);",
                            null
                        )
                    },
                    onSetWeatherMode = { weatherKey, autoEnabled ->
                        val safeWeather = JSONObject.quote(weatherKey)
                        webView?.evaluateJavascript(
                            "if(typeof setWeatherMode === 'function') setWeatherMode($safeWeather, $autoEnabled);",
                            null
                        )
                    }
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        webView?.evaluateJavascript(
            "if(typeof setAppLifecyclePaused === 'function') setAppLifecyclePaused(false);",
            null
        )
    }

    override fun onPause() {
        super.onPause()
        // Do NOT call webView.onPause()/pauseTimers(): suspending Chromium's WebGL compositor
        // during OpenDocument file-picker launches can corrupt the GPU surface (black screen + scanline tear).
        webView?.evaluateJavascript(
            "if(typeof setAppLifecyclePaused === 'function') setAppLifecyclePaused(true);",
            null
        )
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun GameScreen(
    onWebViewCreated: (WebView) -> Unit,
    webAppInterface: GameWebAppInterface,
    onResetGame: () -> Unit,
    onCycleMood: () -> Unit,
    onToggleStyle: () -> Unit,
    onSelectCharacter: (String) -> Unit,
    onLoadCustomModel: (String, String, String, String, String, String) -> Unit,
    onOpenStudio: (String, String) -> Unit,
    onDeleteCustomModel: (String, String) -> Unit,
    onSetMusicVolume: (Float) -> Unit,
    onSwitchMusicTrack: (Int) -> Unit,
    onSetAmbientLight: (Float) -> Unit,
    onSelectSkyTexture: (Int) -> Unit,
    onToggleTurboRender: (Boolean) -> Unit,
    onSetCustomSound: (String, String) -> Unit,
    onClearCustomSound: (String) -> Unit,
    onApplyMagicTexture: (String, String, String) -> Unit,
    onToggleBgmEnabled: (Boolean) -> Unit,
    onSetCustomEnvTexture: (String, String) -> Unit,
    onClearCustomEnvTexture: (String) -> Unit,
    onSetVegetationDensity: (Float) -> Unit,
    onSetWeatherMode: (String, Boolean) -> Unit
) {
    val context = LocalContext.current
    var currentScreen by remember { mutableStateOf(AppScreen.GAME) }
    val charState by webAppInterface.characterState.collectAsState()
    val ballKicks by webAppInterface.ballKicks.collectAsState()
    val currentModelName by webAppInterface.currentModelName.collectAsState()
    val isGameReady by webAppInterface.isGameReady.collectAsState()
    val magicWandRequest by webAppInterface.magicWandCameraRequest.collectAsState()

    // Sync any persisted custom WAV sounds and environment textures into the WebView once loaded
    LaunchedEffect(isGameReady) {
        if (isGameReady) {
            val savedSounds = withContext(Dispatchers.IO) {
                AudioCustomManager.loadAllSavedCustomSounds(context)
            }
            savedSounds.forEach { (slotKey, dataUrl) ->
                onSetCustomSound(slotKey, dataUrl)
            }
            val savedEnvTextures = withContext(Dispatchers.IO) {
                AudioCustomManager.loadAllSavedEnvTextures(context)
            }
            savedEnvTextures.forEach { (envKey, dataUrl) ->
                onSetCustomEnvTexture(envKey, dataUrl)
            }
        }
    }

    // Persistent list of user-imported custom models during the session
    val customModelsList = remember { mutableStateListOf<CustomModelData>() }

    BackHandler(enabled = (currentScreen == AppScreen.SETTINGS)) {
        currentScreen = AppScreen.GAME
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Native WebView running the offline Three.js 3D/2D Toon engine
        AndroidView(
            modifier = Modifier
                .fillMaxSize()
                .testTag("game_webview"),
            factory = { context ->
                WebView(context).apply {
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        allowFileAccess = true
                        allowContentAccess = true
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        cacheMode = WebSettings.LOAD_DEFAULT
                        mediaPlaybackRequiresUserGesture = false
                    }
                    webChromeClient = WebChromeClient()
                    webViewClient = object : WebViewClient() {
                        override fun onRenderProcessGone(
                            view: WebView?,
                            detail: RenderProcessGoneDetail?
                        ): Boolean {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                view?.let {
                                    Toast.makeText(
                                        context,
                                        "渲染进程已自动恢复，正在重新加载 3D 场景…",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                    it.loadUrl("file:///android_asset/index.html")
                                }
                                return true
                            }
                            return super.onRenderProcessGone(view, detail)
                        }
                    }
                    addJavascriptInterface(webAppInterface, "AndroidBridge")
                    loadUrl("file:///android_asset/index.html")
                    onWebViewCreated(this)
                }
            }
        )

        // Top-Right Native Settings FAB (Shown on game screen)
        if (currentScreen == AppScreen.GAME) {
            FloatingActionButton(
                onClick = { currentScreen = AppScreen.SETTINGS },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 8.dp, end = 12.dp)
                    .size(38.dp)
                    .testTag("settings_fab"),
                shape = CircleShape,
                containerColor = Color.White.copy(alpha = 0.82f),
                contentColor = Color(0xFF3E2723)
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "打开游戏设置与工坊页面",
                    modifier = Modifier.size(18.dp)
                )
            }
        }

        // Full Screen Standalone Settings Page (单独页面而不是浮窗)
        if (currentScreen == AppScreen.SETTINGS) {
            SettingsScreen(
                onBack = { currentScreen = AppScreen.GAME },
                webAppInterface = webAppInterface,
                charState = charState,
                ballKicks = ballKicks,
                currentModelName = currentModelName,
                customModelsList = customModelsList,
                onResetGame = {
                    currentScreen = AppScreen.GAME
                    onResetGame()
                },
                onCycleMood = onCycleMood,
                onToggleStyle = onToggleStyle,
                onSelectCharacter = { type ->
                    currentScreen = AppScreen.GAME
                    onSelectCharacter(type)
                },
                onLoadCustomModel = { name, b64, ext, icon, cat, sub ->
                    currentScreen = AppScreen.GAME
                    onLoadCustomModel(name, b64, ext, icon, cat, sub)
                },
                onOpenStudio = { cat, name ->
                    currentScreen = AppScreen.GAME
                    onOpenStudio(cat, name)
                },
                onDeleteCustomModel = onDeleteCustomModel,
                onSetMusicVolume = onSetMusicVolume,
                onSwitchMusicTrack = onSwitchMusicTrack,
                onSetAmbientLight = onSetAmbientLight,
                onSelectSkyTexture = onSelectSkyTexture,
                onToggleTurboRender = onToggleTurboRender,
                onSetCustomSound = onSetCustomSound,
                onClearCustomSound = onClearCustomSound,
                onToggleBgmEnabled = onToggleBgmEnabled,
                onSetCustomEnvTexture = onSetCustomEnvTexture,
                onClearCustomEnvTexture = onClearCustomEnvTexture,
                onSetVegetationDensity = onSetVegetationDensity,
                onSetWeatherMode = onSetWeatherMode
            )
        }

        // Magic Wand Camera Popup Dialog (Triggered after colliding with a model and tapping 🪄)
        val activeWandReq = magicWandRequest
        if (activeWandReq != null) {
            MagicWandCameraDialog(
                target = activeWandReq,
                onDismiss = { webAppInterface.consumeMagicWandCameraRequest() },
                onApplyTextureDataUrl = { dataUrl, partKey ->
                    onApplyMagicTexture(activeWandReq.id, dataUrl, partKey)
                    webAppInterface.consumeMagicWandCameraRequest()
                }
            )
        }
    }
}

enum class AppScreen {
    GAME,
    SETTINGS
}

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    webAppInterface: GameWebAppInterface,
    charState: String,
    ballKicks: Int,
    currentModelName: String,
    customModelsList: MutableList<CustomModelData>,
    onResetGame: () -> Unit,
    onCycleMood: () -> Unit,
    onToggleStyle: () -> Unit,
    onSelectCharacter: (String) -> Unit,
    onLoadCustomModel: (String, String, String, String, String, String) -> Unit,
    onOpenStudio: (String, String) -> Unit,
    onDeleteCustomModel: (String, String) -> Unit,
    onSetMusicVolume: (Float) -> Unit,
    onSwitchMusicTrack: (Int) -> Unit,
    onSetAmbientLight: (Float) -> Unit,
    onSelectSkyTexture: (Int) -> Unit,
    onToggleTurboRender: (Boolean) -> Unit,
    onSetCustomSound: (String, String) -> Unit,
    onClearCustomSound: (String) -> Unit,
    onToggleBgmEnabled: (Boolean) -> Unit,
    onSetCustomEnvTexture: (String, String) -> Unit,
    onClearCustomEnvTexture: (String) -> Unit,
    onSetVegetationDensity: (Float) -> Unit,
    onSetWeatherMode: (String, Boolean) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    // Import Dialog State
    var showImportDialog by remember { mutableStateOf(false) }
    var currentImportCategory by remember { mutableStateOf("character") } // "character", "animal", "environment"
    var currentAnimalType by remember { mutableStateOf("quadruped") } // "quadruped", "bird", "fish"
    var currentEnvType by remember { mutableStateOf("building") } // "building", "vegetation"
    var pendingModelBytes by remember { mutableStateOf<ByteArray?>(null) }
    var pendingFileName by remember { mutableStateOf("") }
    var pendingExt by remember { mutableStateOf("glb") }
    var inputModelName by remember { mutableStateOf("") }
    var selectedEmoji by remember { mutableStateOf("🎮") }

    val characterEmojis = listOf("🎮", "🤠", "🤖", "🦸", "🧙", "🥋", "🦄", "📦")
    val animalEmojis = listOf("🐱", "🐕", "🐑", "🐦", "🦅", "🐟", "🐬", "🦊")
    val envEmojis = listOf("🏠", "🏰", "🗼", "🌲", "🌴", "🌸", "🍄", "🗿")

    // File picker launcher
    val modelPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) {
            coroutineScope.launch {
                try {
                    val rawName = getFileNameFromUri(context, uri) ?: "model.glb"
                    val ext = rawName.substringAfterLast('.', "glb").lowercase()
                    val baseName = rawName.substringBeforeLast('.')

                    val bytes = withContext(Dispatchers.IO) {
                        context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    }

                    if (bytes != null && bytes.size > 45 * 1024 * 1024) {
                        Toast.makeText(context, "模型文件超过 45MB，请压缩或减面后再导入", Toast.LENGTH_LONG).show()
                        return@launch
                    }

                    if (bytes != null && bytes.isNotEmpty()) {
                        pendingModelBytes = bytes
                        pendingFileName = rawName
                        pendingExt = ext
                        inputModelName = baseName
                        selectedEmoji = when (currentImportCategory) {
                            "animal" -> "🐱"
                            "environment" -> if (currentEnvType == "building") "🏠" else "🌲"
                            else -> "🎮"
                        }
                        showImportDialog = true
                    } else {
                        Toast.makeText(context, "无法读取该文件数据", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "读取模型失败: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // Unified Compact Import Dialog
    if (showImportDialog) {
        val categoryLabel = when (currentImportCategory) {
            "animal" -> "🐾 导入动物模型"
            "environment" -> "🏞️ 导入环境模型"
            else -> "👤 导入人物模型"
        }

        AlertDialog(
            onDismissRequest = { showImportDialog = false },
            title = {
                Text(
                    text = categoryLabel,
                    style = MaterialTheme.typography.titleMedium.copy(fontSize = 14.sp),
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 2.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "文件: $pendingFileName (.$pendingExt)",
                        style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.sp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    OutlinedTextField(
                        value = inputModelName,
                        onValueChange = { inputModelName = it },
                        label = { Text("展示名称", fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Animal Subtype Selector
                    if (currentImportCategory == "animal") {
                        Text(
                            text = "选择动物骨骼与运动类型:",
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                            fontWeight = FontWeight.SemiBold
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf(
                                Triple("quadruped", "四足动物", "🐕"),
                                Triple("bird", "鸟类", "🦅"),
                                Triple("fish", "鱼类", "🐟")
                            ).forEach { (type, label, em) ->
                                val isSel = (currentAnimalType == type)
                                Card(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable {
                                            currentAnimalType = type
                                            selectedEmoji = em
                                        },
                                    shape = RoundedCornerShape(8.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isSel) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                                    ),
                                    border = if (isSel) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 6.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(text = em, fontSize = 16.sp)
                                        Text(
                                            text = label,
                                            fontSize = 9.sp,
                                            fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal,
                                            color = if (isSel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Environment Subtype Selector
                    if (currentImportCategory == "environment") {
                        Text(
                            text = "选择环境景观类型 (无需骨骼，随机生成分布):",
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                            fontWeight = FontWeight.SemiBold
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf(
                                Triple("building", "房屋建筑", "🏠"),
                                Triple("vegetation", "植被景观", "🌲")
                            ).forEach { (type, label, em) ->
                                val isSel = (currentEnvType == type)
                                Card(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable {
                                            currentEnvType = type
                                            selectedEmoji = em
                                        },
                                    shape = RoundedCornerShape(8.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isSel) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                                    ),
                                    border = if (isSel) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 6.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(text = em, fontSize = 16.sp)
                                        Text(
                                            text = label,
                                            fontSize = 9.sp,
                                            fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal,
                                            color = if (isSel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Text(
                        text = "选择图标:",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                        fontWeight = FontWeight.SemiBold
                    )

                    val activeEmojis = when (currentImportCategory) {
                        "animal" -> animalEmojis
                        "environment" -> envEmojis
                        else -> characterEmojis
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        activeEmojis.forEach { emoji ->
                            val isChosen = (selectedEmoji == emoji)
                            Card(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clickable { selectedEmoji = emoji },
                                shape = RoundedCornerShape(6.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isChosen) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                                ),
                                border = if (isChosen) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null
                            ) {
                                Box(
                                    modifier = Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(text = emoji, fontSize = 14.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val bytes = pendingModelBytes
                        if (bytes != null && bytes.isNotEmpty()) {
                            val finalName = if (inputModelName.isNotBlank()) inputModelName.trim() else pendingFileName
                            val subType = when (currentImportCategory) {
                                "animal" -> currentAnimalType
                                "environment" -> currentEnvType
                                else -> ""
                            }
                            val currentEmoji = selectedEmoji
                            val currentExt = pendingExt
                            val currentFileName = pendingFileName
                            val category = currentImportCategory
                            showImportDialog = false

                            coroutineScope.launch(Dispatchers.Default) {
                                val base64Data = Base64.encodeToString(bytes, Base64.NO_WRAP)
                                withContext(Dispatchers.Main) {
                                    val newItem = CustomModelData(
                                        id = "${category}_${System.currentTimeMillis()}",
                                        name = finalName,
                                        icon = currentEmoji,
                                        fileName = currentFileName,
                                        base64Data = base64Data,
                                        extension = currentExt,
                                        category = category,
                                        subType = subType
                                    )
                                    customModelsList.add(newItem)
                                    onLoadCustomModel(finalName, base64Data, currentExt, currentEmoji, category, subType)
                                    Toast.makeText(context, "已成功导入: $finalName", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    }
                ) {
                    Text(
                        text = if (currentImportCategory == "character") "保存并进入3D工坊绑定" else "保存并加入世界",
                        fontSize = 11.sp
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showImportDialog = false }) {
                    Text("取消", fontSize = 11.sp)
                }
            }
        )
    }

    Surface(
        modifier = Modifier
            .fillMaxSize()
            .testTag("settings_screen_page"),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
        ) {
            // Full Screen Top Header Bar
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.85f),
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        IconButton(
                            onClick = onBack,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "返回游戏",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                        Column {
                            Text(
                                text = "⚙️ 游戏设置与资源工坊",
                                style = MaterialTheme.typography.titleMedium.copy(fontSize = 15.sp),
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "自定义3D模型 · 骨骼绑定 · 8-Bit音乐 · 光照与加速",
                                style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.sp),
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Button(
                        onClick = onBack,
                        modifier = Modifier.height(34.dp)
                    ) {
                        Text("返回游戏", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Scrollable Content Centered on Tablets / Wide Displays
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.TopCenter
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 840.dp)
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                        .padding(bottom = 20.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
        // ====================================================================
        // MODULE 1: 人物模型 (预置只保留草帽探险家和小橘猫 + 3D工坊绑定预览 + 删除)
        // ====================================================================
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Face,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "人物模型 (预置仅2款 + 骨骼对称绑定工坊)",
                            style = MaterialTheme.typography.titleSmall.copy(fontSize = 12.sp),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }

                    Text(
                        text = "当前: $currentModelName",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                // Horizontal scrollable character cards row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Preset 1: Explorer
                    CompactModelCard(
                        icon = "🌾",
                        title = "草帽探险家",
                        badge = "预置经典",
                        isSelected = currentModelName.contains("草帽"),
                        isCustom = false,
                        onClick = { onSelectCharacter("explorer") }
                    )

                    // Preset 2: Cat
                    CompactModelCard(
                        icon = "🐱",
                        title = "小橘猫",
                        badge = "预置萌宠",
                        isSelected = currentModelName.contains("小橘猫"),
                        isCustom = false,
                        onClick = { onSelectCharacter("cat") }
                    )

                    // User-imported Custom Characters (with delete & 3D studio preview)
                    customModelsList.filter { it.category == "character" }.forEach { customItem ->
                        CompactModelCard(
                            icon = customItem.icon,
                            title = customItem.name,
                            badge = ".${customItem.extension}",
                            isSelected = (currentModelName == customItem.name),
                            isCustom = true,
                            onClick = {
                                onSelectCharacter(customItem.name)
                            },
                            onOpenStudio = {
                                onOpenStudio("character", customItem.name)
                            },
                            onDelete = {
                                customModelsList.remove(customItem)
                                onDeleteCustomModel("character", customItem.name)
                            }
                        )
                    }

                    // Import character button card
                    CompactAddCard(
                        label = "导入人物",
                        sub = ".glb/.obj",
                        onClick = {
                            currentImportCategory = "character"
                            modelPickerLauncher.launch(
                                arrayOf("*/*", "model/gltf-binary", "model/gltf+json", "application/octet-stream")
                            )
                        }
                    )
                }
            }
        }

        // ====================================================================
        // MODULE 2: 动物模型添加模块 (四足动物/鸟类/鱼类漫游 + 删除)
        // ====================================================================
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.35f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🐾 动物模型 (四足 / 鸟类 / 鱼类生态漫游)",
                        style = MaterialTheme.typography.titleSmall.copy(fontSize = 12.sp),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onTertiaryContainer
                    )
                    Text(
                        text = "自动生态群落融入",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                        color = MaterialTheme.colorScheme.outline
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Fauna Presets
                    CompactModelCard(icon = "🐑", title = "草原绵羊", badge = "四足走动", isSelected = false, isCustom = false, onClick = {})
                    CompactModelCard(icon = "🐦", title = "翔空飞鸟", badge = "空中盘旋", isSelected = false, isCustom = false, onClick = {})
                    CompactModelCard(icon = "🐔", title = "庭院小鸡", badge = "觅食啄米", isSelected = false, isCustom = false, onClick = {})
                    CompactModelCard(icon = "🐍", title = "沙漠灵蛇", badge = "蜿蜒爬行", isSelected = false, isCustom = false, onClick = {})

                    // Custom Animals
                    customModelsList.filter { it.category == "animal" }.forEach { customItem ->
                        val subLabel = when (customItem.subType) {
                            "bird" -> "鸟类翱翔"
                            "fish" -> "鱼类游动"
                            else -> "四足踏步"
                        }
                        CompactModelCard(
                            icon = customItem.icon,
                            title = customItem.name,
                            badge = subLabel,
                            isSelected = false,
                            isCustom = true,
                            onClick = {
                                onOpenStudio("animal", customItem.name)
                            },
                            onOpenStudio = {
                                onOpenStudio("animal", customItem.name)
                            },
                            onDelete = {
                                customModelsList.remove(customItem)
                                onDeleteCustomModel("animal", customItem.name)
                            }
                        )
                    }

                    // Import animal button card
                    CompactAddCard(
                        label = "导入动物",
                        sub = "四足/鸟/鱼",
                        onClick = {
                            currentImportCategory = "animal"
                            currentAnimalType = "quadruped"
                            modelPickerLauncher.launch(
                                arrayOf("*/*", "model/gltf-binary", "model/gltf+json", "application/octet-stream")
                            )
                        }
                    )
                }
            }
        }

        // ====================================================================
        // MODULE 3: 环境模型添加模块 (房屋建筑 & 植被景观 + 随机分布 + 删除)
        // ====================================================================
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.35f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🏞️ 环境模型 (房屋建筑 & 植被景观 · 无需骨骼)",
                        style = MaterialTheme.typography.titleSmall.copy(fontSize = 12.sp),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                    Text(
                        text = "程序随机分布于世界",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                        color = MaterialTheme.colorScheme.outline
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Environment Presets
                    CompactModelCard(icon = "🏠", title = "村落木屋", badge = "预置房屋", isSelected = false, isCustom = false, onClick = {})
                    CompactModelCard(icon = "🌲", title = "积雪冷杉", badge = "预置植被", isSelected = false, isCustom = false, onClick = {})
                    CompactModelCard(icon = "🌵", title = "沙漠仙人掌", badge = "预置灌木", isSelected = false, isCustom = false, onClick = {})

                    // Custom Environment Models
                    customModelsList.filter { it.category == "environment" }.forEach { customItem ->
                        val subLabel = if (customItem.subType == "vegetation") "植被景观" else "房屋建筑"
                        CompactModelCard(
                            icon = customItem.icon,
                            title = customItem.name,
                            badge = subLabel,
                            isSelected = false,
                            isCustom = true,
                            onClick = {
                                onOpenStudio("environment", customItem.name)
                            },
                            onOpenStudio = {
                                onOpenStudio("environment", customItem.name)
                            },
                            onDelete = {
                                customModelsList.remove(customItem)
                                onDeleteCustomModel("environment", customItem.name)
                            }
                        )
                    }

                    // Import environment button card
                    CompactAddCard(
                        label = "导入环境",
                        sub = "房屋/植被",
                        onClick = {
                            currentImportCategory = "environment"
                            currentEnvType = "building"
                            modelPickerLauncher.launch(
                                arrayOf("*/*", "model/gltf-binary", "model/gltf+json", "application/octet-stream")
                            )
                        }
                    )
                }
            }
        }

        // ====================================================================
        // MODULE 4: 8-Bit 旋律、自定义录音背景音 & 关闭背景音乐开关
        // ====================================================================
        val musicVolume by webAppInterface.musicVolume.collectAsState()
        val currentTrackIndex by webAppInterface.currentTrackIndex.collectAsState()
        val isBgmEnabled by webAppInterface.isBgmEnabled.collectAsState()
        var configuredSoundKeys by remember {
            mutableStateOf(AudioCustomManager.getConfiguredSlotKeys(context))
        }
        var activeRecorderSlot by remember { mutableStateOf<CustomSoundSlot?>(null) }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.MusicNote,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "背景音乐 (8-Bit / 自定义录音 / 可关闭)",
                            style = MaterialTheme.typography.titleSmall.copy(fontSize = 11.sp),
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = if (isBgmEnabled) "音量 ${(musicVolume * 100).toInt()}%" else "已关闭背景音",
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                            fontWeight = FontWeight.Bold,
                            color = if (isBgmEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )
                        Switch(
                            checked = isBgmEnabled,
                            onCheckedChange = { enabled -> onToggleBgmEnabled(enabled) },
                            modifier = Modifier.height(24.dp)
                        )
                    }
                }

                Slider(
                    value = musicVolume,
                    onValueChange = onSetMusicVolume,
                    valueRange = 0f..1f,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(28.dp)
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Option to disable 8-bit background music cleanly
                    Card(
                        modifier = Modifier.clickable { onToggleBgmEnabled(false) },
                        shape = RoundedCornerShape(6.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (!isBgmEnabled) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surface
                        ),
                        border = if (!isBgmEnabled) BorderStroke(1.dp, MaterialTheme.colorScheme.error) else null
                    ) {
                        Text(
                            text = "🔇 无背景音乐",
                            fontSize = 9.sp,
                            fontWeight = if (!isBgmEnabled) FontWeight.Bold else FontWeight.Normal,
                            color = if (!isBgmEnabled) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                        )
                    }

                    listOf("🎵 夏日微风", "🌲 绿野冒险", "🌅 午后阳光", "🕹️ 复古像素").forEachIndexed { idx, trk ->
                        val isCur = isBgmEnabled && (currentTrackIndex == idx)
                        Card(
                            modifier = Modifier.clickable {
                                onToggleBgmEnabled(true)
                                onSwitchMusicTrack(idx)
                            },
                            shape = RoundedCornerShape(6.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isCur) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
                            ),
                            border = if (isCur) BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null
                        ) {
                            Text(
                                text = trk,
                                fontSize = 9.sp,
                                fontWeight = if (isCur) FontWeight.Bold else FontWeight.Normal,
                                color = if (isCur) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }
                    }

                    // Custom Recorded BGM Track Option (index 4)
                    val hasCustomBgm = configuredSoundKeys.contains("bgm")
                    val isCustomBgmCur = isBgmEnabled && (currentTrackIndex == 4)
                    Card(
                        modifier = Modifier.clickable {
                            if (hasCustomBgm) {
                                onToggleBgmEnabled(true)
                                onSwitchMusicTrack(4)
                            } else {
                                activeRecorderSlot = CustomSoundSlot.BGM
                            }
                        },
                        shape = RoundedCornerShape(6.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isCustomBgmCur) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
                        ),
                        border = if (isCustomBgmCur) BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null
                    ) {
                        Text(
                            text = if (hasCustomBgm) "🎤 自定义背景音" else "🎙️ 录制背景音",
                            fontSize = 9.sp,
                            fontWeight = if (isCustomBgmCur) FontWeight.Bold else FontWeight.Normal,
                            color = if (isCustomBgmCur) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                        )
                    }
                }
            }
        }

        // ====================================================================
        // MODULE 4B: 自定义游戏音效录制与手动截取 (交互/动物/天气/背景音)
        // ====================================================================
        if (activeRecorderSlot != null) {
            val slot = activeRecorderSlot!!
            AudioRecorderDialog(
                slot = slot,
                onDismiss = { activeRecorderSlot = null },
                onConfirmWavDataUrl = { dataUrl ->
                    onSetCustomSound(slot.key, dataUrl)
                    configuredSoundKeys = configuredSoundKeys + slot.key
                    if (slot == CustomSoundSlot.BGM) {
                        onToggleBgmEnabled(true)
                        onSwitchMusicTrack(4)
                    }
                    activeRecorderSlot = null
                    Toast.makeText(context, "已将自定义${slot.label}放入游戏！", Toast.LENGTH_SHORT).show()
                }
            )
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🎙️ 自定义游戏音效 (录音权限 + 手动截取3秒 + 试听)",
                        style = MaterialTheme.typography.titleSmall.copy(fontSize = 11.sp),
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "已自定义 ${configuredSoundKeys.size}/${CustomSoundSlot.entries.size}",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    CustomSoundSlot.entries.forEach { slot ->
                        val isCustomized = configuredSoundKeys.contains(slot.key)
                        Card(
                            modifier = Modifier
                                .width(106.dp)
                                .clickable { activeRecorderSlot = slot },
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isCustomized) {
                                    MaterialTheme.colorScheme.primaryContainer
                                } else {
                                    MaterialTheme.colorScheme.surface
                                }
                            ),
                            border = if (isCustomized) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null
                        ) {
                            Box(modifier = Modifier.fillMaxWidth()) {
                                if (isCustomized) {
                                    IconButton(
                                        onClick = {
                                            AudioCustomManager.deleteCustomWav(context, slot.key)
                                            configuredSoundKeys = configuredSoundKeys - slot.key
                                            onClearCustomSound(slot.key)
                                            Toast.makeText(context, "已恢复${slot.label}为默认音效", Toast.LENGTH_SHORT).show()
                                        },
                                        modifier = Modifier
                                            .align(Alignment.TopEnd)
                                            .size(22.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Close,
                                            contentDescription = "恢复默认音效",
                                            tint = MaterialTheme.colorScheme.error,
                                            modifier = Modifier.size(12.dp)
                                        )
                                    }
                                }
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 6.dp, vertical = 7.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(2.dp)
                                ) {
                                    Text(text = slot.icon, fontSize = 18.sp)
                                    Text(
                                        text = slot.label,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isCustomized) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                        maxLines = 1
                                    )
                                    Text(
                                        text = if (isCustomized) "✅ 已自定义" else "🎙️ 点击录制",
                                        fontSize = 8.sp,
                                        color = if (isCustomized) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // ====================================================================
        // MODULE 5: 环境光照调节 (太亮了可调暗) & 真实天空贴图预置
        // ====================================================================
        var currentAmbientLight by remember { mutableStateOf(0.75f) }
        var currentSkyIdx by remember { mutableStateOf(0) }
        val skyPresets = listOf(
            "🌤️ 午后晴空",
            "🌅 夕阳晚霞",
            "✨ 夏夜繁星",
            "🌌 梦幻极光",
            "🌫️ 晨曦微云"
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Light slider
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.WbSunny,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "环境光照强度 (防过曝调节)",
                            style = MaterialTheme.typography.titleSmall.copy(fontSize = 11.sp),
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Text(
                        text = "${(currentAmbientLight * 100).toInt()}%",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Slider(
                    value = currentAmbientLight,
                    onValueChange = {
                        currentAmbientLight = it
                        onSetAmbientLight(it)
                    },
                    valueRange = 0.15f..1.4f,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(28.dp)
                )

                // Sky Preset selector
                Text(
                    text = "预置真实天空贴图:",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    skyPresets.forEachIndexed { idx, skyName ->
                        val isCur = (currentSkyIdx == idx)
                        Card(
                            modifier = Modifier.clickable {
                                currentSkyIdx = idx
                                onSelectSkyTexture(idx)
                            },
                            shape = RoundedCornerShape(6.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isCur) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
                            ),
                            border = if (isCur) BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null
                        ) {
                            Text(
                                text = skyName,
                                fontSize = 9.sp,
                                fontWeight = if (isCur) FontWeight.Bold else FontWeight.Normal,
                                color = if (isCur) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }
                    }
                }
            }
        }

        // ====================================================================
        // MODULE 5A: 自定义环境贴图 (沙漠 / 草地 / 水面)
        // ====================================================================
        var configuredEnvKeys by remember {
            mutableStateOf(AudioCustomManager.getConfiguredEnvTextureKeys(context))
        }
        var activeEnvTextureSlot by remember { mutableStateOf<CustomEnvTextureSlot?>(null) }

        if (activeEnvTextureSlot != null) {
            val envSlot = activeEnvTextureSlot!!
            EnvTextureDialog(
                slot = envSlot,
                onDismiss = { activeEnvTextureSlot = null },
                onConfirmTextureDataUrl = { dataUrl ->
                    onSetCustomEnvTexture(envSlot.key, dataUrl)
                    configuredEnvKeys = configuredEnvKeys + envSlot.key
                    activeEnvTextureSlot = null
                    Toast.makeText(context, "已更换${envSlot.label}！", Toast.LENGTH_SHORT).show()
                }
            )
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.28f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🗺️ 自定义环境贴图 (沙漠 / 草地 / 水面)",
                        style = MaterialTheme.typography.titleSmall.copy(fontSize = 11.sp),
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "已替换 ${configuredEnvKeys.size}/${CustomEnvTextureSlot.entries.size}",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CustomEnvTextureSlot.entries.forEach { envSlot ->
                        val isCustom = configuredEnvKeys.contains(envSlot.key)
                        Card(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { activeEnvTextureSlot = envSlot },
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isCustom) {
                                    MaterialTheme.colorScheme.primaryContainer
                                } else {
                                    MaterialTheme.colorScheme.surface
                                }
                            ),
                            border = if (isCustom) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null
                        ) {
                            Box(modifier = Modifier.fillMaxWidth()) {
                                if (isCustom) {
                                    IconButton(
                                        onClick = {
                                            AudioCustomManager.deleteCustomEnvTexture(context, envSlot.key)
                                            configuredEnvKeys = configuredEnvKeys - envSlot.key
                                            onClearCustomEnvTexture(envSlot.key)
                                            Toast.makeText(context, "已恢复${envSlot.label}默认材质", Toast.LENGTH_SHORT).show()
                                        },
                                        modifier = Modifier
                                            .align(Alignment.TopEnd)
                                            .size(22.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Close,
                                            contentDescription = "恢复默认贴图",
                                            tint = MaterialTheme.colorScheme.error,
                                            modifier = Modifier.size(12.dp)
                                        )
                                    }
                                }
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 6.dp, vertical = 7.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(2.dp)
                                ) {
                                    Text(text = envSlot.icon, fontSize = 18.sp)
                                    Text(
                                        text = envSlot.label,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isCustom) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = if (isCustom) "✅ 已自定义" else "🖼️ 选图/拍照",
                                        fontSize = 8.sp,
                                        color = if (isCustom) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // ====================================================================
        // MODULE 5B: 环境中植被密度调节滑块 (树木 / 仙人掌 / 灌木 / 花朵)
        // ====================================================================
        val vegDensity by webAppInterface.vegetationDensity.collectAsState()
        var sliderVegDensity by remember(vegDensity) { mutableStateOf(vegDensity) }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🌲 环境中植被密度调节",
                        style = MaterialTheme.typography.titleSmall.copy(fontSize = 11.sp),
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${(sliderVegDensity * 100).toInt()}%",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Slider(
                    value = sliderVegDensity,
                    onValueChange = { sliderVegDensity = it },
                    onValueChangeFinished = { onSetVegetationDensity(sliderVegDensity) },
                    valueRange = 0f..2f,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(28.dp)
                )
            }
        }

        // ====================================================================
        // MODULE 5C: 动态天气系统 (随机切换 + 天晴 / 阴雨 / 下雪 / 大雾 / 雷雨闪电)
        // ====================================================================
        val currentWeather by webAppInterface.currentWeather.collectAsState()
        val weatherAutoEnabled by webAppInterface.weatherAutoEnabled.collectAsState()
        val weatherOptions = listOf(
            "sunny" to "☀️ 天晴",
            "rain" to "🌧️ 阴雨",
            "snow" to "❄️ 下雪",
            "fog" to "🌫️ 大雾",
            "thunderstorm" to "⛈️ 雷雨闪电"
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(5.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "🌦️ 动态天气系统 (随机天气 & 云朵打雷闪电)",
                        style = MaterialTheme.typography.titleSmall.copy(fontSize = 11.sp),
                        fontWeight = FontWeight.Bold
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = if (weatherAutoEnabled) "随机轮换" else "固定天气",
                            fontSize = 9.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold
                        )
                        Switch(
                            checked = weatherAutoEnabled,
                            onCheckedChange = { onSetWeatherMode(currentWeather, it) },
                            modifier = Modifier.height(24.dp)
                        )
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    weatherOptions.forEach { (wKey, wLabel) ->
                        val isCur = (currentWeather == wKey)
                        Card(
                            modifier = Modifier.clickable { onSetWeatherMode(wKey, weatherAutoEnabled) },
                            shape = RoundedCornerShape(6.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isCur) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
                            ),
                            border = if (isCur) BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null
                        ) {
                            Text(
                                text = wLabel,
                                fontSize = 9.sp,
                                fontWeight = if (isCur) FontWeight.Bold else FontWeight.Normal,
                                color = if (isCur) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }

        // ====================================================================
        // MODULE 6: WebGL 算力加速设置 (调用设备多余算力)
        // ====================================================================
        var isTurboActive by remember { mutableStateOf(true) }
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (isTurboActive) MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.45f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "⚡", fontSize = 13.sp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "设备多余算力加速渲染",
                            style = MaterialTheme.typography.titleSmall.copy(fontSize = 11.sp),
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = if (isTurboActive) "已激活: 3.0x 超采样分辨率 & 2K 软阴影" else "省电标准模式",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                        color = MaterialTheme.colorScheme.outline
                    )
                }

                Switch(
                    checked = isTurboActive,
                    onCheckedChange = {
                        isTurboActive = it
                        onToggleTurboRender(it)
                    },
                    modifier = Modifier.height(28.dp)
                )
            }
        }

        // ====================================================================
        // MODULE 7: 渲染风格与快捷操作按钮
        // ====================================================================
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilledTonalButton(
                onClick = onToggleStyle,
                modifier = Modifier
                    .weight(1f)
                    .height(34.dp)
                    .testTag("toggle_style_btn"),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(imageVector = Icons.Default.Brush, contentDescription = null, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("3D / 2D三渲二", fontSize = 10.sp)
            }

            OutlinedButton(
                onClick = onCycleMood,
                modifier = Modifier
                    .weight(1f)
                    .height(34.dp)
                    .testTag("cycle_mood_btn"),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(imageVector = Icons.Default.WbSunny, contentDescription = null, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("切换时刻", fontSize = 10.sp)
            }

            OutlinedButton(
                onClick = onResetGame,
                modifier = Modifier
                    .weight(1f)
                    .height(34.dp)
                    .testTag("reset_pos_btn"),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("回到起点", fontSize = 10.sp)
            }
        }
    }
}
                }
            }
        }

@Composable
fun CompactModelCard(
    icon: String,
    title: String,
    badge: String,
    isSelected: Boolean,
    isCustom: Boolean,
    onClick: () -> Unit,
    onOpenStudio: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null
) {
    Card(
        modifier = Modifier
            .width(96.dp)
            .height(88.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
        ),
        border = if (isSelected) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Delete button in top-right for imported models
            if (isCustom && onDelete != null) {
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(24.dp)
                        .padding(2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "删除模型",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(13.dp)
                    )
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 6.dp, vertical = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = icon, fontSize = 22.sp)

                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium.copy(fontSize = 10.sp),
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                    maxLines = 1
                )

                // Bottom badge or 3D Studio action link
                if (isCustom && onOpenStudio != null) {
                    Text(
                        text = "👁️ 进入3D工坊",
                        fontSize = 8.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable { onOpenStudio() }
                    )
                } else {
                    Text(
                        text = badge,
                        fontSize = 8.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
fun CompactAddCard(
    label: String,
    sub: String,
    onClick: () -> Unit
) {
    OutlinedCard(
        modifier = Modifier
            .width(96.dp)
            .height(88.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.2.dp, MaterialTheme.colorScheme.primary)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = sub,
                fontSize = 8.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun getFileNameFromUri(context: Context, uri: Uri): String? {
    var result: String? = null
    if (uri.scheme == "content") {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) {
                    result = cursor.getString(index)
                }
            }
        }
    }
    if (result == null) {
        result = uri.path
        val cut = result?.lastIndexOf('/') ?: -1
        if (cut != -1) {
            result = result?.substring(cut + 1)
        }
    }
    return result
}
