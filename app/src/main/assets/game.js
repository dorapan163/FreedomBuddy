// ============================================================================
// Summer Afternoon 3D - Three.js Native Optimized WebGL Game
// Start Modal Dialog · Left-Bottom Look Joystick · Right-Bottom Move Joystick
// Dual Rendering Modes: 3D (Default) vs 2D (三渲二风格, 黑色描边)
// Character Model Switcher: Built-in Avatar Models + Offline Local 3D Model Loader
// 100% Offline, Zero CDN dependency
// ============================================================================

(function () {
    'use strict';

    // --- State Variables ---
    let scene, camera, renderer;
    let character, ball, terrain;
    let sunLight, hemiLight, cabinPointLight;
    let clock = new THREE.Clock();
    let isGameStarted = true;

    // Third-Person Follow Camera Orbit State (位于角色正后方视角)
    let cameraYaw = Math.PI;
    let cameraPitch = 0.32;
    let cameraDistance = 7.0;

    // Character State
    const charPos = new THREE.Vector3(0, 0, 0);
    const charVel = new THREE.Vector3(0, 0, 0);
    let charRotation = 0;
    let charState = 'idle'; // 'idle', 'walk', 'jump', 'crouch', 'sit'
    let isGrounded = true;
    let walkPhase = 0;
    let isSitting = false;
    let isCrouching = false;
    let isKicking = false;
    let kickTimer = 0;

    // Current Character Model Type
    let currentCharacterType = 'explorer'; // 'explorer', 'cat', 'custom'
    let customModelGroup = null;
    let customModelDisplayName = "草帽探险家";
    let customModelDisplayIcon = "🌾";
    const customModelsCache = {}; // { [name]: riggedModel }
    const customAnimalsCache = {}; // { [name]: { id, name, type, mesh } }
    const customBuildingPool = []; // [ { id, name, mesh } ]
    const customVegetationPool = []; // [ { id, name, mesh } ]

    // Rendering Style: '3d' (Default) vs '2d' (三渲二, 黑色描边)
    let currentRenderStyle = '3d';
    let toonOutlines = [];

    // Local WebGL Hardware GPU Compute Telemetry
    let hardwareGpuName = "移动端硬件加速 WebGL 2.0 (全速)";
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let currentFps = 60;

    // Time of Day Moods
    const MOODS = [
        {
            name: "夏日午后 (Afternoon)",
            icon: "☀️",
            skyColor: 0x9be2f9,
            fogColor: 0xdff4fa,
            sunColor: 0xfff0c4,
            sunIntensity: 1.4,
            hemiSky: 0xffffff,
            hemiGround: 0x8ea85c,
            lanternIntensity: 0.8
        },
        {
            name: "夕阳晚霞 (Sunset)",
            icon: "🌅",
            skyColor: 0xfda085,
            fogColor: 0xf6d365,
            sunColor: 0xff7e40,
            sunIntensity: 1.6,
            hemiSky: 0xffaa66,
            hemiGround: 0x5a3d28,
            lanternIntensity: 2.2
        },
        {
            name: "夏夜繁星 (Night)",
            icon: "✨",
            skyColor: 0x0f1c30,
            fogColor: 0x14223d,
            sunColor: 0x5f7fbf,
            sunIntensity: 0.35,
            hemiSky: 0x223355,
            hemiGround: 0x0a1410,
            lanternIntensity: 3.5
        }
    ];
    let currentMoodIdx = 0;

    // Dynamic Weather System (☀️ 天晴 / 🌧️ 阴雨 / ❄️ 下雪 / 🌫️ 大雾 / ⛈️ 雷雨)
    const WEATHER_CONFIGS = {
        sunny:        { key: 'sunny',        name: '天晴', icon: '☀️', fogDensity: 0.012, skyTint: null,     sunMult: 1.0,  hemiMult: 1.0,  cloudColor: 0xffffff, cloudOpacity: 0.90 },
        rain:         { key: 'rain',         name: '阴雨', icon: '🌧️', fogDensity: 0.022, skyTint: 0x7b90a6, sunMult: 0.55, hemiMult: 0.68, cloudColor: 0x8b99a8, cloudOpacity: 0.94 },
        snow:         { key: 'snow',         name: '下雪', icon: '❄️', fogDensity: 0.021, skyTint: 0xd9e6f2, sunMult: 0.72, hemiMult: 0.88, cloudColor: 0xeef5fb, cloudOpacity: 0.92 },
        fog:          { key: 'fog',          name: '大雾', icon: '🌫️', fogDensity: 0.056, skyTint: 0xc2cdd6, sunMult: 0.55, hemiMult: 0.78, cloudColor: 0xd6e0e8, cloudOpacity: 0.95 },
        thunderstorm: { key: 'thunderstorm', name: '雷雨', icon: '⛈️', fogDensity: 0.032, skyTint: 0x364559, sunMult: 0.34, hemiMult: 0.48, cloudColor: 0x3d4859, cloudOpacity: 0.98 }
    };
    const WEATHER_KEYS = ['sunny', 'rain', 'snow', 'fog', 'thunderstorm'];
    let currentWeatherKey = 'sunny';
    let weatherAutoEnabled = true;
    let nextWeatherSwitchTime = 40;
    let weatherCloudGroups = [];
    let rainParticleSystem = null;
    let snowParticleSystem = null;
    let lightningBoltMesh = null;
    let lightningFlashIntensity = 0;
    let lightningVisibleTimer = 0;
    let nextLightningTime = 4.5;

    // Environment Surface Custom Textures & Vegetation Density
    const customEnvTextures = { desert: null, grass: null, water: null };
    let vegetationDensity = 1.0;

    // Ball Physics State
    const ballPos = new THREE.Vector3(3.2, 0.45, 2.5);
    const ballVel = new THREE.Vector3(0, 0, 0);
    const ballRadius = 0.45;

    // Smoke, Dust, Butterflies
    let chimneySmokeGroup;
    let dustParticles;
    let butterflies = [];

    // Realistic Sky Dome System (Offline procedural high-res sky textures: 5 Presets)
    let skyDomeMesh = null;
    const skyDomeTextures = [null, null, null, null, null];
    let selectedSkyPresetIdx = 0; // 0: 午后蓝天白云, 1: 夕阳晚霞, 2: 夏夜繁星, 3: 梦幻极光, 4: 晨曦阴天
    const SKY_PRESET_NAMES = [
        "午后蓝天白云", "夕阳晚霞", "夏夜繁星", "梦幻极光", "晨曦阴天"
    ];

    // Procedural Animated Fauna System (Birds, Sheep, Chickens, Cats, Snakes)
    let faunaAnimals = [];

    // Environmental Light Multiplier (调节环境光照强度，避免过曝太亮)
    let ambientIntensityMultiplier = 0.75;

    // Animal Riding System (玩家靠近可骑乘与操纵动物)
    let mountedAnimal = null; // null or animal object in faunaAnimals
    let mountYOffset = 0.65;

    // Random Procedural Weapons System (剑、法杖、木棒，可拾取丢弃攻击)
    let groundWeapons = []; // { id, name, mesh, x, z, y, radius, type }
    let equippedWeapon = null; // null or { name, mesh, type }
    let isAttacking = false;
    let attackTimer = 0;
    let attackAnimPhase = 0;

    // WebGL Hardware Acceleration / Turbo Mode (调用多余GPU算力)
    let isTurboRenderEnabled = true;

    // Active Water Meshes in Lake Biomes
    let activeWaterMeshes = [];

    // Dual Joystick Input State (-1 to +1)
    const input = {
        moveX: 0,
        moveY: 0,
        lookX: 0,
        lookY: 0
    };

    // Audio Synthesizer & 8-Bit Chiptune Engine
    let audioCtx = null;
    let soundEnabled = true;
    let breezeGain = null;
    let musicMasterGain = null;
    let musicVolume = 0.7;
    let currentTrackIdx = 0;
    let musicTimer = null;
    let noteStep = 0;

    // 4 Preset 8-Bit Classic Retro Chiptune Tracks
    const CHIPTUNE_TRACKS = [
        {
            title: "夏日微风 (8-Bit)",
            bpm: 128,
            melody: [
                523.25, 587.33, 659.25, 523.25,  659.25, 587.33, 523.25, 392.00,
                440.00, 523.25, 587.33, 440.00,  523.25, 392.00, 329.63, 392.00,
                523.25, 659.25, 783.99, 659.25,  783.99, 659.25, 587.33, 523.25,
                440.00, 523.25, 659.25, 587.33,  523.25, 0,      523.25, 0
            ],
            bass: [
                130.81, 0, 130.81, 0,  164.81, 0, 164.81, 0,
                110.00, 0, 110.00, 0,  98.00,  0, 98.00,  0,
                130.81, 0, 130.81, 0,  164.81, 0, 164.81, 0,
                110.00, 0, 146.83, 0,  130.81, 0, 130.81, 0
            ]
        },
        {
            title: "绿野大冒险 (8-Bit)",
            bpm: 140,
            melody: [
                349.23, 440.00, 523.25, 698.46,  659.25, 587.33, 523.25, 440.00,
                392.00, 466.16, 587.33, 523.25,  466.16, 392.00, 440.00, 523.25,
                587.33, 659.25, 698.46, 587.33,  523.25, 440.00, 392.00, 349.23,
                392.00, 440.00, 466.16, 523.25,  349.23, 0,      349.23, 0
            ],
            bass: [
                174.61, 0, 174.61, 0,  220.00, 0, 220.00, 0,
                196.00, 0, 196.00, 0,  174.61, 0, 261.63, 0,
                146.83, 0, 146.83, 0,  174.61, 0, 174.61, 0,
                196.00, 0, 261.63, 0,  174.61, 0, 174.61, 0
            ]
        },
        {
            title: "午后阳光 (8-Bit)",
            bpm: 110,
            melody: [
                392.00, 0, 493.88, 587.33,  659.25, 587.33, 493.88, 0,
                440.00, 0, 523.25, 659.25,  587.33, 523.25, 440.00, 0,
                392.00, 0, 493.88, 587.33,  783.99, 659.25, 587.33, 493.88,
                440.00, 493.88, 523.25, 587.33,  392.00, 0, 392.00, 0
            ],
            bass: [
                98.00, 0, 98.00, 0,  146.83, 0, 146.83, 0,
                110.00, 0, 110.00, 0, 130.81, 0, 130.81, 0,
                98.00, 0, 98.00, 0,  123.47, 0, 123.47, 0,
                110.00, 0, 146.83, 0, 98.00, 0, 98.00, 0
            ]
        },
        {
            title: "复古像素风 (8-Bit)",
            bpm: 152,
            melody: [
                440.00, 440.00, 523.25, 659.25,  587.33, 523.25, 440.00, 392.00,
                440.00, 392.00, 349.23, 329.63,  349.23, 392.00, 440.00, 0,
                659.25, 659.25, 587.33, 523.25,  587.33, 659.25, 783.99, 659.25,
                587.33, 523.25, 440.00, 392.00,  440.00, 0,      440.00, 0
            ],
            bass: [
                110.00, 110.00, 110.00, 110.00,  130.81, 130.81, 130.81, 130.81,
                87.31,  87.31,  87.31,  87.31,   98.00,  98.00,  98.00,  98.00,
                110.00, 110.00, 110.00, 110.00,  130.81, 130.81, 130.81, 130.81,
                87.31,  87.31,  98.00,  98.00,   110.00, 0,      110.00, 0
            ]
        }
    ];

    // --- Native Android Haptics & State Bridge ---
    function triggerHaptic(duration = 25, amplitude = 120) {
        if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
            try {
                window.AndroidBridge.vibrate(duration, amplitude);
            } catch (e) {}
        }
    }

    function reportStateToNative(state) {
        if (window.AndroidBridge && typeof window.AndroidBridge.onCharacterState === 'function') {
            try {
                window.AndroidBridge.onCharacterState(state);
            } catch (e) {}
        }
    }

    // --- Custom Recorded Sound Registry (碰撞/攻击/跳跃/走路/猫叫/鸡叫/羊叫/风声/雨声/雷声/背景音) ---
    const customSoundDataUrls = {};
    const customSoundBuffers = {};
    let bgmEnabled = true;
    let customBgmSource = null;
    let customWindSource = null;
    let customWindGain = null;
    let rainAmbientGain = null;
    let customRainSource = null;
    let customRainGain = null;
    let lastFootstepTime = 0;
    let lastAnimalVoiceTime = 0;
    let lastAmbientThunderTime = 0;

    function decodeBase64AudioToArrayBuffer(dataUrl) {
        const commaIdx = dataUrl.indexOf(',');
        const b64 = (commaIdx >= 0) ? dataUrl.slice(commaIdx + 1) : dataUrl;
        const u8 = decodeBase64ToUint8Array(b64);
        return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    }

    function decodeAndStoreCustomAudio(slotKey, dataUrl) {
        if (!dataUrl || !audioCtx) return;
        try {
            const arrBuf = decodeBase64AudioToArrayBuffer(dataUrl);
            audioCtx.decodeAudioData(arrBuf, (decoded) => {
                customSoundBuffers[slotKey] = decoded;
                if (slotKey === 'wind') {
                    applyWindSoundSource();
                } else if (slotKey === 'rain') {
                    applyWeatherAudio();
                } else if (slotKey === 'bgm' && bgmEnabled && currentTrackIdx === 4) {
                    startMusicLoop();
                }
            }, (err) => {
                console.warn('decodeAudioData failed for ' + slotKey, err);
            });
        } catch (e) {
            console.warn('Failed to load custom audio for ' + slotKey, e);
        }
    }

    function applyWindSoundSource() {
        try {
            if (customWindSource) {
                try { customWindSource.stop(); } catch (_) {}
                customWindSource = null;
            }
            if (!audioCtx) return;
            const customWind = customSoundBuffers['wind'];
            if (customWind && soundEnabled) {
                if (breezeGain) breezeGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
                const src = audioCtx.createBufferSource();
                src.buffer = customWind;
                src.loop = true;
                if (!customWindGain) {
                    customWindGain = audioCtx.createGain();
                    customWindGain.connect(audioCtx.destination);
                }
                customWindGain.gain.setValueAtTime(0.22, audioCtx.currentTime);
                src.connect(customWindGain);
                src.start();
                customWindSource = src;
            } else if (breezeGain) {
                breezeGain.gain.setValueAtTime(soundEnabled ? 0.04 : 0.0, audioCtx.currentTime);
            }
        } catch (e) {}
    }

    function applyWeatherAudio() {
        try {
            if (customRainSource) {
                try { customRainSource.stop(); } catch (_) {}
                customRainSource = null;
            }
            if (!audioCtx) return;
            const isRaining = (currentWeatherKey === 'rain' || currentWeatherKey === 'thunderstorm');
            const customRain = customSoundBuffers['rain'];
            if (isRaining && customRain && soundEnabled) {
                if (rainAmbientGain) rainAmbientGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
                const src = audioCtx.createBufferSource();
                src.buffer = customRain;
                src.loop = true;
                if (!customRainGain) {
                    customRainGain = audioCtx.createGain();
                    customRainGain.connect(audioCtx.destination);
                }
                const targetGain = (currentWeatherKey === 'thunderstorm') ? 0.28 : 0.18;
                customRainGain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
                src.connect(customRainGain);
                src.start();
                customRainSource = src;
            } else if (rainAmbientGain) {
                const targetRainVol = (isRaining && soundEnabled) ? ((currentWeatherKey === 'thunderstorm') ? 0.12 : 0.07) : 0.0;
                rainAmbientGain.gain.setValueAtTime(targetRainVol, audioCtx.currentTime);
            }
        } catch (e) {}
    }

    function playCustomSoundBuffer(slotKey, volume = 0.85) {
        const buf = customSoundBuffers[slotKey];
        if (!buf || !soundEnabled || !audioCtx) return false;
        try {
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(volume, audioCtx.currentTime);
            src.connect(gain);
            gain.connect(audioCtx.destination);
            src.start();
            return true;
        } catch (e) {
            return false;
        }
    }

    window.setCustomSound = function (slotKey, wavDataUrl) {
        if (!slotKey || !wavDataUrl) return;
        customSoundDataUrls[slotKey] = wavDataUrl;
        if (audioCtx) {
            decodeAndStoreCustomAudio(slotKey, wavDataUrl);
        }
    };

    window.clearCustomSound = function (slotKey) {
        if (!slotKey) return;
        delete customSoundDataUrls[slotKey];
        delete customSoundBuffers[slotKey];
        if (slotKey === 'wind') {
            applyWindSoundSource();
        } else if (slotKey === 'rain') {
            applyWeatherAudio();
        } else if (slotKey === 'bgm' && currentTrackIdx === 4) {
            switchMusicTrack(0);
        }
    };

    // --- Web Audio API Procedural Soundscape & 8-Bit Synthesizer ---
    function initAudio() {
        if (audioCtx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            audioCtx = new AudioContextClass();

            // Background ambient summer breeze
            const bufferSize = audioCtx.sampleRate * 2;
            const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = audioCtx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(450, audioCtx.currentTime);
            filter.Q.setValueAtTime(1.8, audioCtx.currentTime);

            breezeGain = audioCtx.createGain();
            breezeGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

            whiteNoise.connect(filter);
            filter.connect(breezeGain);
            breezeGain.connect(audioCtx.destination);
            whiteNoise.start();

            const lfo = audioCtx.createOscillator();
            lfo.frequency.setValueAtTime(0.25, audioCtx.currentTime);
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.setValueAtTime(200, audioCtx.currentTime);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start();

            // Procedural Weather Rain Noise Loop (initially silent unless raining)
            const rainNoise = audioCtx.createBufferSource();
            rainNoise.buffer = noiseBuffer;
            rainNoise.loop = true;
            const rainFilter = audioCtx.createBiquadFilter();
            rainFilter.type = 'bandpass';
            rainFilter.frequency.setValueAtTime(1150, audioCtx.currentTime);
            rainFilter.Q.setValueAtTime(0.7, audioCtx.currentTime);
            rainAmbientGain = audioCtx.createGain();
            rainAmbientGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
            rainNoise.connect(rainFilter);
            rainFilter.connect(rainAmbientGain);
            rainAmbientGain.connect(audioCtx.destination);
            rainNoise.start();

            // Master Gain node for 8-Bit Chiptune Music & Custom BGM
            musicMasterGain = audioCtx.createGain();
            musicMasterGain.gain.setValueAtTime(musicVolume * 0.35, audioCtx.currentTime);
            musicMasterGain.connect(audioCtx.destination);

            startMusicLoop();
            applyWeatherAudio();

            // Decode any preloaded custom WAV sound slots from native storage
            Object.keys(customSoundDataUrls).forEach(k => {
                decodeAndStoreCustomAudio(k, customSoundDataUrls[k]);
            });
        } catch (e) {}
    }

    function play8BitPercussion(dur = 0.045) {
        if (!soundEnabled || !audioCtx || !musicMasterGain) return;
        try {
            const bufferSize = Math.floor(audioCtx.sampleRate * dur);
            const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuffer;
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
            noise.connect(gain);
            gain.connect(musicMasterGain);
            noise.start();
        } catch (e) {}
    }

    function playChiptuneStep() {
        if (!soundEnabled || !audioCtx || !musicMasterGain) return;
        try {
            const track = CHIPTUNE_TRACKS[currentTrackIdx];
            const stepTime = (60 / track.bpm) / 2;

            const melodyFreq = track.melody[noteStep % track.melody.length];
            const bassFreq = track.bass[noteStep % track.bass.length];

            // 1. Square wave Lead Melody (经典红白机/FC音效)
            if (melodyFreq > 0) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(melodyFreq, audioCtx.currentTime);

                gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + stepTime * 0.88);

                osc.connect(gain);
                gain.connect(musicMasterGain);
                osc.start();
                osc.stop(audioCtx.currentTime + stepTime * 0.9);
            }

            // 2. Triangle wave Bass
            if (bassFreq > 0) {
                const bassOsc = audioCtx.createOscillator();
                const bassGain = audioCtx.createGain();
                bassOsc.type = 'triangle';
                bassOsc.frequency.setValueAtTime(bassFreq, audioCtx.currentTime);

                bassGain.gain.setValueAtTime(0.16, audioCtx.currentTime);
                bassGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + stepTime * 0.95);

                bassOsc.connect(bassGain);
                bassGain.connect(musicMasterGain);
                bassOsc.start();
                bassOsc.stop(audioCtx.currentTime + stepTime);
            }

            // 3. 8-Bit backbeat percussion
            if (noteStep % 4 === 2) {
                play8BitPercussion(stepTime * 0.4);
            }

            noteStep++;
        } catch (e) {}
    }

    function startMusicLoop() {
        stopMusicLoop();
        if (!audioCtx || !bgmEnabled || !soundEnabled) return;
        if (currentTrackIdx === 4 && customSoundBuffers['bgm']) {
            try {
                const src = audioCtx.createBufferSource();
                src.buffer = customSoundBuffers['bgm'];
                src.loop = true;
                src.connect(musicMasterGain);
                src.start();
                customBgmSource = src;
            } catch (e) {}
            return;
        }
        const track = CHIPTUNE_TRACKS[currentTrackIdx % CHIPTUNE_TRACKS.length];
        const stepMs = ((60 / track.bpm) / 2) * 1000;
        musicTimer = setInterval(playChiptuneStep, stepMs);
    }

    function stopMusicLoop() {
        if (musicTimer) {
            clearInterval(musicTimer);
            musicTimer = null;
        }
        if (customBgmSource) {
            try { customBgmSource.stop(); } catch (_) {}
            customBgmSource = null;
        }
    }

    window.setBgmEnabled = function (enabled) {
        initAudio();
        bgmEnabled = !!enabled;
        const trackTitleEl = document.getElementById('music-title');
        const musicIconEl = document.getElementById('music-icon');
        if (!bgmEnabled) {
            stopMusicLoop();
            if (trackTitleEl) trackTitleEl.textContent = "无背景音乐";
            if (musicIconEl) musicIconEl.textContent = "🔇";
        } else {
            if (musicIconEl) musicIconEl.textContent = (currentTrackIdx === 4) ? "🎤" : "🎵";
            if (trackTitleEl) {
                trackTitleEl.textContent = (currentTrackIdx === 4 && customSoundBuffers['bgm'])
                    ? "自定义背景音"
                    : CHIPTUNE_TRACKS[currentTrackIdx % CHIPTUNE_TRACKS.length].title;
            }
            startMusicLoop();
        }
        if (window.AndroidBridge && typeof window.AndroidBridge.onBgmEnabledChanged === 'function') {
            try { window.AndroidBridge.onBgmEnabledChanged(bgmEnabled); } catch (e) {}
        }
    };

    window.setMusicVolume = function (vol) {
        musicVolume = Math.max(0, Math.min(1, vol));
        if (musicMasterGain && audioCtx) {
            musicMasterGain.gain.setValueAtTime(musicVolume * 0.35, audioCtx.currentTime);
        }
        const slider = document.getElementById('volume-slider');
        if (slider) slider.value = Math.round(musicVolume * 100);

        const volIcon = document.getElementById('vol-icon');
        if (volIcon) {
            volIcon.textContent = (musicVolume > 0.01) ? '🔊' : '🔇';
        }

        if (window.AndroidBridge && typeof window.AndroidBridge.onMusicVolumeChanged === 'function') {
            try { window.AndroidBridge.onMusicVolumeChanged(musicVolume); } catch (e) {}
        }
    };

    window.switchMusicTrack = function (index) {
        initAudio();
        const hasCustomBgm = !!customSoundBuffers['bgm'] || !!customSoundDataUrls['bgm'];
        if (index === undefined) {
            if (!bgmEnabled) {
                bgmEnabled = true;
                currentTrackIdx = 0;
            } else if (currentTrackIdx < CHIPTUNE_TRACKS.length - 1) {
                currentTrackIdx++;
            } else if (currentTrackIdx === CHIPTUNE_TRACKS.length - 1 && hasCustomBgm) {
                currentTrackIdx = 4;
            } else {
                // Cycling past last track disables background music
                window.setBgmEnabled(false);
                const hint = document.getElementById('hint-banner');
                if (hint) {
                    hint.textContent = "🔇 已关闭背景音乐（无BGM）";
                    hint.classList.add('show');
                    setTimeout(() => hint.classList.remove('show'), 2000);
                }
                return;
            }
        } else {
            bgmEnabled = true;
            currentTrackIdx = (index === 4 && hasCustomBgm) ? 4 : (index % CHIPTUNE_TRACKS.length);
        }

        noteStep = 0;
        const trackTitleText = (currentTrackIdx === 4)
            ? "自定义录音背景音"
            : CHIPTUNE_TRACKS[currentTrackIdx].title;

        const trackTitleEl = document.getElementById('music-title');
        const musicIconEl = document.getElementById('music-icon');
        if (trackTitleEl) trackTitleEl.textContent = trackTitleText;
        if (musicIconEl) musicIconEl.textContent = (currentTrackIdx === 4) ? "🎤" : "🎵";

        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = `🎵 正在播放: ${trackTitleText}`;
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2000);
        }

        if (window.AndroidBridge && typeof window.AndroidBridge.onBgmEnabledChanged === 'function') {
            try { window.AndroidBridge.onBgmEnabledChanged(bgmEnabled); } catch (e) {}
        }
        if (window.AndroidBridge && typeof window.AndroidBridge.onTrackChanged === 'function') {
            try { window.AndroidBridge.onTrackChanged(currentTrackIdx); } catch (e) {}
        }

        startMusicLoop();
    };

    function playKickSound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.18);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        } catch (e) {}
    }

    function playChimeNote(freq = 440) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 1.2);
        } catch (e) {}
    }

    function playAttackSound() {
        if (!soundEnabled || !audioCtx) return;
        if (playCustomSoundBuffer('attack', 0.9)) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.16);
        } catch (e) {}
    }

    function playJumpSound() {
        if (!soundEnabled || !audioCtx) return;
        if (playCustomSoundBuffer('jump', 0.9)) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.17);
        } catch (e) {}
    }

    function playFootstepSound(isMounted = false) {
        if (!soundEnabled || !audioCtx) return;
        const nowMs = performance.now();
        if (nowMs - lastFootstepTime < (isMounted ? 170 : 230)) return;
        lastFootstepTime = nowMs;
        if (playCustomSoundBuffer('walk', 0.72)) return;
        if (isMounted) playKickSound(); else playRustle();
    }

    function playAnimalVoice(animalType) {
        if (!soundEnabled || !audioCtx) return;
        const key = (animalType === 'cat' || animalType === 'chicken' || animalType === 'sheep') ? animalType : null;
        if (!key) return;
        if (playCustomSoundBuffer(key, 0.9)) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            if (key === 'cat') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(680, now);
                osc.frequency.exponentialRampToValueAtTime(920, now + 0.08);
                osc.frequency.exponentialRampToValueAtTime(480, now + 0.28);
                gain.gain.setValueAtTime(0.16, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.31);
            } else if (key === 'chicken') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.setValueAtTime(660, now + 0.05);
                osc.frequency.setValueAtTime(480, now + 0.10);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.17);
            } else {
                // sheep baa
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(240, now);
                osc.frequency.linearRampToValueAtTime(215, now + 0.25);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(now); osc.stop(now + 0.34);
            }
        } catch (e) {}
    }

    function playThunderSound() {
        if (!soundEnabled || !audioCtx) return;
        if (playCustomSoundBuffer('thunder', 0.95)) return;
        try {
            const now = audioCtx.currentTime;
            const bufferSize = Math.floor(audioCtx.sampleRate * 1.4);
            const noiseBuf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = noiseBuf.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                const env = Math.pow(1 - i / bufferSize, 1.5);
                data[i] = (Math.random() * 2 - 1) * env;
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(260, now);
            filter.frequency.exponentialRampToValueAtTime(65, now + 1.3);
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            noise.start(now);
        } catch (e) {}
    }

    function playPickupSound() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                gain.gain.setValueAtTime(0.16, now + idx * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + idx * 0.05);
                osc.stop(now + idx * 0.05 + 0.19);
            });
        } catch (e) {}
    }

    function playMountSound(isMounting = true) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            if (isMounting) {
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(587, now + 0.22);
            } else {
                osc.frequency.setValueAtTime(587, now);
                osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
            }
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.24);
        } catch (e) {}
    }

    function play8BitCollisionMusic(type = 'building') {
        if (!soundEnabled || !audioCtx) return;
        if (playCustomSoundBuffer('collision', 0.92)) return;
        try {
            const now = audioCtx.currentTime;
            if (type === 'animal') {
                // 8-Bit 动物接触碰撞音乐：清脆灵动的 8-Bit 方波小三度跳音 (C5 -> E5 -> G5)
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.setValueAtTime(659.25, now + 0.04);
                osc.frequency.setValueAtTime(783.99, now + 0.08);
                gain.gain.setValueAtTime(0.14, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'tree') {
                // 8-Bit 树木与植被碰撞音乐：柔和怀旧的三角波/方波琶音 (A4 -> E4 -> C4)
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440.0, now);
                osc.frequency.setValueAtTime(329.63, now + 0.04);
                osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.09);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.13);
            } else {
                // 8-Bit 建筑与刚体墙壁碰撞音乐：经典红白机反弹分解和弦 (G3 -> D4 -> G4)
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(196.00, now);
                osc.frequency.setValueAtTime(293.66, now + 0.04);
                osc.frequency.setValueAtTime(392.00, now + 0.08);
                gain.gain.setValueAtTime(0.16, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            }
        } catch (e) {}
    }
    const playCollisionSound = play8BitCollisionMusic;

    function playRustle() {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80 + Math.random() * 40, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.09);
        } catch (e) {}
    }

    // --- Helper: Safe Object3D Cloning (Bypasses circular reference traps in userData) ---
    function safeCloneObject3D(source) {
        if (!source) return null;
        const savedUserData = source.userData;
        let cloned = null;
        try {
            source.userData = {};
            cloned = source.clone(true);
        } catch (e) {
            console.warn("safeCloneObject3D fallback:", e);
            cloned = source;
        } finally {
            source.userData = savedUserData;
            if (cloned && cloned !== source) {
                try {
                    cloned.userData = Object.assign({}, savedUserData);
                } catch (_) {}
            }
        }
        return cloned;
    }

    // --- Helper: Create Toon Inverted-Hull Black Outline (三渲二描边) ---
    function attachToonOutline(mesh, scaleMultiplier = 1.05) {
        if (!mesh || !mesh.geometry) return null;

        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x050505,
            side: THREE.BackSide
        });

        const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
        outlineMesh.scale.multiplyScalar(scaleMultiplier);
        outlineMesh.visible = (currentRenderStyle === '2d');
        mesh.add(outlineMesh);
        toonOutlines.push(outlineMesh);
        return outlineMesh;
    }

    // --- Scene Setup ---
    function initScene() {
        const container = document.getElementById('canvas-container');

        // Scene & Fog
        scene = new THREE.Scene();
        scene.background = new THREE.Color(MOODS[0].skyColor);
        scene.fog = new THREE.FogExp2(MOODS[0].fogColor, 0.016);

        // Camera
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.2, 300);

        // Renderer with Android WebView WebGL stability (no MSAA resolve glitch, preserveDrawingBuffer, capped DPR)
        renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: "high-performance",
            precision: "highp",
            stencil: false,
            depth: true,
            alpha: false,
            preserveDrawingBuffer: true,
            logarithmicDepthBuffer: false
        });
        const initW = Math.max(1, window.innerWidth || 1280);
        const initH = Math.max(1, window.innerHeight || 720);
        renderer.setSize(initW, initH);
        renderer.setPixelRatio(isTurboRenderEnabled ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 1.0));
        adaptCameraFOV();
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);

        renderer.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn("WebGL context lost - awaiting restore");
        }, false);
        renderer.domElement.addEventListener('webglcontextrestored', () => {
            console.info("WebGL context restored");
            const rw = Math.max(1, window.innerWidth || 1280);
            const rh = Math.max(1, window.innerHeight || 720);
            renderer.setSize(rw, rh);
            renderer.setPixelRatio(isTurboRenderEnabled ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 1.0));
            adaptCameraFOV();
            scene.traverse(obj => {
                if (obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach(m => { if (m) m.needsUpdate = true; });
                }
            });
        }, false);

        // Query device local WebGL GPU hardware acceleration information
        try {
            const gl = renderer.getContext();
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                hardwareGpuName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || hardwareGpuName;
            }
        } catch (e) {
            console.warn("Could not query GPU info:", e);
        }

        // Lighting (Default Ambient Multiplier 0.75 for soft, non-glaring natural sun)
        hemiLight = new THREE.HemisphereLight(MOODS[0].hemiSky, MOODS[0].hemiGround, 0.85 * ambientIntensityMultiplier);
        scene.add(hemiLight);

        sunLight = new THREE.DirectionalLight(MOODS[0].sunColor, MOODS[0].sunIntensity * ambientIntensityMultiplier);
        sunLight.position.set(24, 38, 18);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = isTurboRenderEnabled ? 1536 : 1024;
        sunLight.shadow.mapSize.height = isTurboRenderEnabled ? 1536 : 1024;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 120;
        const d = 26;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        sunLight.shadow.bias = -0.0006;
        scene.add(sunLight);

        // Build Realistic Sky Dome (真实天空穹顶贴图：午后蓝天白云、晚霞夕阳、夜空繁星、梦幻极光、晨曦阴天)
        initSkyDome();

        // Build Infinite Procedural Spherical Planet & Multi-Biome Terrain
        initProceduralWorld();
        createBall();
        createDustParticles();
        createButterflies();
        createAtmosphericClouds();
        initWeatherEffects();
        initFauna();
        spawnGroundWeaponsAround(0, 0);

        // Create Character
        createCharacter(currentCharacterType);

        // Update Camera
        updateCameraPosition();

        if (window.AndroidBridge && typeof window.AndroidBridge.onGameReady === 'function') {
            try { window.AndroidBridge.onGameReady(); } catch (e) {}
        }
    }

    // ========================================================================
    // 1. REALISTIC SKY DOME SYSTEM (真实天空穹顶贴图生成与动态切换)
    // 预置多张高精逼真天空贴图（午后蓝天白云、夕阳晚霞、夏夜繁星、梦幻极光、晨曦阴天）
    // 100% 离线动态 CanvasTexture，高保真云层、晚霞余晖、繁星银河、极光帷幕与明月
    // ========================================================================
    function generateSkyDomeTexture(presetIndex) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        if (presetIndex === 0) {
            // --- 1. 午后蓝天白云 (Afternoon): 澄澈湛蓝晴空，多层软萌白云，金辉骄阳 ---
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0.0, '#1266b5');
            grad.addColorStop(0.35, '#3d94e3');
            grad.addColorStop(0.7, '#8ed2fc');
            grad.addColorStop(1.0, '#e3f3fd');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // 太阳光辉与镜头光晕
            const sunX = w * 0.72;
            const sunY = h * 0.30;
            const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 180);
            sunGlow.addColorStop(0, 'rgba(255, 255, 240, 1)');
            sunGlow.addColorStop(0.15, 'rgba(255, 248, 200, 0.85)');
            sunGlow.addColorStop(0.5, 'rgba(255, 230, 160, 0.28)');
            sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = sunGlow;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
            ctx.fill();

            // 多层蓬松积云簇
            const drawCloudPuff = (cx, cy, rx, ry, opacity, isBase = false) => {
                ctx.fillStyle = isBase ? `rgba(205, 225, 245, ${opacity * 0.65})` : `rgba(255, 255, 255, ${opacity})`;
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
            };

            const cloudClusters = [
                { x: 140, y: 150, scale: 1.1, count: 9 },
                { x: 440, y: 210, scale: 0.85, count: 7 },
                { x: 790, y: 130, scale: 1.25, count: 11 },
                { x: 980, y: 230, scale: 0.7, count: 6 },
                { x: 290, y: 300, scale: 0.6, count: 5 },
                { x: 630, y: 310, scale: 0.55, count: 5 }
            ];

            cloudClusters.forEach(c => {
                for (let i = 0; i < c.count; i++) {
                    const ox = (i - c.count / 2) * 16 * c.scale;
                    const oy = Math.sin(i * 0.8) * 8 * c.scale + 6;
                    drawCloudPuff(c.x + ox, c.y + oy + 8, 30 * c.scale, 18 * c.scale, 0.7, true);
                }
                for (let i = 0; i < c.count; i++) {
                    const ox = (i - c.count / 2) * 16 * c.scale;
                    const oy = -Math.abs(Math.sin((i / c.count) * Math.PI)) * 14 * c.scale;
                    const r = (20 + Math.sin(i * 1.5) * 8) * c.scale;
                    drawCloudPuff(c.x + ox, c.y + oy, r, r * 0.8, 0.92, false);
                }
            });

        } else if (presetIndex === 1) {
            // --- 2. 夕阳晚霞 (Sunset): 暮紫向火橙渐变，金色余晖倒映，晚霞云带 ---
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0.0, '#260c38');
            grad.addColorStop(0.24, '#4c154f');
            grad.addColorStop(0.48, '#c31432');
            grad.addColorStop(0.72, '#ff6f00');
            grad.addColorStop(0.88, '#ffa000');
            grad.addColorStop(1.0, '#ffe082');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // 贴近地平线的落日晚霞与大气漫射
            const sunX = w * 0.5;
            const sunY = h * 0.73;
            const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 260);
            sunGlow.addColorStop(0, 'rgba(255, 255, 230, 1)');
            sunGlow.addColorStop(0.18, 'rgba(255, 200, 100, 0.95)');
            sunGlow.addColorStop(0.45, 'rgba(255, 120, 50, 0.6)');
            sunGlow.addColorStop(0.8, 'rgba(200, 50, 80, 0.25)');
            sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = sunGlow;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
            ctx.fill();

            // 染红金边晚霞
            const sunsetClouds = [
                { x: 190, y: 250, w: 220, h: 28 },
                { x: 490, y: 200, w: 280, h: 32 },
                { x: 830, y: 270, w: 240, h: 30 },
                { x: 330, y: 350, w: 180, h: 22 },
                { x: 690, y: 360, w: 210, h: 24 }
            ];
            sunsetClouds.forEach(c => {
                const cGrad = ctx.createLinearGradient(c.x, c.y - c.h, c.x, c.y + c.h);
                cGrad.addColorStop(0, 'rgba(90, 30, 60, 0.7)');
                cGrad.addColorStop(0.6, 'rgba(255, 110, 40, 0.85)');
                cGrad.addColorStop(1, 'rgba(255, 220, 130, 0.95)');
                ctx.fillStyle = cGrad;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, c.w * 0.5, c.h * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            });

        } else if (presetIndex === 2) {
            // --- 3. 夏夜繁星 (Night): 深邃宇宙暗夜蓝，漫天繁星，银河星云，皎洁明月 ---
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0.0, '#02050e');
            grad.addColorStop(0.4, '#060e22');
            grad.addColorStop(0.75, '#0c1b33');
            grad.addColorStop(1.0, '#102240');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // 斜向银河星云尘带
            ctx.save();
            ctx.translate(w * 0.45, h * 0.4);
            ctx.rotate(-Math.PI / 6);
            const mwGrad = ctx.createLinearGradient(-150, 0, 150, 0);
            mwGrad.addColorStop(0, 'rgba(60, 120, 200, 0)');
            mwGrad.addColorStop(0.3, 'rgba(120, 180, 255, 0.12)');
            mwGrad.addColorStop(0.5, 'rgba(200, 180, 255, 0.18)');
            mwGrad.addColorStop(0.7, 'rgba(120, 200, 255, 0.12)');
            mwGrad.addColorStop(1, 'rgba(60, 120, 200, 0)');
            ctx.fillStyle = mwGrad;
            ctx.fillRect(-150, -400, 300, 800);
            ctx.restore();

            // 漫天细密璀璨繁星
            let starRng = 42;
            const nextStarRnd = () => {
                starRng = (starRng * 9301 + 49297) % 233280;
                return starRng / 233280;
            };

            const starColors = [
                'rgba(255, 255, 255, 0.95)',
                'rgba(200, 230, 255, 0.9)',
                'rgba(255, 245, 200, 0.85)',
                'rgba(255, 210, 210, 0.8)',
                'rgba(180, 220, 255, 0.95)'
            ];

            for (let i = 0; i < 900; i++) {
                const sx = nextStarRnd() * w;
                const sy = nextStarRnd() * (h * 0.88);
                const sr = 0.5 + nextStarRnd() * 1.5;
                const color = starColors[Math.floor(nextStarRnd() * starColors.length)];
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(sx, sy, sr, 0, Math.PI * 2);
                ctx.fill();

                if (i < 25) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
                    ctx.lineWidth = 0.75;
                    ctx.beginPath();
                    ctx.moveTo(sx - 5, sy);
                    ctx.lineTo(sx + 5, sy);
                    ctx.moveTo(sx, sy - 5);
                    ctx.lineTo(sx, sy + 5);
                    ctx.stroke();
                }
            }

            // 皎洁弯月与月华光晕
            const moonX = w * 0.82;
            const moonY = h * 0.28;
            const moonGlow = ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 90);
            moonGlow.addColorStop(0, 'rgba(230, 245, 255, 0.6)');
            moonGlow.addColorStop(0.4, 'rgba(160, 210, 255, 0.2)');
            moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = moonGlow;
            ctx.beginPath();
            ctx.arc(moonX, moonY, 90, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fffef0';
            ctx.beginPath();
            ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#060e22';
            ctx.beginPath();
            ctx.arc(moonX + 10, moonY - 5, 19, 0, Math.PI * 2);
            ctx.fill();

        } else if (presetIndex === 3) {
            // --- 4. 梦幻极光 (Aurora): 翡翠青绿与绚丽紫魅交织极光幕布 ---
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0.0, '#040d1a');
            grad.addColorStop(0.35, '#081f2c');
            grad.addColorStop(0.7, '#0d2830');
            grad.addColorStop(1.0, '#133535');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // 灵动飘逸的绿色与紫色极光缎带
            for (let ribbon = 0; ribbon < 3; ribbon++) {
                ctx.beginPath();
                const baseY = h * (0.35 + ribbon * 0.14);
                ctx.moveTo(0, baseY);
                for (let x = 0; x <= w; x += 25) {
                    const wave1 = Math.sin(x * 0.008 + ribbon) * 45;
                    const wave2 = Math.sin(x * 0.02 - ribbon * 1.5) * 18;
                    ctx.lineTo(x, baseY + wave1 + wave2);
                }
                ctx.lineTo(w, baseY - 90);
                ctx.lineTo(0, baseY - 90);
                ctx.closePath();

                const aGrad = ctx.createLinearGradient(0, baseY - 90, 0, baseY + 60);
                if (ribbon % 2 === 0) {
                    aGrad.addColorStop(0, 'rgba(0, 255, 180, 0)');
                    aGrad.addColorStop(0.5, 'rgba(0, 255, 200, 0.38)');
                    aGrad.addColorStop(1, 'rgba(0, 220, 130, 0)');
                } else {
                    aGrad.addColorStop(0, 'rgba(180, 80, 255, 0)');
                    aGrad.addColorStop(0.5, 'rgba(210, 100, 255, 0.32)');
                    aGrad.addColorStop(1, 'rgba(120, 40, 220, 0)');
                }
                ctx.fillStyle = aGrad;
                ctx.fill();
            }

            // 极光背景下的晶莹繁星
            for (let i = 0; i < 400; i++) {
                const sx = (Math.sin(i * 991) * 0.5 + 0.5) * w;
                const sy = (Math.cos(i * 337) * 0.5 + 0.5) * (h * 0.7);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.beginPath();
                ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
                ctx.fill();
            }

        } else {
            // --- 5. 晨曦阴天 (Overcast Dawn): 柔和晨曦微光，轻云薄雾，宁静淡雅 ---
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0.0, '#4a5b6d');
            grad.addColorStop(0.35, '#76889a');
            grad.addColorStop(0.65, '#a3b5c6');
            grad.addColorStop(0.85, '#d0d8e2');
            grad.addColorStop(1.0, '#e8ecef');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // 晨曦地平线淡金暖光晕
            const dawnGrad = ctx.createRadialGradient(w * 0.5, h * 0.88, 10, w * 0.5, h * 0.88, 300);
            dawnGrad.addColorStop(0, 'rgba(255, 235, 200, 0.65)');
            dawnGrad.addColorStop(0.4, 'rgba(255, 215, 170, 0.35)');
            dawnGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = dawnGrad;
            ctx.fillRect(0, 0, w, h);

            // 灰白水汽层
            for (let i = 0; i < 8; i++) {
                const cx = (i / 8) * w + 60;
                const cy = h * (0.45 + (i % 3) * 0.1);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
                ctx.beginPath();
                ctx.ellipse(cx, cy, 140, 28, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        return texture;
    }

    function getSkyDomeTexture(presetIdx) {
        const safeIdx = Math.max(0, Math.min(4, presetIdx));
        if (!skyDomeTextures[safeIdx]) {
            skyDomeTextures[safeIdx] = generateSkyDomeTexture(safeIdx);
        }
        return skyDomeTextures[safeIdx];
    }

    window.setSkyTexture = function (presetIndex) {
        selectedSkyPresetIdx = Math.max(0, Math.min(4, presetIndex));
        if (skyDomeMesh) {
            skyDomeMesh.material.map = getSkyDomeTexture(selectedSkyPresetIdx);
            skyDomeMesh.material.needsUpdate = true;
        }
        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = `天空贴图已更换: ${SKY_PRESET_NAMES[selectedSkyPresetIdx]} 🌌`;
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2400);
        }
    };

    function initSkyDome() {
        // Radius 240 sits cleanly inside camera.far (300)
        const geo = new THREE.SphereGeometry(240, 32, 24);
        const texture = getSkyDomeTexture(currentMoodIdx);
        const mat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide,
            depthWrite: false
        });
        skyDomeMesh = new THREE.Mesh(geo, mat);
        scene.add(skyDomeMesh);
    }

    // ========================================================================
    // 2. BOUNDLESS SPHERICAL PLANET & MULTI-BIOME PROCEDURAL TERRAIN
    // 整个世界在巨大球形星球上：无限循环、无缝起伏、无死角边界
    // 4 大地形生物群落：湖泊 (Lakes)、草地 (Grasslands)、沙漠 (Deserts)、雪山 (Snow Mountains)
    // ========================================================================
    const CHUNK_SIZE = 55;
    const CHUNK_RADIUS = 2; // 5x5 chunks around player = 275m x 275m dynamic active world
    const activeChunks = new Map();
    const worldColliders = new Map(); // key -> Array of { x, z, radius }
    let lastPlayerChunkX = 999999;
    let lastPlayerChunkZ = 999999;

    // 无缝星球坐标回环周期 (米)
    const WORLD_CYCLE = 420;

    function wrapPlanetCoord(val) {
        return ((val % WORLD_CYCLE) + WORLD_CYCLE) % WORLD_CYCLE;
    }

    // 多阶柏林连续函数计算生态群落分布 (Biomes)
    function getBiome(x, z) {
        const wx = wrapPlanetCoord(x);
        const wz = wrapPlanetCoord(z);

        // 高程扰动场 (Elevation)
        const e = Math.sin(wx * 0.016) * Math.cos(wz * 0.016) * 4.6
                + Math.sin(wx * 0.036 + 1.2) * 2.2
                + Math.cos(wz * 0.032 - 0.7) * 1.8
                + Math.sin((wx + wz) * 0.009) * 1.4;

        // 湿度干旱度扰动场 (Moisture)
        const m = (Math.sin(wx * 0.012 - 1.1) + Math.cos(wz * 0.012 + 0.9) + 2) * 0.25;

        // 起点 (0,0) 周围保持舒适平缓草坪
        if (Math.hypot(x, z) < 28) {
            return { type: 'grassland', elevation: Math.max(0.3, Math.min(e, 1.2)), moisture: 0.6 };
        }

        let type = 'grassland';
        if (e < 0.15) {
            type = 'lake';          // 湖泊水域
        } else if (e >= 4.2) {
            type = 'snow_mountain'; // 巍峨雪山
        } else if (m < 0.36) {
            type = 'desert';        // 金色沙漠
        } else {
            type = 'grassland';     // 翠绿草地
        }
        return { type, elevation: e, moisture: m };
    }

    // 真实地表高程采样函数
    function getTerrainHeight(x, z) {
        const b = getBiome(x, z);
        let h = b.elevation;
        if (b.type === 'lake') {
            // 湖底凹陷
            h = Math.min(-0.35, h * 0.75 - 0.5);
        } else if (b.type === 'snow_mountain') {
            // 雪山险峻山脊
            h = 3.8 + (b.elevation - 4.2) * 1.5;
        }
        const distFromCenter = Math.hypot(x, z);
        if (distFromCenter < 18) {
            h *= (distFromCenter / 18);
        }
        return h;
    }

    // Deterministic pseudo-random number generator for chunk consistency
    function createChunkRNG(cx, cz) {
        let seed = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453;
        seed = (seed - Math.floor(seed)) * 1000000;
        return function () {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    // Shared Materials for Procedural Buildings, Terrain & Vegetation to maximize GPU efficiency
    const sharedMaterials = {
        dirt: new THREE.Color(0xd7ba8c),
        grass1: new THREE.Color(0x66bb6a),
        grass2: new THREE.Color(0x8bc34a),
        flowerColors: [0xff5252, 0xffd54f, 0x42a5f5, 0xba68c8, 0xffb74d, 0x81c784, 0xffffff],
        woodTrunk: Object.assign(new THREE.MeshLambertMaterial({ color: 0x6d4c41 }), { userData: { isShared: true } }),
        fenceWood: Object.assign(new THREE.MeshLambertMaterial({ color: 0x7c5432 }), { userData: { isShared: true } }),
        stoneWall: Object.assign(new THREE.MeshLambertMaterial({ color: 0x78909c }), { userData: { isShared: true } }),
        waterMat: Object.assign(new THREE.MeshLambertMaterial({
            color: 0x0288d1,
            transparent: true,
            opacity: 0.76,
            roughness: 0.2
        }), { userData: { isShared: true } }),
        terrainGrassMat: Object.assign(new THREE.MeshLambertMaterial({ vertexColors: true, roughness: 0.92 }), { userData: { isShared: true } }),
        terrainDesertMat: Object.assign(new THREE.MeshLambertMaterial({ vertexColors: true, roughness: 0.92 }), { userData: { isShared: true } }),
        terrainSnowMat: Object.assign(new THREE.MeshLambertMaterial({ vertexColors: true, roughness: 0.92 }), { userData: { isShared: true } }),
        terrainLakeMat: Object.assign(new THREE.MeshLambertMaterial({ vertexColors: true, roughness: 0.92 }), { userData: { isShared: true } }),
        cactusMat: Object.assign(new THREE.MeshLambertMaterial({ color: 0x2e7d32 }), { userData: { isShared: true } }),
        sandstoneMat: Object.assign(new THREE.MeshLambertMaterial({ color: 0xdeb887 }), { userData: { isShared: true } }),
        snowRockMat: Object.assign(new THREE.MeshLambertMaterial({ color: 0x546e7a }), { userData: { isShared: true } }),
        snowWhiteMat: Object.assign(new THREE.MeshLambertMaterial({ color: 0xfafafa }), { userData: { isShared: true } }),
        flowerStemMat: Object.assign(new THREE.MeshBasicMaterial({ color: 0x388e3c }), { userData: { isShared: true } })
    };

    function initProceduralWorld() {
        updateProceduralWorld(0, 0, true);
    }

    function updateProceduralWorld(playerX, playerZ, force = false) {
        const curCX = Math.floor(playerX / CHUNK_SIZE);
        const curCZ = Math.floor(playerZ / CHUNK_SIZE);

        if (!force && curCX === lastPlayerChunkX && curCZ === lastPlayerChunkZ) return;

        lastPlayerChunkX = curCX;
        lastPlayerChunkZ = curCZ;

        // 1. Unload out-of-range chunks
        for (const [key, chunk] of activeChunks.entries()) {
            if (Math.abs(chunk.cx - curCX) > CHUNK_RADIUS || Math.abs(chunk.cz - curCZ) > CHUNK_RADIUS) {
                disposeChunk(key);
            }
        }

        // 2. Load newly visible chunks
        for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
            for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz++) {
                const cx = curCX + dx;
                const cz = curCZ + dz;
                const key = `${cx}_${cz}`;
                if (!activeChunks.has(key)) {
                    generateChunk(cx, cz, key);
                }
            }
        }
    }

    function generateChunk(cx, cz, key) {
        const chunkGroup = new THREE.Group();
        const rnd = createChunkRNG(cx, cz);
        const chunkColliders = [];
        const placedObstacles = []; // 防重合间距校验列表: { x, z, radius }

        const minX = cx * CHUNK_SIZE;
        const minZ = cz * CHUNK_SIZE;
        const centerX = minX + CHUNK_SIZE / 2;
        const centerZ = minZ + CHUNK_SIZE / 2;
        const chunkBiome = getBiome(centerX, centerZ);

        // 1. Multi-Biome Terrain Mesh with Perlin Vertex Colors
        const seg = 14;
        const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, seg, seg);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        const colors = [];
        let hasLakeWater = false;

        for (let i = 0; i < pos.count; i++) {
            const wx = minX + pos.getX(i) + CHUNK_SIZE / 2;
            const wz = minZ + pos.getZ(i) + CHUNK_SIZE / 2;
            const wy = getTerrainHeight(wx, wz);
            pos.setY(i, wy);

            const vBiome = getBiome(wx, wz);
            let r = 0.45, g = 0.72, b = 0.28;

            if (vBiome.type === 'lake') {
                hasLakeWater = true;
                // 湖岸细沙与湖底碎石色
                r = 0.84; g = 0.75; b = 0.58;
            } else if (vBiome.type === 'desert') {
                // 金色沙丘与风纹渐变
                const duneShade = Math.sin(wx * 0.8) * 0.04;
                r = 0.94 + duneShade; g = 0.76; b = 0.42;
            } else if (vBiome.type === 'snow_mountain') {
                // 灰岩基底过渡到皑皑白雪峰顶
                if (wy >= 5.0) {
                    r = 0.96; g = 0.98; b = 1.0; // 纯白雪顶
                } else {
                    const t = (wy - 3.8) / 1.2;
                    r = 0.45 + 0.5 * Math.max(0, t);
                    g = 0.52 + 0.44 * Math.max(0, t);
                    b = 0.58 + 0.4 * Math.max(0, t);
                }
            } else {
                // 草原：泥土小径与青翠草甸
                const trailDist = Math.abs(wx - Math.sin(wz * 0.1) * 3);
                if (trailDist < 1.6 && Math.abs(wz) < 30) {
                    r = 0.78; g = 0.68; b = 0.48;
                } else {
                    r = 0.42 + Math.sin(wx * 0.15) * 0.04;
                    g = 0.74 + Math.cos(wz * 0.15) * 0.05;
                    b = 0.28;
                }
            }
            colors.push(r, g, b);
        }

        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const uvAttr = geo.attributes.uv;
        if (uvAttr) {
            for (let u = 0; u < uvAttr.count; u++) {
                uvAttr.setXY(u, uvAttr.getX(u) * 6, uvAttr.getY(u) * 6);
            }
            uvAttr.needsUpdate = true;
        }
        geo.computeVertexNormals();

        // Split terrain triangles into 4 biome material groups so Grass/Desert custom textures work independently
        const idxAttr = geo.getIndex();
        if (idxAttr) {
            const buckets = [[], [], [], []]; // 0: grassland, 1: desert, 2: snow_mountain, 3: lake
            for (let i = 0; i < idxAttr.count; i += 3) {
                const ia = idxAttr.getX(i);
                const ib = idxAttr.getX(i + 1);
                const ic = idxAttr.getX(i + 2);
                const mx = minX + (pos.getX(ia) + pos.getX(ib) + pos.getX(ic)) / 3 + CHUNK_SIZE / 2;
                const mz = minZ + (pos.getZ(ia) + pos.getZ(ib) + pos.getZ(ic)) / 3 + CHUNK_SIZE / 2;
                const bType = getBiome(mx, mz).type;
                const matIdx = (bType === 'desert') ? 1 : (bType === 'snow_mountain' ? 2 : (bType === 'lake' ? 3 : 0));
                buckets[matIdx].push(ia, ib, ic);
            }
            const sortedIndices = [];
            geo.clearGroups();
            let offset = 0;
            for (let m = 0; m < 4; m++) {
                if (buckets[m].length > 0) {
                    for (let k = 0; k < buckets[m].length; k++) sortedIndices.push(buckets[m][k]);
                    geo.addGroup(offset, buckets[m].length, m);
                    offset += buckets[m].length;
                }
            }
            geo.setIndex(sortedIndices);
        }

        const terrainMaterials = [
            sharedMaterials.terrainGrassMat,
            sharedMaterials.terrainDesertMat,
            sharedMaterials.terrainSnowMat,
            sharedMaterials.terrainLakeMat
        ];
        const terrainMesh = new THREE.Mesh(geo, terrainMaterials);
        terrainMesh.position.set(centerX, 0, centerZ);
        terrainMesh.receiveShadow = true;
        chunkGroup.add(terrainMesh);

        // 2. Lake Surface Water Mesh (半透明清澈水面与微澜起伏)
        let chunkWater = null;
        if (hasLakeWater || chunkBiome.type === 'lake') {
            const waterGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
            waterGeo.rotateX(-Math.PI / 2);
            const wUv = waterGeo.attributes.uv;
            if (wUv) {
                for (let u = 0; u < wUv.count; u++) {
                    wUv.setXY(u, wUv.getX(u) * 6, wUv.getY(u) * 6);
                }
                wUv.needsUpdate = true;
            }
            chunkWater = new THREE.Mesh(waterGeo, sharedMaterials.waterMat);
            chunkWater.position.set(centerX, 0.0, centerZ);
            chunkGroup.add(chunkWater);
            activeWaterMeshes.push(chunkWater);
        }

        const vegMult = Math.max(0, Math.min(2, vegetationDensity));

        // 3. Biome-Specific Props, Buildings & Vegetation
        if (cx === 0 && cz === 0) {
            // 起点中央木屋与小院
            const starterCabin = createCabinInGroup(chunkGroup);
            chunkColliders.push({ id: `${key}_cabin_main`, label: '起点木屋', mesh: starterCabin, type: 'building', x: 0, z: 0, radius: 4.2 });
            chunkColliders.push({ id: `${key}_cabin_porch`, label: '木屋门廊', mesh: starterCabin, type: 'building', x: 0, z: 4.2, radius: 2.2 });
            chunkColliders.push({ id: `${key}_cabin_chimney`, label: '木屋烟囱', mesh: starterCabin, type: 'building', x: -2.0, z: -1.2, radius: 1.0 });
            placedObstacles.push({ x: 0, z: 0, radius: 16.0 });
        } else if (chunkBiome.type === 'lake') {
            // 湖泊景观：木制栈道码头与睡莲
            if (rnd() > 0.3) {
                const pier = buildLakePier(rnd);
                pier.position.set(centerX + (rnd() - 0.5) * 16, 0.2, centerZ + (rnd() - 0.5) * 16);
                chunkGroup.add(pier);
                chunkColliders.push({ id: `${key}_pier`, label: '湖畔木栈道', mesh: pier, type: 'building', x: pier.position.x, z: pier.position.z, radius: 2.4 });
            }
        } else if (chunkBiome.type === 'desert') {
            // 沙漠景观：巨大仙人掌、风蚀砂岩巨石与旱地灌木
            const cactusCount = Math.round((3 + Math.floor(rnd() * 4)) * vegMult);
            for (let c = 0; c < cactusCount; c++) {
                const tx = minX + 6 + rnd() * (CHUNK_SIZE - 12);
                const tz = minZ + 6 + rnd() * (CHUNK_SIZE - 12);
                const ty = getTerrainHeight(tx, tz);
                const cactus = buildProceduralCactus(rnd);
                cactus.position.set(tx, ty, tz);
                const sc = 0.8 + rnd() * 0.45;
                cactus.scale.set(sc, sc, sc);
                chunkGroup.add(cactus);
                chunkColliders.push({ id: `${key}_cactus_${c}`, label: '沙漠仙人掌', mesh: cactus, type: 'tree', x: tx, z: tz, radius: 0.9 * sc });
            }
            if (rnd() > 0.4) {
                const rx = minX + 10 + rnd() * (CHUNK_SIZE - 20);
                const rz = minZ + 10 + rnd() * (CHUNK_SIZE - 20);
                const ry = getTerrainHeight(rx, rz);
                const rock = buildDesertRock(rnd);
                rock.position.set(rx, ry, rz);
                chunkGroup.add(rock);
                chunkColliders.push({ id: `${key}_rock`, label: '砂岩巨石', mesh: rock, type: 'building', x: rx, z: rz, radius: 2.5 });
            }
        } else if (chunkBiome.type === 'snow_mountain') {
            // 雪山景观：积雪冷杉松树与雪岩巨石
            const pineCount = Math.round((4 + Math.floor(rnd() * 5)) * vegMult);
            for (let p = 0; p < pineCount; p++) {
                const tx = minX + 6 + rnd() * (CHUNK_SIZE - 12);
                const tz = minZ + 6 + rnd() * (CHUNK_SIZE - 12);
                const ty = getTerrainHeight(tx, tz);
                const pine = buildSnowPine(rnd);
                pine.position.set(tx, ty, tz);
                const sc = 0.8 + rnd() * 0.5;
                pine.scale.set(sc, sc, sc);
                chunkGroup.add(pine);
                chunkColliders.push({ id: `${key}_pine_${p}`, label: '积雪冷杉', mesh: pine, type: 'tree', x: tx, z: tz, radius: 0.8 * sc });
            }
            if (rnd() > 0.35) {
                const bx = minX + 10 + rnd() * (CHUNK_SIZE - 20);
                const bz = minZ + 10 + rnd() * (CHUNK_SIZE - 20);
                const by = getTerrainHeight(bx, bz);
                const boulder = buildSnowBoulder(rnd);
                boulder.position.set(bx, by, bz);
                chunkGroup.add(boulder);
                chunkColliders.push({ id: `${key}_boulder`, label: '雪山冰岩', mesh: boulder, type: 'building', x: bx, z: bz, radius: 2.2 });
            }
        } else {
            // 草原景观：经典村落建筑、绿树繁花海
            const buildingChance = rnd();
            if (buildingChance > 0.4) {
                const bType = Math.floor(rnd() * 4); // 0: Cottage, 1: Windmill, 2: Barn, 3: Gazebo
                const bRadius = (bType === 1) ? 3.0 : 4.4;
                let foundSpot = false;
                let bx = 0, bz = 0;

                for (let attempt = 0; attempt < 12; attempt++) {
                    const testX = minX + 10 + rnd() * (CHUNK_SIZE - 20);
                    const testZ = minZ + 10 + rnd() * (CHUNK_SIZE - 20);
                    if (Math.hypot(testX, testZ) < 18) continue;

                    let overlap = false;
                    for (let k = 0; k < placedObstacles.length; k++) {
                        const obs = placedObstacles[k];
                        if (Math.hypot(testX - obs.x, testZ - obs.z) < (obs.radius + bRadius + 2.5)) {
                            overlap = true;
                            break;
                        }
                    }
                    if (!overlap) {
                        bx = testX;
                        bz = testZ;
                        foundSpot = true;
                        break;
                    }
                }

                if (foundSpot) {
                    const by = getTerrainHeight(bx, bz);
                    const bRot = rnd() * Math.PI * 2;
                    const bScale = 0.85 + rnd() * 0.4;
                    let building;
                    let buildingLabel = '村落房屋';
                    if (customBuildingPool.length > 0 && rnd() > 0.35) {
                        const pooled = customBuildingPool[Math.floor(rnd() * customBuildingPool.length)];
                        building = safeCloneObject3D(pooled.mesh) || buildProceduralBuilding(bType, rnd);
                        buildingLabel = pooled.name || '自定义建筑';
                    } else {
                        building = buildProceduralBuilding(bType, rnd);
                    }
                    building.position.set(bx, by, bz);
                    building.rotation.y = bRot;
                    building.scale.set(bScale, bScale, bScale);
                    chunkGroup.add(building);

                    const bHalfW = (bType === 1 ? 2.6 : (bType === 2 ? 4.6 : 3.8)) * bScale;
                    const bHalfD = (bType === 1 ? 2.6 : (bType === 2 ? 3.9 : 3.5)) * bScale;
                    const bBoundRadius = Math.hypot(bHalfW, bHalfD) + 0.4;

                    placedObstacles.push({ x: bx, z: bz, radius: bBoundRadius });
                    chunkColliders.push({
                        id: `${key}_building`,
                        label: buildingLabel,
                        mesh: building,
                        type: 'building',
                        x: bx,
                        z: bz,
                        rot: bRot,
                        halfWidth: bHalfW,
                        halfDepth: bHalfD,
                        radius: bBoundRadius
                    });
                }
            }

            // 树木生成（受环境植被密度滑块控制）
            const treeCount = Math.round((5 + Math.floor(rnd() * 5)) * vegMult);
            for (let t = 0; t < treeCount; t++) {
                let foundTreeSpot = false;
                let tx = 0, tz = 0;
                const treeClearance = 2.4;

                for (let attempt = 0; attempt < 10; attempt++) {
                    const testX = minX + 4 + rnd() * (CHUNK_SIZE - 8);
                    const testZ = minZ + 4 + rnd() * (CHUNK_SIZE - 8);
                    if (Math.hypot(testX, testZ) < 15) continue;

                    let overlap = false;
                    for (let k = 0; k < placedObstacles.length; k++) {
                        const obs = placedObstacles[k];
                        if (Math.hypot(testX - obs.x, testZ - obs.z) < (obs.radius + treeClearance)) {
                            overlap = true;
                            break;
                        }
                    }
                    if (!overlap) {
                        tx = testX;
                        tz = testZ;
                        foundTreeSpot = true;
                        break;
                    }
                }

                if (foundTreeSpot) {
                    const ty = getTerrainHeight(tx, tz);
                    let tree;
                    let treeLabel = '草原大树';
                    if (customVegetationPool.length > 0 && rnd() > 0.35) {
                        const pooled = customVegetationPool[Math.floor(rnd() * customVegetationPool.length)];
                        tree = safeCloneObject3D(pooled.mesh) || buildProceduralTree(rnd);
                        treeLabel = pooled.name || '自定义植被';
                    } else {
                        tree = buildProceduralTree(rnd);
                    }
                    tree.position.set(tx, ty, tz);
                    const tScale = 0.75 + rnd() * 0.55;
                    tree.scale.set(tScale, tScale, tScale);
                    chunkGroup.add(tree);

                    placedObstacles.push({ x: tx, z: tz, radius: treeClearance });
                    chunkColliders.push({
                        id: `${key}_tree_${t}`,
                        label: treeLabel,
                        mesh: tree,
                        type: 'tree',
                        x: tx,
                        z: tz,
                        radius: 0.75 * tScale
                    });
                }
            }

            // 灌木与繁花（受环境植被密度滑块控制）
            const bushCount = Math.round((3 + Math.floor(rnd() * 4)) * vegMult);
            for (let b = 0; b < bushCount; b++) {
                const bx = minX + 4 + rnd() * (CHUNK_SIZE - 8);
                const bz = minZ + 4 + rnd() * (CHUNK_SIZE - 8);
                const by = getTerrainHeight(bx, bz);
                const bush = buildProceduralBush(rnd);
                bush.position.set(bx, by, bz);
                chunkGroup.add(bush);
            }

            const flowerCount = Math.round((14 + Math.floor(rnd() * 16)) * vegMult);
            for (let f = 0; f < flowerCount; f++) {
                const fx = minX + 3 + rnd() * (CHUNK_SIZE - 6);
                const fz = minZ + 3 + rnd() * (CHUNK_SIZE - 6);
                const fy = getTerrainHeight(fx, fz);
                const fColor = sharedMaterials.flowerColors[Math.floor(rnd() * sharedMaterials.flowerColors.length)];
                const flower = buildProceduralFlower(fColor, sharedMaterials.flowerStemMat);
                flower.position.set(fx, fy, fz);
                chunkGroup.add(flower);
            }
        }

        // Apply 2D Toon Outlines if in 2D mode
        if (currentRenderStyle === '2d') {
            chunkGroup.traverse(child => {
                if (child.isMesh && child !== terrainMesh && child !== chunkWater) {
                    attachToonOutline(child, 1.08);
                }
            });
        }

        scene.add(chunkGroup);
        activeChunks.set(key, { cx, cz, group: chunkGroup, waterMesh: chunkWater });
        worldColliders.set(key, chunkColliders);
        chunkColliders.forEach(c => {
            if (c.id && c.mesh) {
                collidableRegistry.set(c.id, { id: c.id, name: c.label || '3D 物体', mesh: c.mesh });
            }
        });
    }

    function disposeChunk(key) {
        const chunk = activeChunks.get(key);
        if (!chunk) return;

        if (chunk.waterMesh) {
            activeWaterMeshes = activeWaterMeshes.filter(w => w !== chunk.waterMesh);
        }

        const oldColliders = worldColliders.get(key);
        if (oldColliders) {
            oldColliders.forEach(c => {
                if (c.id) {
                    collidableRegistry.delete(c.id);
                    activeCollidingIds.delete(c.id);
                }
            });
        }

        scene.remove(chunk.group);
        chunk.group.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                        if (m && !(m.userData && m.userData.isShared)) m.dispose();
                    });
                } else if (child.material && !(child.material.userData && child.material.userData.isShared)) {
                    child.material.dispose();
                }
            }
            if (child.userData && child.userData.outlineMesh) {
                scene.remove(child.userData.outlineMesh);
                toonOutlines = toonOutlines.filter(o => o !== child.userData.outlineMesh);
            }
        });
        activeChunks.delete(key);
        worldColliders.delete(key);
    }

    function rebuildActiveChunks() {
        if (!scene) return;
        for (const key of Array.from(activeChunks.keys())) {
            disposeChunk(key);
        }
        lastPlayerChunkX = 999999;
        lastPlayerChunkZ = 999999;
        updateProceduralWorld(charPos.x, charPos.z, true);
    }

    window.setCustomEnvironmentTexture = function (envKey, imageDataUrl) {
        if (!envKey || !imageDataUrl) return;
        const img = new Image();
        img.onload = () => {
            try {
                const tex = new THREE.Texture(img);
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.LinearFilter;
                tex.generateMipmaps = false;
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.encoding = THREE.sRGBEncoding;
                tex.needsUpdate = true;

                if (customEnvTextures[envKey]) {
                    try { customEnvTextures[envKey].dispose(); } catch (_) {}
                }
                customEnvTextures[envKey] = tex;

                if (envKey === 'grass') {
                    sharedMaterials.terrainGrassMat.map = tex;
                    sharedMaterials.terrainGrassMat.vertexColors = false;
                    sharedMaterials.terrainGrassMat.color.setHex(0xffffff);
                    sharedMaterials.terrainGrassMat.needsUpdate = true;
                } else if (envKey === 'desert') {
                    sharedMaterials.terrainDesertMat.map = tex;
                    sharedMaterials.terrainDesertMat.vertexColors = false;
                    sharedMaterials.terrainDesertMat.color.setHex(0xffffff);
                    sharedMaterials.terrainDesertMat.needsUpdate = true;
                } else if (envKey === 'water') {
                    sharedMaterials.waterMat.map = tex;
                    sharedMaterials.waterMat.color.setHex(0xffffff);
                    sharedMaterials.waterMat.needsUpdate = true;
                }

                const labelMap = { desert: '沙漠', grass: '草地', water: '水' };
                const hint = document.getElementById('hint-banner');
                if (hint) {
                    hint.textContent = `🌍 已更新${labelMap[envKey] || envKey}环境贴图！`;
                    hint.classList.add('show');
                    setTimeout(() => hint.classList.remove('show'), 2400);
                }
            } catch (err) {
                console.warn('setCustomEnvironmentTexture error:', err);
            }
        };
        img.src = imageDataUrl;
    };

    window.clearCustomEnvironmentTexture = function (envKey) {
        if (!envKey) return;
        if (customEnvTextures[envKey]) {
            try { customEnvTextures[envKey].dispose(); } catch (_) {}
            customEnvTextures[envKey] = null;
        }
        if (envKey === 'grass') {
            sharedMaterials.terrainGrassMat.map = null;
            sharedMaterials.terrainGrassMat.vertexColors = true;
            sharedMaterials.terrainGrassMat.color.setHex(0xffffff);
            sharedMaterials.terrainGrassMat.needsUpdate = true;
        } else if (envKey === 'desert') {
            sharedMaterials.terrainDesertMat.map = null;
            sharedMaterials.terrainDesertMat.vertexColors = true;
            sharedMaterials.terrainDesertMat.color.setHex(0xffffff);
            sharedMaterials.terrainDesertMat.needsUpdate = true;
        } else if (envKey === 'water') {
            sharedMaterials.waterMat.map = null;
            sharedMaterials.waterMat.color.setHex(0x0288d1);
            sharedMaterials.waterMat.needsUpdate = true;
        }
    };

    window.setVegetationDensity = function (density) {
        const clamped = Math.max(0, Math.min(2, Number(density)));
        if (!isFinite(clamped)) return;
        vegetationDensity = clamped;
        rebuildActiveChunks();
        if (window.AndroidBridge && typeof window.AndroidBridge.onVegetationDensityChanged === 'function') {
            try { window.AndroidBridge.onVegetationDensityChanged(vegetationDensity); } catch (e) {}
        }
    };

    // ========================================================================
    // BIOME-SPECIFIC VEGETATION & LANDMARK BUILDERS (沙漠仙人掌、雪山冷杉、湖泊栈道)
    // ========================================================================
    function tagMeshPart(mesh, partType, partLabel) {
        if (!mesh) return mesh;
        if (!mesh.userData) mesh.userData = {};
        mesh.userData.partType = partType;
        mesh.userData.partLabel = partLabel;
        return mesh;
    }

    function buildProceduralCactus(rnd) {
        const cactusGroup = new THREE.Group();
        const height = 2.8 + rnd() * 1.4;
        const mainTrunkGeo = new THREE.CylinderGeometry(0.25, 0.28, height, 8);
        const mainTrunk = new THREE.Mesh(mainTrunkGeo, sharedMaterials.cactusMat);
        mainTrunk.position.y = height / 2;
        mainTrunk.castShadow = true;
        tagMeshPart(mainTrunk, 'trunk', '树干');
        cactusGroup.add(mainTrunk);

        // 两侧上扬弯曲分枝
        [-1, 1].forEach((dir, idx) => {
            if (rnd() > 0.25) {
                const armY = height * (0.45 + idx * 0.18);
                const armLen = 0.9 + rnd() * 0.4;
                const hGeo = new THREE.CylinderGeometry(0.18, 0.18, armLen, 6);
                hGeo.rotateZ(Math.PI / 2);
                const hMesh = new THREE.Mesh(hGeo, sharedMaterials.cactusMat);
                hMesh.position.set(dir * armLen * 0.5, armY, 0);
                tagMeshPart(hMesh, 'leaves', '树叶');
                cactusGroup.add(hMesh);

                const vGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.1, 6);
                const vMesh = new THREE.Mesh(vGeo, sharedMaterials.cactusMat);
                vMesh.position.set(dir * armLen, armY + 0.55, 0);
                tagMeshPart(vMesh, 'leaves', '树叶');
                cactusGroup.add(vMesh);
            }
        });
        return cactusGroup;
    }

    function buildDesertRock(rnd) {
        const rockGroup = new THREE.Group();
        const r = 1.6 + rnd() * 1.2;
        const geo = new THREE.DodecahedronGeometry(r, 1);
        const mesh = new THREE.Mesh(geo, sharedMaterials.sandstoneMat);
        mesh.position.y = r * 0.65;
        mesh.scale.set(1.2, 0.8, 1.0);
        mesh.castShadow = true;
        tagMeshPart(mesh, 'wall', '外墙');
        rockGroup.add(mesh);
        return rockGroup;
    }

    function buildSnowPine(rnd) {
        const pineGroup = new THREE.Group();
        const trunkH = 1.4 + rnd() * 0.4;
        const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, trunkH, 6);
        const trunk = new THREE.Mesh(trunkGeo, sharedMaterials.woodTrunk);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        tagMeshPart(trunk, 'trunk', '树干');
        pineGroup.add(trunk);

        const tiers = 3 + Math.floor(rnd() * 2);
        for (let i = 0; i < tiers; i++) {
            const tierR = (2.1 - i * 0.42) * (0.8 + rnd() * 0.3);
            const tierH = 1.3 + rnd() * 0.3;
            // 绿底冷杉
            const coneGeo = new THREE.ConeGeometry(tierR, tierH, 6);
            const cone = new THREE.Mesh(coneGeo, new THREE.MeshLambertMaterial({ color: 0x1b4d3e }));
            cone.position.y = trunkH + i * 0.95;
            cone.castShadow = true;
            tagMeshPart(cone, 'leaves', '树叶');
            pineGroup.add(cone);

            // 皑皑积雪盖顶
            const snowGeo = new THREE.ConeGeometry(tierR * 0.92, tierH * 0.45, 6);
            const snow = new THREE.Mesh(snowGeo, sharedMaterials.snowWhiteMat);
            snow.position.y = trunkH + i * 0.95 + tierH * 0.28;
            snow.castShadow = true;
            tagMeshPart(snow, 'leaves', '树叶');
            pineGroup.add(snow);
        }
        return pineGroup;
    }

    function buildSnowBoulder(rnd) {
        const boulderGroup = new THREE.Group();
        const r = 1.5 + rnd() * 1.0;
        const geo = new THREE.DodecahedronGeometry(r, 1);
        const mesh = new THREE.Mesh(geo, sharedMaterials.snowRockMat);
        mesh.position.y = r * 0.7;
        mesh.castShadow = true;
        tagMeshPart(mesh, 'wall', '外墙');
        boulderGroup.add(mesh);

        const snowGeo = new THREE.ConeGeometry(r * 0.95, 0.6, 6);
        const snow = new THREE.Mesh(snowGeo, sharedMaterials.snowWhiteMat);
        snow.position.y = r * 1.25;
        tagMeshPart(snow, 'roof', '屋顶');
        boulderGroup.add(snow);
        return boulderGroup;
    }

    function buildLakePier(rnd) {
        const pierGroup = new THREE.Group();
        const deckMat = new THREE.MeshLambertMaterial({ color: 0x8d5b32 });
        const postMat = new THREE.MeshLambertMaterial({ color: 0x54361c });

        const deckGeo = new THREE.BoxGeometry(2.4, 0.2, 5.5);
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.set(0, 0.2, 0);
        deck.castShadow = true;
        tagMeshPart(deck, 'wall', '外墙');
        pierGroup.add(deck);

        [-1.0, 1.0].forEach(px => {
            [-2.2, 0, 2.2].forEach(pz => {
                const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6);
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(px, -0.4, pz);
                tagMeshPart(post, 'wall', '外墙');
                pierGroup.add(post);
            });
        });
        return pierGroup;
    }

    // ========================================================================
    // 3. ANIMATED PROCEDURAL FAUNA SYSTEM (丰富随机动物：鸟、羊、鸡、猫、蛇)
    // 漫步草地、翔空飞鸟、沙丘灵蛇、庭院萌宠，生机盎然
    // ========================================================================
    function createBirdModel() {
        const group = new THREE.Group();
        const featherMat = new THREE.MeshLambertMaterial({ color: 0x1976d2 });
        const beakMat = new THREE.MeshLambertMaterial({ color: 0xffa000 });

        const bodyGeo = new THREE.ConeGeometry(0.2, 0.7, 5);
        bodyGeo.rotateX(Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, featherMat);
        group.add(body);

        const beakGeo = new THREE.ConeGeometry(0.08, 0.22, 4);
        beakGeo.rotateX(-Math.PI / 2);
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(0, 0, 0.42);
        group.add(beak);

        const wingGeo = new THREE.BoxGeometry(0.65, 0.04, 0.32);
        const leftWing = new THREE.Group();
        const lMesh = new THREE.Mesh(wingGeo, featherMat);
        lMesh.position.x = -0.32;
        leftWing.add(lMesh);
        leftWing.position.set(-0.12, 0.05, 0.05);
        group.add(leftWing);

        const rightWing = new THREE.Group();
        const rMesh = new THREE.Mesh(wingGeo, featherMat);
        rMesh.position.x = 0.32;
        rightWing.add(rMesh);
        rightWing.position.set(0.12, 0.05, 0.05);
        group.add(rightWing);

        group.userData = { type: 'bird', leftWing, rightWing };
        group.scale.set(0.9, 0.9, 0.9);
        return group;
    }

    function createSheepModel() {
        const group = new THREE.Group();
        const woolMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });

        // 蓬松白云羊身
        const bodyGeo = new THREE.BoxGeometry(1.2, 0.85, 0.8);
        const body = new THREE.Mesh(bodyGeo, woolMat);
        body.position.y = 0.65;
        body.castShadow = true;
        group.add(body);

        // 羊头与耳朵
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.95, 0.55);

        const headGeo = new THREE.BoxGeometry(0.38, 0.45, 0.45);
        const head = new THREE.Mesh(headGeo, skinMat);
        headGroup.add(head);

        [-0.24, 0.24].forEach(ex => {
            const earGeo = new THREE.BoxGeometry(0.18, 0.08, 0.08);
            const ear = new THREE.Mesh(earGeo, skinMat);
            ear.position.set(ex, 0.1, -0.05);
            headGroup.add(ear);
        });
        group.add(headGroup);

        // 4 条交替行进羊腿
        const legs = [];
        [-0.32, 0.32].forEach(lx => {
            [-0.3, 0.3].forEach(lz => {
                const legGroup = new THREE.Group();
                legGroup.position.set(lx, 0.38, lz);
                const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.42, 6);
                const leg = new THREE.Mesh(legGeo, skinMat);
                leg.position.y = -0.21;
                leg.castShadow = true;
                legGroup.add(leg);
                group.add(legGroup);
                legs.push(legGroup);
            });
        });

        group.userData = { type: 'sheep', headGroup, legs };
        group.scale.set(0.85, 0.85, 0.85);
        return group;
    }

    function createChickenModel() {
        const group = new THREE.Group();
        const featMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const combMat = new THREE.MeshLambertMaterial({ color: 0xe53935 });
        const beakMat = new THREE.MeshLambertMaterial({ color: 0xfbc02d });

        const bodyGeo = new THREE.ConeGeometry(0.24, 0.48, 6);
        bodyGeo.rotateX(Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, featMat);
        body.position.y = 0.35;
        body.castShadow = true;
        group.add(body);

        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.52, 0.2);

        const headGeo = new THREE.DodecahedronGeometry(0.14);
        const head = new THREE.Mesh(headGeo, featMat);
        headGroup.add(head);

        const combGeo = new THREE.BoxGeometry(0.05, 0.12, 0.14);
        const comb = new THREE.Mesh(combGeo, combMat);
        comb.position.y = 0.12;
        headGroup.add(comb);

        const beakGeo = new THREE.ConeGeometry(0.05, 0.12, 4);
        beakGeo.rotateX(-Math.PI / 2);
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(0, -0.02, 0.14);
        headGroup.add(beak);
        group.add(headGroup);

        const wings = [];
        [-0.18, 0.18].forEach(wx => {
            const wGeo = new THREE.BoxGeometry(0.05, 0.2, 0.24);
            const w = new THREE.Mesh(wGeo, featMat);
            w.position.set(wx, 0.38, 0);
            group.add(w);
            wings.push(w);
        });

        group.userData = { type: 'chicken', headGroup, wings };
        group.scale.set(0.85, 0.85, 0.85);
        return group;
    }

    function createCatModel() {
        const group = new THREE.Group();
        const furMat = new THREE.MeshLambertMaterial({ color: 0xf57c00 });
        const earMat = new THREE.MeshLambertMaterial({ color: 0xffab40 });

        const bodyGeo = new THREE.BoxGeometry(0.42, 0.34, 0.75);
        const body = new THREE.Mesh(bodyGeo, furMat);
        body.position.y = 0.35;
        body.castShadow = true;
        group.add(body);

        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.52, 0.42);

        const headGeo = new THREE.DodecahedronGeometry(0.2);
        const head = new THREE.Mesh(headGeo, furMat);
        headGroup.add(head);

        [-0.12, 0.12].forEach(ex => {
            const earGeo = new THREE.ConeGeometry(0.08, 0.14, 4);
            const ear = new THREE.Mesh(earGeo, earMat);
            ear.position.set(ex, 0.18, 0);
            headGroup.add(ear);
        });
        group.add(headGroup);

        // 柔韧尾巴
        const tailGroup = new THREE.Group();
        tailGroup.position.set(0, 0.42, -0.38);
        const tailGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6);
        tailGeo.rotateX(-Math.PI / 4);
        const tail = new THREE.Mesh(tailGeo, furMat);
        tail.position.set(0, 0.18, -0.18);
        tailGroup.add(tail);
        group.add(tailGroup);

        // 4 只猫爪腿
        const legs = [];
        [-0.15, 0.15].forEach(lx => {
            [-0.24, 0.24].forEach(lz => {
                const legGroup = new THREE.Group();
                legGroup.position.set(lx, 0.22, lz);
                const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.24, 6);
                const leg = new THREE.Mesh(legGeo, furMat);
                leg.position.y = -0.12;
                leg.castShadow = true;
                legGroup.add(leg);
                group.add(legGroup);
                legs.push(legGroup);
            });
        });

        group.userData = { type: 'cat', headGroup, tailGroup, legs };
        group.scale.set(0.8, 0.8, 0.8);
        return group;
    }

    function createSnakeModel() {
        const group = new THREE.Group();
        const snakeMat = new THREE.MeshLambertMaterial({ color: 0x827717 });
        const bellyMat = new THREE.MeshLambertMaterial({ color: 0xdce775 });
        const tongueMat = new THREE.MeshBasicMaterial({ color: 0xe53935 });

        const segments = [];
        const segCount = 7;
        for (let i = 0; i < segCount; i++) {
            const segRadius = (i === 0) ? 0.14 : (0.13 - i * 0.014);
            const segGroup = new THREE.Group();
            segGroup.position.z = -i * 0.28;

            const segGeo = new THREE.SphereGeometry(segRadius, 8, 6);
            segGeo.scale(1.0, 0.85, 1.3);
            const segMesh = new THREE.Mesh(segGeo, (i % 2 === 0) ? snakeMat : bellyMat);
            segMesh.position.y = 0.1;
            segMesh.castShadow = true;
            segGroup.add(segMesh);

            // 蛇头吐信子
            if (i === 0) {
                const tongueGeo = new THREE.BoxGeometry(0.04, 0.01, 0.25);
                const tongue = new THREE.Mesh(tongueGeo, tongueMat);
                tongue.position.set(0, 0.08, 0.25);
                segGroup.add(tongue);
            }

            group.add(segGroup);
            segments.push(segGroup);
        }

        group.userData = { type: 'snake', segments };
        return group;
    }

    function initFauna() {
        faunaAnimals.forEach(a => scene.remove(a.mesh));
        faunaAnimals = [];

        // 1. 翔空飞鸟 (5 只)
        for (let i = 0; i < 5; i++) {
            const bird = createBirdModel();
            const angle = (i / 5) * Math.PI * 2;
            const radius = 35 + i * 8;
            bird.position.set(Math.sin(angle) * radius, 14 + (i % 3) * 3, Math.cos(angle) * radius);
            scene.add(bird);
            faunaAnimals.push({
                mesh: bird,
                type: 'bird',
                radius: radius,
                orbitSpeed: 0.25 + i * 0.06,
                angle: angle,
                baseY: 14 + (i % 3) * 3
            });
        }

        // 2. 草原绵羊 (4 只)
        for (let i = 0; i < 4; i++) {
            const sheep = createSheepModel();
            const sx = 8 + (i - 2) * 9 + Math.random() * 4;
            const sz = 12 + (i % 2) * 10 + Math.random() * 4;
            const sy = getTerrainHeight(sx, sz);
            sheep.position.set(sx, sy, sz);
            scene.add(sheep);
            faunaAnimals.push({
                mesh: sheep,
                type: 'sheep',
                homeX: sx,
                homeZ: sz,
                walkTimer: i * 1.5,
                isGrazing: false
            });
        }

        // 3. 庭院小鸡 (5 只)
        for (let i = 0; i < 5; i++) {
            const chicken = createChickenModel();
            const cx = -3 + (i - 2) * 3.5;
            const cz = 5 + (i % 3) * 3.2;
            const cy = getTerrainHeight(cx, cz);
            chicken.position.set(cx, cy, cz);
            scene.add(chicken);
            faunaAnimals.push({
                mesh: chicken,
                type: 'chicken',
                homeX: cx,
                homeZ: cz,
                peckTimer: i * 0.8
            });
        }

        // 4. 悠闲萌猫 (3 只)
        for (let i = 0; i < 3; i++) {
            const cat = createCatModel();
            const kx = (i === 0) ? 5.2 : (i === 1 ? -4.5 : 2.5);
            const kz = (i === 0) ? 3.8 : (i === 1 ? -3.5 : 9.5);
            const ky = getTerrainHeight(kx, kz);
            cat.position.set(kx, ky, kz);
            scene.add(cat);
            faunaAnimals.push({
                mesh: cat,
                type: 'cat',
                homeX: kx,
                homeZ: kz,
                sitTimer: i * 2.2
            });
        }

        // 5. 沙漠灵蛇 (3 只)
        for (let i = 0; i < 3; i++) {
            const snake = createSnakeModel();
            const sx = 65 + i * 12;
            const sz = 65 - i * 10;
            const sy = getTerrainHeight(sx, sz);
            snake.position.set(sx, sy, sz);
            scene.add(snake);
            faunaAnimals.push({
                mesh: snake,
                type: 'snake',
                homeX: sx,
                homeZ: sz,
                speed: 1.8 + i * 0.4
            });
        }
    }

    function updateFauna(delta, time) {
        faunaAnimals.forEach(a => {
            if (a.type === 'bird') {
                a.angle += a.orbitSpeed * delta;
                a.mesh.position.x = Math.sin(a.angle) * a.radius;
                a.mesh.position.z = Math.cos(a.angle) * a.radius;
                a.mesh.position.y = a.baseY + Math.sin(time * 1.5 + a.angle) * 1.8;
                a.mesh.rotation.y = a.angle + Math.PI / 2;
                a.mesh.rotation.z = -0.18; // 盘旋倾角

                // 扇动翅膀
                const flap = Math.sin(time * 18) * 0.6;
                a.mesh.userData.leftWing.rotation.z = flap;
                a.mesh.userData.rightWing.rotation.z = -flap;

            } else if (a.type === 'sheep') {
                a.walkTimer += delta;
                if (Math.sin(a.walkTimer * 0.4) > 0.3) {
                    // 低头啃食青草
                    a.mesh.userData.headGroup.rotation.x = 0.55 + Math.sin(time * 4) * 0.12;
                    a.mesh.userData.legs.forEach(l => l.rotation.x = 0);
                } else {
                    // 漫步草地
                    a.mesh.userData.headGroup.rotation.x = 0.1;
                    const trot = Math.sin(time * 6) * 0.35;
                    a.mesh.userData.legs[0].rotation.x = trot;
                    a.mesh.userData.legs[1].rotation.x = -trot;
                    a.mesh.userData.legs[2].rotation.x = -trot;
                    a.mesh.userData.legs[3].rotation.x = trot;
                    a.mesh.position.x = a.homeX + Math.sin(a.walkTimer * 0.3) * 2.5;
                    a.mesh.position.z = a.homeZ + Math.cos(a.walkTimer * 0.3) * 2.5;
                    a.mesh.rotation.y = a.walkTimer * 0.3 + Math.PI / 2;
                    a.mesh.position.y = getTerrainHeight(a.mesh.position.x, a.mesh.position.z);
                }

            } else if (a.type === 'chicken') {
                a.peckTimer += delta;
                if (Math.sin(a.peckTimer * 2) > 0.4) {
                    // 啄地觅食
                    a.mesh.userData.headGroup.rotation.x = 0.8 + Math.sin(time * 14) * 0.3;
                } else {
                    a.mesh.userData.headGroup.rotation.x = Math.sin(time * 6) * 0.15;
                    a.mesh.position.x = a.homeX + Math.sin(a.peckTimer * 0.5) * 1.5;
                    a.mesh.position.z = a.homeZ + Math.cos(a.peckTimer * 0.5) * 1.5;
                    a.mesh.position.y = getTerrainHeight(a.mesh.position.x, a.mesh.position.z);
                    a.mesh.rotation.y = a.peckTimer * 0.5;
                }

            } else if (a.type === 'cat') {
                a.sitTimer += delta;
                // 轻轻摇摆灵巧猫尾
                a.mesh.userData.tailGroup.rotation.z = Math.sin(time * 3.5) * 0.45;
                a.mesh.position.y = getTerrainHeight(a.mesh.position.x, a.mesh.position.z);

            } else if (a.type === 'snake') {
                // S型正弦蛇行波动
                const sTime = time * 3.5;
                a.mesh.position.x = a.homeX + Math.sin(sTime * 0.3) * 8.0;
                a.mesh.position.z = a.homeZ + Math.cos(sTime * 0.3) * 8.0;
                a.mesh.rotation.y = sTime * 0.3 + Math.PI / 2;
                a.mesh.position.y = getTerrainHeight(a.mesh.position.x, a.mesh.position.z);

                const segs = a.mesh.userData.segments;
                for (let i = 0; i < segs.length; i++) {
                    segs[i].position.x = Math.sin(sTime * 2.2 - i * 0.7) * 0.28;
                }
            }
        });
    }

    // --- Procedural Building Generator ---
    function buildProceduralBuilding(type, rnd) {
        const building = new THREE.Group();
        const wallPalette = [0xf4d0a8, 0xb8e2c8, 0xf9e7b2, 0xb2d8d8, 0xd38b6d, 0x8d6e63, 0xffcc80, 0xe0e0e0];
        const roofPalette = [0xc0392b, 0x2d6a4f, 0x2c3e50, 0xd35400, 0x795548, 0xe67e22, 0x16a085];

        const wallColor = wallPalette[Math.floor(rnd() * wallPalette.length)];
        const roofColor = roofPalette[Math.floor(rnd() * roofPalette.length)];
        const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
        const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
        const trimMat = new THREE.MeshLambertMaterial({ color: 0x4e342e });
        const glassMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });

        if (type === 0) {
            // Cottage / Villa
            const w = 5.0 + rnd() * 2.5;
            const h = 3.2 + rnd() * 1.5;
            const d = 4.5 + rnd() * 2.0;

            const bodyGeo = new THREE.BoxGeometry(w, h, d);
            const body = new THREE.Mesh(bodyGeo, wallMat);
            body.position.y = h / 2;
            body.castShadow = true;
            body.receiveShadow = true;
            tagMeshPart(body, 'wall', '外墙');
            building.add(body);

            const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.4, 4);
            roofGeo.rotateY(Math.PI / 4);
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = h + 1.1;
            roof.scale.set(w / Math.max(w, d) * 1.25, 1, d / Math.max(w, d) * 1.25);
            roof.castShadow = true;
            tagMeshPart(roof, 'roof', '屋顶');
            building.add(roof);

            const chimGeo = new THREE.BoxGeometry(0.7, 2.2, 0.7);
            const chim = new THREE.Mesh(chimGeo, sharedMaterials.stoneWall);
            chim.position.set(w * 0.3, h + 1.2, -d * 0.2);
            chim.castShadow = true;
            tagMeshPart(chim, 'wall', '外墙');
            building.add(chim);

            const doorGeo = new THREE.BoxGeometry(1.0, 1.8, 0.12);
            const door = new THREE.Mesh(doorGeo, trimMat);
            door.position.set(0, 0.9, d / 2 + 0.06);
            tagMeshPart(door, 'door', '门');
            building.add(door);

            [-w * 0.3, w * 0.3].forEach(wx => {
                const winGeo = new THREE.BoxGeometry(0.9, 0.9, 0.12);
                const win = new THREE.Mesh(winGeo, glassMat);
                win.position.set(wx, h * 0.55, d / 2 + 0.06);
                tagMeshPart(win, 'window', '窗子');
                building.add(win);
            });
        } else if (type === 1) {
            // Windmill / Tower
            const radius = 2.2 + rnd() * 0.8;
            const height = 7.5 + rnd() * 3.0;

            const towerGeo = new THREE.CylinderGeometry(radius * 0.75, radius, height, 10);
            const tower = new THREE.Mesh(towerGeo, wallMat);
            tower.position.y = height / 2;
            tower.castShadow = true;
            tower.receiveShadow = true;
            tagMeshPart(tower, 'wall', '外墙');
            building.add(tower);

            const roofGeo = new THREE.ConeGeometry(radius * 0.95, 2.8, 10);
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = height + 1.4;
            roof.castShadow = true;
            tagMeshPart(roof, 'roof', '屋顶');
            building.add(roof);

            const tDoor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.18), trimMat);
            tDoor.position.set(0, 0.9, radius * 0.92);
            tagMeshPart(tDoor, 'door', '门');
            building.add(tDoor);

            const tWin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.18), glassMat);
            tWin.position.set(0, height * 0.52, radius * 0.84);
            tagMeshPart(tWin, 'window', '窗子');
            building.add(tWin);

            for (let i = 0; i < 4; i++) {
                const bladeGeo = new THREE.BoxGeometry(0.45, 4.2, 0.08);
                const blade = new THREE.Mesh(bladeGeo, trimMat);
                blade.rotation.z = (Math.PI / 2) * i + Math.PI / 4;
                blade.position.set(
                    Math.cos((Math.PI / 2) * i + Math.PI / 4) * 2.1,
                    height - 1.2 + Math.sin((Math.PI / 2) * i + Math.PI / 4) * 2.1,
                    radius * 0.8 + 0.35
                );
                blade.castShadow = true;
                tagMeshPart(blade, 'wall', '外墙');
                building.add(blade);
            }
        } else if (type === 2) {
            // Country Barn
            const w = 6.0 + rnd() * 2.0;
            const h = 4.0;
            const d = 5.0 + rnd() * 2.0;

            const bodyGeo = new THREE.BoxGeometry(w, h, d);
            const body = new THREE.Mesh(bodyGeo, wallMat);
            body.position.y = h / 2;
            body.castShadow = true;
            tagMeshPart(body, 'wall', '外墙');
            building.add(body);

            const roofGeo = new THREE.CylinderGeometry(w * 0.55, w * 0.55, d + 0.6, 6);
            roofGeo.rotateZ(Math.PI / 2);
            roofGeo.rotateY(Math.PI / 2);
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = h + 1.2;
            roof.castShadow = true;
            tagMeshPart(roof, 'roof', '屋顶');
            building.add(roof);

            const bDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.14), trimMat);
            bDoor.position.set(0, 1.1, d / 2 + 0.07);
            tagMeshPart(bDoor, 'door', '门');
            building.add(bDoor);

            [-w * 0.3, w * 0.3].forEach(wx => {
                const bWin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 0.14), glassMat);
                bWin.position.set(wx, h * 0.6, d / 2 + 0.07);
                tagMeshPart(bWin, 'window', '窗子');
                building.add(bWin);
            });
        } else {
            // Gazebo / Pavilion
            const rad = 2.4 + rnd() * 0.8;
            const pillarH = 3.0;

            const deckGeo = new THREE.CylinderGeometry(rad, rad, 0.3, 8);
            const deck = new THREE.Mesh(deckGeo, trimMat);
            deck.position.y = 0.15;
            tagMeshPart(deck, 'wall', '外墙');
            building.add(deck);

            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i;
                const px = Math.cos(angle) * (rad - 0.35);
                const pz = Math.sin(angle) * (rad - 0.35);
                const pGeo = new THREE.CylinderGeometry(0.1, 0.1, pillarH, 6);
                const p = new THREE.Mesh(pGeo, trimMat);
                p.position.set(px, pillarH / 2 + 0.3, pz);
                p.castShadow = true;
                tagMeshPart(p, 'wall', '外墙');
                building.add(p);
            }

            const canopyGeo = new THREE.ConeGeometry(rad * 1.2, 1.8, 8);
            const canopy = new THREE.Mesh(canopyGeo, roofMat);
            canopy.position.y = pillarH + 1.2;
            canopy.castShadow = true;
            tagMeshPart(canopy, 'roof', '屋顶');
            building.add(canopy);
        }

        return building;
    }

    // --- Procedural Tree Generator ---
    function buildProceduralTree(rnd) {
        const treeGroup = new THREE.Group();
        const isPine = rnd() > 0.45;

        const trunkH = 2.4 + rnd() * 1.4;
        const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, trunkH, 6);
        const trunk = new THREE.Mesh(trunkGeo, sharedMaterials.woodTrunk);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        tagMeshPart(trunk, 'trunk', '树干');
        treeGroup.add(trunk);

        const leafPalette = [0x2e7d32, 0x388e3c, 0x43a047, 0x558b2f, 0x689f38, 0x2d6a4f, 0xe67e22, 0xf39c12];
        const leafColor = leafPalette[Math.floor(rnd() * leafPalette.length)];
        const leavesMat = new THREE.MeshLambertMaterial({ color: leafColor });

        if (isPine) {
            const tiers = 3 + Math.floor(rnd() * 2);
            for (let i = 0; i < tiers; i++) {
                const tierR = (1.9 - i * 0.38) * (0.8 + rnd() * 0.4);
                const tierH = 1.4 + rnd() * 0.4;
                const coneGeo = new THREE.ConeGeometry(tierR, tierH, 6);
                const cone = new THREE.Mesh(coneGeo, leavesMat);
                cone.position.y = trunkH + i * 0.95;
                cone.castShadow = true;
                tagMeshPart(cone, 'leaves', '树叶');
                treeGroup.add(cone);
            }
        } else {
            const puffCount = 3 + Math.floor(rnd() * 3);
            for (let i = 0; i < puffCount; i++) {
                const r = 1.2 + rnd() * 0.9;
                const puffGeo = new THREE.DodecahedronGeometry(r, 1);
                const puff = new THREE.Mesh(puffGeo, leavesMat);
                puff.position.set(
                    (rnd() - 0.5) * 1.2,
                    trunkH + 0.8 + (rnd() - 0.5) * 0.8,
                    (rnd() - 0.5) * 1.2
                );
                puff.castShadow = true;
                tagMeshPart(puff, 'leaves', '树叶');
                treeGroup.add(puff);
            }
        }

        return treeGroup;
    }

    // --- Procedural Bush Generator ---
    function buildProceduralBush(rnd) {
        const bushGroup = new THREE.Group();
        const colors = [0x43a047, 0x4caf50, 0x66bb6a, 0x7cb342];
        const mat = new THREE.MeshLambertMaterial({ color: colors[Math.floor(rnd() * colors.length)] });
        const count = 2 + Math.floor(rnd() * 3);
        for (let i = 0; i < count; i++) {
            const r = 0.35 + rnd() * 0.35;
            const geo = new THREE.DodecahedronGeometry(r);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((rnd() - 0.5) * 0.8, r * 0.7, (rnd() - 0.5) * 0.8);
            mesh.castShadow = true;
            tagMeshPart(mesh, 'leaves', '树叶');
            bushGroup.add(mesh);
        }
        return bushGroup;
    }

    // --- Procedural Flower Generator ---
    function buildProceduralFlower(color, stemMat) {
        const flower = new THREE.Group();
        const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.175;
        flower.add(stem);

        const petalMat = new THREE.MeshLambertMaterial({ color: color });
        const petalGeo = new THREE.DodecahedronGeometry(0.12);
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.y = 0.35;
        flower.add(petal);
        return flower;
    }

    // --- Summer Cabin for Home Chunk (0, 0) ---
    function createCabinInGroup(parentGroup) {
        const cabinGroup = new THREE.Group();
        cabinGroup.position.set(-6, 0, -8);

        const woodMat = new THREE.MeshLambertMaterial({ color: 0x9b6b43 });
        const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x6e4324 });
        const roofMat = new THREE.MeshLambertMaterial({ color: 0xb55a30 });
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x8a8a8a });
        const glassMat = new THREE.MeshBasicMaterial({ color: 0xffe28a });

        // Body
        const bodyGeo = new THREE.BoxGeometry(6.5, 4.2, 5.5);
        const body = new THREE.Mesh(bodyGeo, woodMat);
        body.position.y = 2.1;
        body.castShadow = true;
        body.receiveShadow = true;
        tagMeshPart(body, 'wall', '外墙');
        cabinGroup.add(body);
        attachToonOutline(body, 1.04);

        // Roof
        const roofGeo = new THREE.ConeGeometry(5.2, 2.6, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 5.2;
        roof.scale.set(1.15, 1, 0.95);
        roof.castShadow = true;
        tagMeshPart(roof, 'roof', '屋顶');
        cabinGroup.add(roof);
        attachToonOutline(roof, 1.05);

        // Porch Deck
        const deckGeo = new THREE.BoxGeometry(6.5, 0.4, 3.2);
        const deck = new THREE.Mesh(deckGeo, darkWoodMat);
        deck.position.set(0, 0.2, 3.8);
        deck.receiveShadow = true;
        tagMeshPart(deck, 'wall', '外墙');
        cabinGroup.add(deck);
        attachToonOutline(deck, 1.03);

        // Porch Steps
        const stepGeo = new THREE.BoxGeometry(3.0, 0.2, 1.0);
        const step = new THREE.Mesh(stepGeo, darkWoodMat);
        step.position.set(0, 0.1, 5.6);
        step.receiveShadow = true;
        tagMeshPart(step, 'wall', '外墙');
        cabinGroup.add(step);
        attachToonOutline(step, 1.04);

        // Porch Pillars
        [-3.0, 3.0].forEach(px => {
            const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8);
            const pillar = new THREE.Mesh(pillarGeo, darkWoodMat);
            pillar.position.set(px, 1.8, 5.0);
            pillar.castShadow = true;
            tagMeshPart(pillar, 'wall', '外墙');
            cabinGroup.add(pillar);
            attachToonOutline(pillar, 1.15);
        });

        // Porch Overhang
        const overhangGeo = new THREE.BoxGeometry(7.0, 0.3, 3.2);
        const overhang = new THREE.Mesh(overhangGeo, roofMat);
        overhang.position.set(0, 3.4, 4.2);
        overhang.rotateX(0.15);
        overhang.castShadow = true;
        tagMeshPart(overhang, 'roof', '屋顶');
        cabinGroup.add(overhang);
        attachToonOutline(overhang, 1.04);

        // Lantern on Porch
        const lanternGeo = new THREE.DodecahedronGeometry(0.25);
        const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffb74d });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set(2.4, 2.6, 4.6);
        tagMeshPart(lantern, 'wall', '外墙');
        cabinGroup.add(lantern);
        attachToonOutline(lantern, 1.15);

        cabinPointLight = new THREE.PointLight(0xffaa44, MOODS[0].lanternIntensity, 18, 1.6);
        cabinPointLight.position.set(2.4, 2.6, 4.6);
        cabinGroup.add(cabinPointLight);

        // Front Wooden Door
        const doorGeo = new THREE.BoxGeometry(1.15, 2.1, 0.14);
        const door = new THREE.Mesh(doorGeo, darkWoodMat);
        door.position.set(0, 1.25, 2.78);
        tagMeshPart(door, 'door', '门');
        cabinGroup.add(door);
        attachToonOutline(door, 1.06);

        // Windows
        [-1.8, 1.8].forEach(wx => {
            const winGeo = new THREE.PlaneGeometry(1.2, 1.4);
            const win = new THREE.Mesh(winGeo, glassMat);
            win.position.set(wx, 2.2, 2.77);
            tagMeshPart(win, 'window', '窗子');
            cabinGroup.add(win);
        });

        // Chimney
        const chimneyGeo = new THREE.BoxGeometry(0.9, 3.0, 0.9);
        const chimney = new THREE.Mesh(chimneyGeo, stoneMat);
        chimney.position.set(-2.0, 5.2, -1.2);
        chimney.castShadow = true;
        tagMeshPart(chimney, 'wall', '外墙');
        cabinGroup.add(chimney);
        attachToonOutline(chimney, 1.08);

        // Chimney Smoke
        chimneySmokeGroup = new THREE.Group();
        chimneySmokeGroup.position.set(-2.0, 6.8, -1.2);
        for (let i = 0; i < 14; i++) {
            const puffGeo = new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.25);
            const puffMat = new THREE.MeshLambertMaterial({
                color: 0xdedede,
                transparent: true,
                opacity: 0.45
            });
            const puff = new THREE.Mesh(puffGeo, puffMat);
            puff.userData = {
                isParticle: true,
                initY: i * 0.4,
                speedY: 0.015 + Math.random() * 0.01,
                driftX: 0.008 + Math.random() * 0.005,
                scaleSpeed: 0.006
            };
            puff.position.set(
                (Math.random() - 0.5) * 0.4,
                i * 0.4,
                (Math.random() - 0.5) * 0.4
            );
            chimneySmokeGroup.add(puff);
        }
        cabinGroup.add(chimneySmokeGroup);

        // Benches
        const bench = createWoodenBench();
        bench.position.set(-1.8, 0.4, 4.2);
        cabinGroup.add(bench);

        const lawnBench = createWoodenBench();
        lawnBench.position.set(5.5, getTerrainHeight(5.5, 4.5), 4.5);
        lawnBench.rotateY(-0.4);
        (parentGroup || scene).add(lawnBench);

        // Vintage Bicycle
        const bike = createVintageBicycle();
        bike.position.set(2.6, 0.4, 5.0);
        bike.rotateY(-0.7);
        (parentGroup || scene).add(cabinGroup);
        return cabinGroup;
    }

    function createWoodenBench() {
        const benchGroup = new THREE.Group();
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a5528 });
        const legMat = new THREE.MeshLambertMaterial({ color: 0x4a3219 });

        const seatGeo = new THREE.BoxGeometry(2.2, 0.12, 0.7);
        const seat = new THREE.Mesh(seatGeo, woodMat);
        seat.position.y = 0.55;
        seat.castShadow = true;
        benchGroup.add(seat);
        attachToonOutline(seat, 1.06);

        const backGeo = new THREE.BoxGeometry(2.2, 0.6, 0.1);
        const back = new THREE.Mesh(backGeo, woodMat);
        back.position.set(0, 0.95, -0.3);
        back.castShadow = true;
        benchGroup.add(back);
        attachToonOutline(back, 1.06);

        [-0.9, 0.9].forEach(lx => {
            const legGeo = new THREE.BoxGeometry(0.12, 0.55, 0.6);
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx, 0.275, -0.05);
            leg.castShadow = true;
            benchGroup.add(leg);
            attachToonOutline(leg, 1.12);
        });

        return benchGroup;
    }

    function createVintageBicycle() {
        const bikeGroup = new THREE.Group();
        const metalMat = new THREE.MeshLambertMaterial({ color: 0x3d7068 });
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

        [-0.8, 0.8].forEach(wx => {
            const wheelGeo = new THREE.TorusGeometry(0.42, 0.05, 8, 16);
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(wx, 0.42, 0);
            wheel.castShadow = true;
            bikeGroup.add(wheel);
            attachToonOutline(wheel, 1.15);
        });

        const frameGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2);
        frameGeo.rotateZ(Math.PI / 3);
        const frame1 = new THREE.Mesh(frameGeo, metalMat);
        frame1.position.set(0, 0.65, 0);
        bikeGroup.add(frame1);
        attachToonOutline(frame1, 1.2);

        bikeGroup.scale.set(0.8, 0.8, 0.8);
        return bikeGroup;
    }

    // --- Ambient Clouds & Weather Particle/Lightning Systems ---
    function createAtmosphericClouds() {
        weatherCloudGroups = [];
        for (let i = 0; i < 14; i++) {
            const cloud = createLowPolyCloud();
            cloud.position.set(
                (Math.random() - 0.5) * 160,
                24 + Math.random() * 14,
                (Math.random() - 0.5) * 160
            );
            scene.add(cloud);
            weatherCloudGroups.push(cloud);
        }
    }

    function createLowPolyCloud() {
        const cloudGroup = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            roughness: 0.9,
            transparent: true,
            opacity: 0.9
        });

        const spheres = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < spheres; i++) {
            const r = 3 + Math.random() * 2.5;
            const geo = new THREE.DodecahedronGeometry(r, 1);
            const puff = new THREE.Mesh(geo, mat);
            puff.userData.isParticle = true;
            puff.position.set(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 5
            );
            cloudGroup.add(puff);
        }
        cloudGroup.userData = { driftSpeed: 0.5 + Math.random() * 0.45, cloudMat: mat };
        return cloudGroup;
    }

    function initWeatherEffects() {
        // 1. Rain Streaks (LineSegments around player)
        const rainCount = 720;
        const rainPositions = new Float32Array(rainCount * 6);
        for (let i = 0; i < rainCount; i++) {
            const rx = (Math.random() - 0.5) * 46;
            const ry = Math.random() * 24;
            const rz = (Math.random() - 0.5) * 46;
            rainPositions[i * 6 + 0] = rx;
            rainPositions[i * 6 + 1] = ry;
            rainPositions[i * 6 + 2] = rz;
            rainPositions[i * 6 + 3] = rx - 0.14;
            rainPositions[i * 6 + 4] = ry - 0.85;
            rainPositions[i * 6 + 5] = rz;
        }
        const rainGeo = new THREE.BufferGeometry();
        rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
        const rainMat = new THREE.LineBasicMaterial({
            color: 0xcbe8ff,
            transparent: true,
            opacity: 0.65
        });
        rainParticleSystem = new THREE.LineSegments(rainGeo, rainMat);
        rainParticleSystem.visible = false;
        rainParticleSystem.frustumCulled = false;
        scene.add(rainParticleSystem);

        // 2. Snowflakes (Points around player)
        const snowCount = 460;
        const snowPositions = new Float32Array(snowCount * 3);
        const snowOffsets = new Float32Array(snowCount);
        for (let i = 0; i < snowCount; i++) {
            snowPositions[i * 3 + 0] = (Math.random() - 0.5) * 46;
            snowPositions[i * 3 + 1] = Math.random() * 22;
            snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 46;
            snowOffsets[i] = Math.random() * Math.PI * 2;
        }
        const snowGeo = new THREE.BufferGeometry();
        snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
        const snowMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.28,
            transparent: true,
            opacity: 0.88
        });
        snowParticleSystem = new THREE.Points(snowGeo, snowMat);
        snowParticleSystem.userData = { offsets: snowOffsets };
        snowParticleSystem.visible = false;
        snowParticleSystem.frustumCulled = false;
        scene.add(snowParticleSystem);

        // 3. 3D Jagged Lightning Bolt Mesh for Thunderstorm
        const boltPts = [];
        for (let i = 0; i < 10; i++) boltPts.push(new THREE.Vector3(0, 30 - i * 3, 0));
        const boltGeo = new THREE.BufferGeometry().setFromPoints(boltPts);
        const boltMat = new THREE.LineBasicMaterial({ color: 0xe3f7ff });
        lightningBoltMesh = new THREE.Line(boltGeo, boltMat);
        lightningBoltMesh.visible = false;
        lightningBoltMesh.frustumCulled = false;
        scene.add(lightningBoltMesh);

        applyWeatherVisuals();
    }

    function applyWeatherVisuals() {
        const cfg = WEATHER_CONFIGS[currentWeatherKey] || WEATHER_CONFIGS.sunny;
        const mood = MOODS[currentMoodIdx] || MOODS[0];
        const is2D = (currentRenderStyle === '2d');

        if (scene && scene.fog) {
            const baseFog = is2D ? Math.max(0.008, cfg.fogDensity * 0.72) : cfg.fogDensity;
            scene.fog.density = baseFog;
            if (cfg.skyTint !== null) {
                const bg = new THREE.Color(mood.skyColor).lerp(new THREE.Color(cfg.skyTint), 0.72);
                const fg = new THREE.Color(mood.fogColor).lerp(new THREE.Color(cfg.skyTint), 0.78);
                scene.background.copy(bg);
                scene.fog.color.copy(fg);
            } else {
                scene.background.setHex(mood.skyColor);
                scene.fog.color.setHex(mood.fogColor);
            }
        }

        if (skyDomeMesh && skyDomeMesh.material) {
            if (cfg.skyTint !== null) {
                skyDomeMesh.material.color.setHex(cfg.skyTint);
            } else {
                skyDomeMesh.material.color.setHex(0xffffff);
            }
        }

        if (hemiLight) {
            hemiLight.color.setHex(mood.hemiSky);
            hemiLight.groundColor.setHex(mood.hemiGround);
            hemiLight.intensity = (is2D ? 1.1 : 0.85) * ambientIntensityMultiplier * cfg.hemiMult + lightningFlashIntensity * 0.45;
        }
        if (sunLight) {
            sunLight.color.setHex(mood.sunColor);
            const baseSun = is2D ? mood.sunIntensity * 1.35 : mood.sunIntensity;
            sunLight.intensity = baseSun * ambientIntensityMultiplier * cfg.sunMult + lightningFlashIntensity;
        }
        if (cabinPointLight) {
            cabinPointLight.intensity = mood.lanternIntensity * ((currentWeatherKey === 'thunderstorm' || currentWeatherKey === 'fog') ? 1.35 : 1.0);
        }

        weatherCloudGroups.forEach(cloud => {
            const cMat = cloud.userData && cloud.userData.cloudMat;
            if (cMat) {
                cMat.color.setHex(cfg.cloudColor);
                cMat.opacity = cfg.cloudOpacity;
                cMat.needsUpdate = true;
            }
        });

        if (rainParticleSystem) {
            rainParticleSystem.visible = (currentWeatherKey === 'rain' || currentWeatherKey === 'thunderstorm');
        }
        if (snowParticleSystem) {
            snowParticleSystem.visible = (currentWeatherKey === 'snow');
        }

        const wIcon = document.getElementById('weather-icon');
        const wTitle = document.getElementById('weather-title');
        if (wIcon) wIcon.textContent = cfg.icon;
        if (wTitle) wTitle.textContent = cfg.name;
    }

    function triggerLightningStrike() {
        if (!lightningBoltMesh) return;
        const angle = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 24;
        const bx = charPos.x + Math.sin(angle) * dist;
        const bz = charPos.z + Math.cos(angle) * dist;
        const groundY = getTerrainHeight(bx, bz);
        const topY = 34;

        const pos = lightningBoltMesh.geometry.attributes.position;
        const segs = pos.count;
        let curX = bx;
        let curZ = bz;
        for (let i = 0; i < segs; i++) {
            const t = i / (segs - 1);
            const y = topY * (1 - t) + groundY * t;
            if (i > 0 && i < segs - 1) {
                curX += (Math.random() - 0.5) * 3.2;
                curZ += (Math.random() - 0.5) * 3.2;
            }
            pos.setXYZ(i, curX, y, curZ);
        }
        pos.needsUpdate = true;
        lightningBoltMesh.visible = true;
        lightningVisibleTimer = 0.24;
        lightningFlashIntensity = 2.8;
        playThunderSound();
    }

    window.setWeatherMode = function (weatherKey, autoEnabled) {
        if (!WEATHER_CONFIGS[weatherKey]) return;
        const prevKey = currentWeatherKey;
        currentWeatherKey = weatherKey;
        if (typeof autoEnabled === 'boolean') {
            weatherAutoEnabled = autoEnabled;
        }
        if (clock) {
            nextWeatherSwitchTime = clock.getElapsedTime() + 30 + Math.random() * 25;
        }
        lightningFlashIntensity = 0;
        lightningVisibleTimer = 0;
        if (lightningBoltMesh) lightningBoltMesh.visible = false;

        applyWeatherVisuals();
        applyWeatherAudio();
        if (currentWeatherKey === 'thunderstorm' && prevKey !== 'thunderstorm') {
            triggerLightningStrike();
        }

        const cfg = WEATHER_CONFIGS[currentWeatherKey];
        const hint = document.getElementById('hint-banner');
        if (hint && prevKey !== currentWeatherKey) {
            hint.textContent = `${cfg.icon} 天气已切换为: ${cfg.name}`;
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2200);
        }

        if (window.AndroidBridge && typeof window.AndroidBridge.onWeatherChanged === 'function') {
            try { window.AndroidBridge.onWeatherChanged(currentWeatherKey, weatherAutoEnabled); } catch (e) {}
        }
    };

    window.cycleWeather = function () {
        const idx = WEATHER_KEYS.indexOf(currentWeatherKey);
        const nextKey = WEATHER_KEYS[(idx + 1) % WEATHER_KEYS.length];
        window.setWeatherMode(nextKey, weatherAutoEnabled);
        triggerHaptic(20, 100);
    };

    // --- Interactive Beach / Soccer Ball ---
    function createBall() {
        const ballGeo = new THREE.SphereGeometry(ballRadius, 18, 18);

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(0, 0, 32, 128);
        ctx.fillStyle = '#ffc107';
        ctx.fillRect(64, 0, 32, 128);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshLambertMaterial({ map: tex, roughness: 0.4 });

        ball = new THREE.Mesh(ballGeo, mat);
        ball.position.copy(ballPos);
        ball.castShadow = true;
        scene.add(ball);

        attachToonOutline(ball, 1.07);
    }

    // --- Floating Pollen Particles ---
    function createDustParticles() {
        const particleCount = 140;
        const geo = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions.push(
                (Math.random() - 0.5) * 35,
                0.5 + Math.random() * 6,
                (Math.random() - 0.5) * 35
            );
            velocities.push(
                (Math.random() - 0.5) * 0.008,
                0.003 + Math.random() * 0.005,
                (Math.random() - 0.5) * 0.008
            );
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xfff0aa,
            size: 0.16,
            transparent: true,
            opacity: 0.65
        });

        dustParticles = new THREE.Points(geo, mat);
        dustParticles.userData = { velocities: velocities, isParticle: true };
        scene.add(dustParticles);
    }

    // --- Butterflies ---
    function createButterflies() {
        const bColors = [0xffeb3b, 0x00e5ff, 0xff4081];
        for (let i = 0; i < 3; i++) {
            const bGroup = new THREE.Group();
            const mat = new THREE.MeshBasicMaterial({
                color: bColors[i],
                side: THREE.DoubleSide
            });

            const wingGeo = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                0, 0, 0,
                0.22, 0.18, 0,
                0.25, -0.15, 0
            ]);
            wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

            const leftWing = new THREE.Mesh(wingGeo, mat);
            const rightWing = new THREE.Mesh(wingGeo, mat);
            rightWing.scale.x = -1;

            bGroup.add(leftWing);
            bGroup.add(rightWing);

            bGroup.position.set(
                (Math.random() - 0.5) * 16,
                1.5 + Math.random(),
                (Math.random() - 0.5) * 16
            );

            bGroup.userData = {
                leftWing: leftWing,
                rightWing: rightWing,
                center: bGroup.position.clone(),
                timeOffset: i * 2.1,
                radius: 3 + i * 1.5,
                isParticle: true
            };

            butterflies.push(bGroup);
            scene.add(bGroup);
        }
    }

    // --- Modular Character System ---
    function createCharacter(type = 'explorer') {
        if (character) {
            scene.remove(character);
            toonOutlines = toonOutlines.filter(o => o.parent && o.parent !== character && !character.getObjectById(o.id));
        }

        character = new THREE.Group();
        currentCharacterType = type;

        if (type === 'custom') {
            const modelToUse = (customModelDisplayName && customModelsCache[customModelDisplayName])
                ? customModelsCache[customModelDisplayName]
                : customModelGroup;
            if (modelToUse) {
                character.add(modelToUse);
                character.userData.hips = (modelToUse.userData && modelToUse.userData.hips) ? modelToUse.userData.hips : modelToUse;
                character.userData.torso = (modelToUse.userData && modelToUse.userData.torso) ? modelToUse.userData.torso : character.userData.hips;
                character.userData.headGroup = (modelToUse.userData && modelToUse.userData.headGroup) ? modelToUse.userData.headGroup : character.userData.torso;
                character.userData.leftLeg = (modelToUse.userData && modelToUse.userData.leftLeg) ? modelToUse.userData.leftLeg : { root: new THREE.Group(), shin: new THREE.Group() };
                character.userData.rightLeg = (modelToUse.userData && modelToUse.userData.rightLeg) ? modelToUse.userData.rightLeg : { root: new THREE.Group(), shin: new THREE.Group() };
                character.userData.leftArm = (modelToUse.userData && modelToUse.userData.leftArm) ? modelToUse.userData.leftArm : { root: new THREE.Group(), forearm: new THREE.Group() };
                character.userData.rightArm = (modelToUse.userData && modelToUse.userData.rightArm) ? modelToUse.userData.rightArm : { root: new THREE.Group(), forearm: new THREE.Group() };
                character.userData.mixer = (modelToUse.userData && modelToUse.userData.mixer) ? modelToUse.userData.mixer : null;
            } else {
                buildExplorerModel(character);
            }
        } else if (type === 'cat') {
            buildCatModel(character);
        } else {
            buildExplorerModel(character);
        }

        character.position.copy(charPos);
        scene.add(character);

        const names = {
            explorer: { name: "草帽探险家", icon: "🌾" },
            cat: { name: "小橘猫", icon: "🐱" },
            custom: { name: customModelDisplayName, icon: customModelDisplayIcon }
        };
        const info = names[type] || names.explorer;
        const charPillName = document.getElementById('char-name');
        const charPillIcon = document.getElementById('char-icon');
        if (charPillName) charPillName.textContent = info.name;
        if (charPillIcon) charPillIcon.textContent = info.icon;

        if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoaded === 'function') {
            try { window.AndroidBridge.onModelLoaded(info.name, true); } catch (e) {}
        }
    }

    // Character Model 1: Explorer
    function buildExplorerModel(charGroup) {
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd1a4 });
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x3f51b5 });
        const shortsMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
        const hatMat = new THREE.MeshLambertMaterial({ color: 0xf5d77f });
        const shoeMat = new THREE.MeshLambertMaterial({ color: 0xd32f2f });
        const backpackMat = new THREE.MeshLambertMaterial({ color: 0xe65100 });

        const hipsGeo = new THREE.BoxGeometry(0.55, 0.35, 0.4);
        const hips = new THREE.Mesh(hipsGeo, shortsMat);
        hips.position.y = 0.95;
        hips.castShadow = true;
        charGroup.add(hips);
        charGroup.userData.hips = hips;
        attachToonOutline(hips, 1.08);

        const torsoGeo = new THREE.BoxGeometry(0.65, 0.7, 0.45);
        const torso = new THREE.Mesh(torsoGeo, shirtMat);
        torso.position.y = 0.52;
        torso.castShadow = true;
        hips.add(torso);
        charGroup.userData.torso = torso;
        attachToonOutline(torso, 1.08);

        const packGeo = new THREE.BoxGeometry(0.48, 0.55, 0.28);
        const pack = new THREE.Mesh(packGeo, backpackMat);
        pack.position.set(0, 0, -0.32);
        pack.castShadow = true;
        torso.add(pack);
        attachToonOutline(pack, 1.09);

        const headGroup = new THREE.Group();
        headGroup.position.y = 0.58;
        const headGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.castShadow = true;
        headGroup.add(head);
        attachToonOutline(head, 1.10);

        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x212121 });
        [-0.12, 0.12].forEach(ex => {
            const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.05);
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(ex, 0.05, 0.24);
            headGroup.add(eye);
        });

        const hatBrimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12);
        const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
        hatBrim.position.y = 0.26;
        hatBrim.castShadow = true;
        headGroup.add(hatBrim);
        attachToonOutline(hatBrim, 1.08);

        const hatCrownGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.28, 10);
        const hatCrown = new THREE.Mesh(hatCrownGeo, hatMat);
        hatCrown.position.y = 0.42;
        hatCrown.castShadow = true;
        headGroup.add(hatCrown);
        attachToonOutline(hatCrown, 1.12);

        torso.add(headGroup);
        charGroup.userData.headGroup = headGroup;

        charGroup.userData.leftLeg = createHumanLeg(skinMat, shortsMat, shoeMat, -0.18);
        charGroup.userData.rightLeg = createHumanLeg(skinMat, shortsMat, shoeMat, 0.18);
        hips.add(charGroup.userData.leftLeg.root);
        hips.add(charGroup.userData.rightLeg.root);

        charGroup.userData.leftArm = createHumanArm(skinMat, shirtMat, -0.42);
        charGroup.userData.rightArm = createHumanArm(skinMat, shirtMat, 0.42);
        torso.add(charGroup.userData.leftArm.root);
        torso.add(charGroup.userData.rightArm.root);
    }

    // Character Model 2: Cat
    function buildCatModel(charGroup) {
        const orangeMat = new THREE.MeshLambertMaterial({ color: 0xf57c00 });
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const pinkMat = new THREE.MeshLambertMaterial({ color: 0xff80ab });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1b5e20 });

        const hips = new THREE.Group();
        hips.position.y = 0.55;
        charGroup.add(hips);
        charGroup.userData.hips = hips;

        const bodyGeo = new THREE.BoxGeometry(0.5, 0.42, 0.7);
        const body = new THREE.Mesh(bodyGeo, orangeMat);
        body.castShadow = true;
        hips.add(body);
        attachToonOutline(body, 1.08);

        const chestGeo = new THREE.BoxGeometry(0.42, 0.32, 0.25);
        const chest = new THREE.Mesh(chestGeo, whiteMat);
        chest.position.set(0, -0.05, 0.25);
        body.add(chest);

        charGroup.userData.torso = body;

        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.28, 0.45);
        const headGeo = new THREE.BoxGeometry(0.44, 0.38, 0.4);
        const head = new THREE.Mesh(headGeo, orangeMat);
        head.castShadow = true;
        headGroup.add(head);
        attachToonOutline(head, 1.10);

        [-0.15, 0.15].forEach(ex => {
            const earGeo = new THREE.ConeGeometry(0.1, 0.18, 4);
            const ear = new THREE.Mesh(earGeo, pinkMat);
            ear.position.set(ex, 0.25, 0.05);
            headGroup.add(ear);
            attachToonOutline(ear, 1.15);
        });

        [-0.12, 0.12].forEach(ex => {
            const eyeGeo = new THREE.BoxGeometry(0.06, 0.07, 0.04);
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(ex, 0.02, 0.21);
            headGroup.add(eye);
        });

        hips.add(headGroup);

        const tailGroup = new THREE.Group();
        tailGroup.position.set(0, 0.15, -0.38);
        const tailGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6);
        tailGeo.rotateX(Math.PI / 4);
        const tail = new THREE.Mesh(tailGeo, orangeMat);
        tail.position.set(0, 0.18, -0.15);
        tailGroup.add(tail);
        attachToonOutline(tail, 1.15);
        hips.add(tailGroup);

        charGroup.userData.leftLeg = createCatLeg(orangeMat, whiteMat, -0.18, -0.2);
        charGroup.userData.rightLeg = createCatLeg(orangeMat, whiteMat, 0.18, -0.2);
        charGroup.userData.leftArm = createCatLeg(orangeMat, whiteMat, -0.18, 0.25);
        charGroup.userData.rightArm = createCatLeg(orangeMat, whiteMat, 0.18, 0.25);

        hips.add(charGroup.userData.leftLeg.root);
        hips.add(charGroup.userData.rightLeg.root);
        hips.add(charGroup.userData.leftArm.root);
        hips.add(charGroup.userData.rightArm.root);
    }

    function createCatLeg(mainMat, pawMat, x, z) {
        const root = new THREE.Group();
        root.position.set(x, -0.1, z);

        const legGeo = new THREE.BoxGeometry(0.12, 0.32, 0.12);
        const leg = new THREE.Mesh(legGeo, mainMat);
        leg.position.y = -0.16;
        leg.castShadow = true;
        root.add(leg);
        attachToonOutline(leg, 1.15);

        const pawRoot = new THREE.Group();
        pawRoot.position.set(0, -0.3, 0);
        const pawGeo = new THREE.BoxGeometry(0.14, 0.1, 0.16);
        const paw = new THREE.Mesh(pawGeo, pawMat);
        paw.position.set(0, 0, 0.02);
        pawRoot.add(paw);
        root.add(pawRoot);

        return { root: root, shin: pawRoot, forearm: pawRoot };
    }

    // Character Model 3: Robot
    function buildRobotModel(charGroup) {
        const metalMat = new THREE.MeshLambertMaterial({ color: 0x78909c });
        const brassMat = new THREE.MeshLambertMaterial({ color: 0xffb300 });
        const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        const hipsGeo = new THREE.BoxGeometry(0.6, 0.35, 0.45);
        const hips = new THREE.Mesh(hipsGeo, brassMat);
        hips.position.y = 0.95;
        hips.castShadow = true;
        charGroup.add(hips);
        charGroup.userData.hips = hips;
        attachToonOutline(hips, 1.08);

        const torsoGeo = new THREE.BoxGeometry(0.7, 0.75, 0.5);
        const torso = new THREE.Mesh(torsoGeo, metalMat);
        torso.position.y = 0.55;
        torso.castShadow = true;
        hips.add(torso);
        charGroup.userData.torso = torso;
        attachToonOutline(torso, 1.08);

        const headGroup = new THREE.Group();
        headGroup.position.y = 0.62;
        const headGeo = new THREE.BoxGeometry(0.5, 0.48, 0.48);
        const head = new THREE.Mesh(headGeo, metalMat);
        head.castShadow = true;
        headGroup.add(head);
        attachToonOutline(head, 1.10);

        const antPoleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3);
        const antPole = new THREE.Mesh(antPoleGeo, brassMat);
        antPole.position.y = 0.36;
        headGroup.add(antPole);

        const antBallGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const antBall = new THREE.Mesh(antBallGeo, cyanGlowMat);
        antBall.position.y = 0.52;
        headGroup.add(antBall);

        const visorGeo = new THREE.BoxGeometry(0.38, 0.12, 0.05);
        const visor = new THREE.Mesh(visorGeo, cyanGlowMat);
        visor.position.set(0, 0.06, 0.25);
        headGroup.add(visor);

        torso.add(headGroup);

        charGroup.userData.leftLeg = createHumanLeg(metalMat, brassMat, metalMat, -0.2);
        charGroup.userData.rightLeg = createHumanLeg(metalMat, brassMat, metalMat, 0.2);
        hips.add(charGroup.userData.leftLeg.root);
        hips.add(charGroup.userData.rightLeg.root);

        charGroup.userData.leftArm = createHumanArm(brassMat, metalMat, -0.45);
        charGroup.userData.rightArm = createHumanArm(brassMat, metalMat, 0.45);
        torso.add(charGroup.userData.leftArm.root);
        torso.add(charGroup.userData.rightArm.root);
    }

    // Character Model 4: Athletic Runner
    function buildRunnerModel(charGroup) {
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd1a4 });
        const hoodieMat = new THREE.MeshLambertMaterial({ color: 0x00c853 });
        const trackPantsMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
        const capMat = new THREE.MeshLambertMaterial({ color: 0xd50000 });
        const shoeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

        const hipsGeo = new THREE.BoxGeometry(0.55, 0.35, 0.4);
        const hips = new THREE.Mesh(hipsGeo, trackPantsMat);
        hips.position.y = 0.95;
        charGroup.add(hips);
        charGroup.userData.hips = hips;
        attachToonOutline(hips, 1.08);

        const torsoGeo = new THREE.BoxGeometry(0.65, 0.72, 0.45);
        const torso = new THREE.Mesh(torsoGeo, hoodieMat);
        torso.position.y = 0.52;
        hips.add(torso);
        charGroup.userData.torso = torso;
        attachToonOutline(torso, 1.08);

        const headGroup = new THREE.Group();
        headGroup.position.y = 0.58;
        const headGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
        const head = new THREE.Mesh(headGeo, skinMat);
        headGroup.add(head);
        attachToonOutline(head, 1.10);

        const capGeo = new THREE.SphereGeometry(0.28, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 0.22;
        headGroup.add(cap);

        const brimGeo = new THREE.BoxGeometry(0.28, 0.04, 0.24);
        const brim = new THREE.Mesh(brimGeo, capMat);
        brim.position.set(0, 0.24, -0.22);
        brim.rotateX(0.1);
        headGroup.add(brim);
        attachToonOutline(cap, 1.10);

        torso.add(headGroup);

        charGroup.userData.leftLeg = createHumanLeg(skinMat, trackPantsMat, shoeMat, -0.18);
        charGroup.userData.rightLeg = createHumanLeg(skinMat, trackPantsMat, shoeMat, 0.18);
        hips.add(charGroup.userData.leftLeg.root);
        hips.add(charGroup.userData.rightLeg.root);

        charGroup.userData.leftArm = createHumanArm(skinMat, hoodieMat, -0.42);
        charGroup.userData.rightArm = createHumanArm(skinMat, hoodieMat, 0.42);
        torso.add(charGroup.userData.leftArm.root);
        torso.add(charGroup.userData.rightArm.root);
    }

    function createHumanLeg(skinMat, pantsMat, shoeMat, xOffset) {
        const root = new THREE.Group();
        root.position.set(xOffset, -0.15, 0);

        const thighGeo = new THREE.BoxGeometry(0.22, 0.45, 0.22);
        const thigh = new THREE.Mesh(thighGeo, pantsMat);
        thigh.position.y = -0.22;
        thigh.castShadow = true;
        root.add(thigh);
        attachToonOutline(thigh, 1.12);

        const shinRoot = new THREE.Group();
        shinRoot.position.set(0, -0.44, 0);

        const shinGeo = new THREE.BoxGeometry(0.18, 0.4, 0.18);
        const shin = new THREE.Mesh(shinGeo, skinMat);
        shin.position.y = -0.18;
        shin.castShadow = true;
        shinRoot.add(shin);
        attachToonOutline(shin, 1.14);

        const shoeGeo = new THREE.BoxGeometry(0.22, 0.14, 0.36);
        const shoe = new THREE.Mesh(shoeGeo, shoeMat);
        shoe.position.set(0, -0.38, 0.08);
        shoe.castShadow = true;
        shinRoot.add(shoe);
        attachToonOutline(shoe, 1.14);

        root.add(shinRoot);
        return { root: root, shin: shinRoot };
    }

    function createHumanArm(skinMat, sleeveMat, xOffset) {
        const root = new THREE.Group();
        root.position.set(xOffset, 0.26, 0);

        const armGeo = new THREE.BoxGeometry(0.18, 0.4, 0.18);
        const arm = new THREE.Mesh(armGeo, sleeveMat);
        arm.position.y = -0.18;
        arm.castShadow = true;
        root.add(arm);
        attachToonOutline(arm, 1.15);

        const forearm = new THREE.Group();
        forearm.position.set(0, -0.38, 0);

        const handGeo = new THREE.BoxGeometry(0.15, 0.32, 0.15);
        const hand = new THREE.Mesh(handGeo, skinMat);
        hand.position.y = -0.14;
        hand.castShadow = true;
        forearm.add(hand);
        attachToonOutline(hand, 1.18);

        root.add(forearm);
        return { root: root, forearm: forearm };
    }

    // --- Switch Character API ---
    // --- Switch Character API ---
    window.switchCharacterModel = function (type) {
        if (customModelsCache[type]) {
            customModelDisplayName = type;
            createCharacter('custom');
        } else {
            createCharacter(type);
        }
        triggerHaptic(25, 120);

        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = "已切换人物形象 ✨";
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2200);
        }
    };

    // ========================================================================
    // ROBUST CUSTOM 3D MODEL LOADER & AUTO-RIG SKELETAL SYSTEM
    // 彻底解决自定义模型导入问题：
    // 1. 分块二进制解码，杜绝 atob 堆栈与内存溢出
    // 2. 支持 GLB / GLTF / OBJ / JSON，自动读取嵌入动画 (AnimationMixer)
    // 3. 尺寸归一化 (1.75m) 与地面对齐，自动绑定人体骨骼层级，支持行走摇摆
    // 4. 双向回调 Native Android Bridge 与用户反馈
    // ========================================================================
    // High-performance typed Base64 decoder with 256-entry lookup table
    // Completely eliminates atob string slicing, preventing UI freezes / ANRs on 10MB+ models
    const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const B64_LOOKUP = new Uint8Array(256);
    for (let i = 0; i < 256; i++) B64_LOOKUP[i] = 255;
    for (let i = 0; i < B64_CHARS.length; i++) {
        B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
    }

    function decodeBase64ToUint8Array(b64) {
        if (!b64 || typeof b64 !== 'string') return new Uint8Array(0);
        const commaIdx = b64.indexOf(',');
        const str = (commaIdx >= 0) ? b64.slice(commaIdx + 1) : b64;
        const len = str.length;
        if (len === 0) return new Uint8Array(0);

        let padding = 0;
        if (len > 0 && str.charCodeAt(len - 1) === 61) padding++; // '='
        if (len > 1 && str.charCodeAt(len - 2) === 61) padding++;

        const byteLen = Math.max(0, Math.floor(len * 3 / 4) - padding);
        const bytes = new Uint8Array(byteLen);

        let p = 0;
        let bIdx = 0;
        while (p < len && bIdx < byteLen) {
            while (p < len && B64_LOOKUP[str.charCodeAt(p)] === 255 && str.charCodeAt(p) !== 61) p++;
            if (p >= len) break;
            const c0 = str.charCodeAt(p++);
            while (p < len && B64_LOOKUP[str.charCodeAt(p)] === 255 && str.charCodeAt(p) !== 61) p++;
            if (p >= len) break;
            const c1 = str.charCodeAt(p++);
            while (p < len && B64_LOOKUP[str.charCodeAt(p)] === 255 && str.charCodeAt(p) !== 61) p++;
            if (p >= len) break;
            const c2 = str.charCodeAt(p++);
            while (p < len && B64_LOOKUP[str.charCodeAt(p)] === 255 && str.charCodeAt(p) !== 61) p++;
            if (p >= len) break;
            const c3 = str.charCodeAt(p++);

            const e0 = B64_LOOKUP[c0];
            const e1 = B64_LOOKUP[c1];
            const e2 = (c2 === 61) ? 0 : B64_LOOKUP[c2];
            const e3 = (c3 === 61) ? 0 : B64_LOOKUP[c3];

            if (bIdx < byteLen) bytes[bIdx++] = ((e0 & 63) << 2) | ((e1 & 48) >> 4);
            if (c2 !== 61 && bIdx < byteLen) bytes[bIdx++] = ((e1 & 15) << 4) | ((e2 & 60) >> 2);
            if (c3 !== 61 && bIdx < byteLen) bytes[bIdx++] = ((e2 & 3) << 6) | (e3 & 63);
        }
        return bytes;
    }

    function downsampleTexture(texture, maxSize = 512) {
        if (!texture || !texture.image) return;
        const img = texture.image;
        const w = img.width || img.naturalWidth || 0;
        const h = img.height || img.naturalHeight || 0;
        if (w <= 0 || h <= 0) return;
        if (w <= maxSize && h <= maxSize) return;
        try {
            const scale = Math.min(maxSize / Math.max(1, w), maxSize / Math.max(1, h));
            const nw = Math.max(1, Math.floor(w * scale));
            const nh = Math.max(1, Math.floor(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = nw;
            canvas.height = nh;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, nw, nh);
                texture.image = canvas;
                texture.generateMipmaps = false;
                texture.minFilter = THREE.LinearFilter;
                texture.needsUpdate = true;
            }
        } catch (e) {}
    }

    function sanitizeAndNormalizeModel(object3D, targetHeight = 1.75) {
        if (!object3D) return buildExplorerStandalone();

        // 1. 深度清理：彻底剔除 GLTF / OBJ 中附带的异常 Camera、Light、Audio 与 Helper
        const toRemove = [];
        object3D.traverse(child => {
            if (!child) return;
            const typeStr = (child.type || '').toLowerCase();
            if (child.isCamera || child.isLight || child.isAudio ||
                typeStr.includes('camera') || typeStr.includes('light') || typeStr.includes('helper')) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(c => {
            if (c.parent) c.parent.remove(c);
        });

        // 2. 统计总顶点数并清理非有限坐标 (NaN / Infinity)
        let totalVertices = 0;
        object3D.traverse(child => {
            if (child.isMesh && child.geometry) {
                const pos = child.geometry.attributes && child.geometry.attributes.position;
                if (pos && pos.array) {
                    let hadBad = false;
                    for (let i = 0; i < pos.array.length; i++) {
                        if (!isFinite(pos.array[i])) {
                            pos.array[i] = 0;
                            hadBad = true;
                        }
                    }
                    if (hadBad) pos.needsUpdate = true;
                    child.geometry.computeBoundingBox();
                    child.geometry.computeBoundingSphere();
                }
                if (pos && pos.count) totalVertices += pos.count;
            }
        });
        const isHighPoly = totalVertices > 40000;

        // 3. 规范化材质与纹理 (限制纹理最大 512px 防止 Mobile WebView 显存溢出错乱，并剔除无效空纹理)
        object3D.traverse(child => {
            if (child.isMesh) {
                child.frustumCulled = false;
                child.castShadow = !isHighPoly;
                child.receiveShadow = !isHighPoly;

                if (child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach(mat => {
                        if (!mat) return;
                        mat.side = THREE.DoubleSide;
                        mat.depthWrite = true;
                        mat.depthTest = true;
                        if (mat.opacity !== undefined && mat.opacity < 0.05) mat.opacity = 1.0;
                        if (mat.roughness !== undefined && (isNaN(mat.roughness) || mat.roughness < 0)) mat.roughness = 0.6;
                        if (mat.metalness !== undefined && (isNaN(mat.metalness) || mat.metalness < 0)) mat.metalness = 0.1;
                        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap'].forEach(texKey => {
                            const tex = mat[texKey];
                            if (tex) {
                                const img = tex.image;
                                const validImg = img && ((img.width > 0 && img.height > 0) || (img.naturalWidth > 0 && img.naturalHeight > 0));
                                if (!validImg) {
                                    mat[texKey] = null;
                                    mat.needsUpdate = true;
                                } else {
                                    downsampleTexture(tex, 512);
                                }
                            }
                        });
                    });
                }
            }
        });

        // 4. 重置变换并精确计算 3D 边界盒
        object3D.position.set(0, 0, 0);
        object3D.rotation.set(0, 0, 0);
        object3D.scale.set(1, 1, 1);
        object3D.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(object3D);
        let sizeY = box.max.y - box.min.y;
        let sizeX = box.max.x - box.min.x;
        let sizeZ = box.max.z - box.min.z;

        if (!isFinite(sizeY) || sizeY <= 0.0001) {
            let minY = Infinity, maxY = -Infinity;
            object3D.traverse(child => {
                if (child.isMesh && child.geometry) {
                    child.geometry.computeBoundingBox();
                    const gb = child.geometry.boundingBox;
                    if (gb && isFinite(gb.min.y) && isFinite(gb.max.y)) {
                        minY = Math.min(minY, gb.min.y);
                        maxY = Math.max(maxY, gb.max.y);
                    }
                }
            });
            if (isFinite(minY) && isFinite(maxY) && maxY > minY) {
                sizeY = maxY - minY;
                sizeX = sizeY * 0.5;
                sizeZ = sizeY * 0.5;
            } else {
                sizeY = 1.75;
                sizeX = 0.8;
                sizeZ = 0.8;
            }
        }

        const maxDim = Math.max(sizeY, sizeX * 0.8, sizeZ * 0.8);
        const safeScale = (isFinite(maxDim) && maxDim > 0.0001)
            ? Math.max(0.0001, Math.min(1000, targetHeight / maxDim))
            : 1.0;
        object3D.scale.set(safeScale, safeScale, safeScale);
        object3D.updateMatrixWorld(true);

        // 5. 将底部脚底精准对齐 y = 0，并在水平面 (X/Z) 严格居中
        const scaledBox = new THREE.Box3().setFromObject(object3D);
        const centerX = isFinite(scaledBox.min.x) && isFinite(scaledBox.max.x) ? (scaledBox.min.x + scaledBox.max.x) * 0.5 : 0;
        const centerZ = isFinite(scaledBox.min.z) && isFinite(scaledBox.max.z) ? (scaledBox.min.z + scaledBox.max.z) * 0.5 : 0;
        const bottomY = isFinite(scaledBox.min.y) ? scaledBox.min.y : 0;

        object3D.position.set(-centerX, -bottomY, -centerZ);
        object3D.updateMatrixWorld(true);

        // 6. 包裹在外层洁净容器中，防止生成地形/动物/预览时外部 .scale.set()/.position.set() 覆盖归一化尺寸
        const normalizedRoot = new THREE.Group();
        normalizedRoot.add(object3D);
        normalizedRoot.updateMatrixWorld(true);
        return normalizedRoot;
    }

    function partitionStaticMeshIntoSkeleton(object3D, rigConfig) {
        const { baseHipsY, torsoH, shoulderSpan, hipSpan } = rigConfig;

        // 骨骼控制器树状层级构建
        const hips = new THREE.Group();
        hips.name = "hips";
        hips.position.y = baseHipsY;
        hips.userData.baseHipsY = baseHipsY;

        const torso = new THREE.Group();
        torso.name = "torso";
        torso.position.y = torsoH;
        hips.add(torso);

        const headGroup = new THREE.Group();
        headGroup.name = "headGroup";
        headGroup.position.y = 0.45;
        torso.add(headGroup);

        const leftLeg = { root: new THREE.Group(), shin: new THREE.Group() };
        leftLeg.root.name = "leftLegRoot";
        leftLeg.root.position.set(-hipSpan, 0, 0);
        leftLeg.shin.position.set(0, -0.42, 0);
        leftLeg.root.add(leftLeg.shin);
        hips.add(leftLeg.root);

        const rightLeg = { root: new THREE.Group(), shin: new THREE.Group() };
        rightLeg.root.name = "rightLegRoot";
        rightLeg.root.position.set(hipSpan, 0, 0);
        rightLeg.shin.position.set(0, -0.42, 0);
        rightLeg.root.add(rightLeg.shin);
        hips.add(rightLeg.root);

        const leftArm = { root: new THREE.Group(), forearm: new THREE.Group() };
        leftArm.root.name = "leftArmRoot";
        leftArm.root.position.set(-shoulderSpan, torsoH * 0.75, 0);
        leftArm.forearm.position.set(0, -0.32, 0);
        leftArm.root.add(leftArm.forearm);
        torso.add(leftArm.root);

        const rightArm = { root: new THREE.Group(), forearm: new THREE.Group() };
        rightArm.root.name = "rightArmRoot";
        rightArm.root.position.set(shoulderSpan, torsoH * 0.75, 0);
        rightArm.forearm.position.set(0, -0.32, 0);
        rightArm.root.add(rightArm.forearm);
        torso.add(rightArm.root);

        // 各骨骼的世界枢轴 (相对于模型基底 y=0)
        const pHead = new THREE.Vector3(0, baseHipsY + torsoH + 0.45, 0);
        const pTorso = new THREE.Vector3(0, baseHipsY + torsoH, 0);
        const pLArm = new THREE.Vector3(-shoulderSpan, baseHipsY + torsoH + torsoH * 0.75, 0);
        const pRArm = new THREE.Vector3(shoulderSpan, baseHipsY + torsoH + torsoH * 0.75, 0);
        const pLLeg = new THREE.Vector3(-hipSpan, baseHipsY, 0);
        const pRLeg = new THREE.Vector3(hipSpan, baseHipsY, 0);
        const pHips = new THREE.Vector3(0, baseHipsY, 0);

        // 收集所有网格几何体并计算总顶点数
        const meshes = [];
        let totalVerts = 0;
        object3D.traverse(child => {
            if (child.isMesh && child.geometry) {
                meshes.push(child);
                const pa = child.geometry.attributes && child.geometry.attributes.position;
                if (pa && pa.count) totalVerts += pa.count;
            }
        });

        const attachWholePreservingOffset = () => {
            const modelOffset = new THREE.Group();
            modelOffset.position.y = -baseHipsY;
            modelOffset.add(object3D);
            hips.add(modelOffset);
        };

        if (meshes.length === 0) {
            attachWholePreservingOffset();
            return { hips, torso, headGroup, leftLeg, rightLeg, leftArm, rightArm };
        }

        // 超高面数 (>150k 顶点) 直接整体挂载在重心层级，避免 JS 内存与 GC 卡死
        if (totalVerts > 150000) {
            attachWholePreservingOffset();
            return { hips, torso, headGroup, leftLeg, rightLeg, leftArm, rightArm };
        }

        const headYCut = baseHipsY + torsoH + 0.22;
        const armXCut = Math.max(0.18, shoulderSpan * 0.65);

        let didPartitionAny = false;
        const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
        const nVec = new THREE.Vector3();
        const normalMatrix = new THREE.Matrix3();

        meshes.forEach(mesh => {
            try {
                mesh.updateWorldMatrix(true, false);
                const baseGeom = mesh.geometry.isBufferGeometry
                    ? mesh.geometry
                    : new THREE.BufferGeometry().fromGeometry(mesh.geometry);
                const nonIndexed = baseGeom.index ? baseGeom.toNonIndexed() : baseGeom;
                const posAttr = nonIndexed.attributes.position;
                const normAttr = nonIndexed.attributes.normal;
                const uvAttr = nonIndexed.attributes.uv;

                if (!posAttr || posAttr.count < 3) return;
                const triLimit = Math.floor(posAttr.count / 3) * 3;

                const safeMat = Array.isArray(mesh.material)
                    ? (mesh.material.find(m => !!m) || new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide }))
                    : (mesh.material || new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide }));

                const buckets = {
                    head: { p: [], n: [], u: [] },
                    torso: { p: [], n: [], u: [] },
                    lArm: { p: [], n: [], u: [] },
                    rArm: { p: [], n: [], u: [] },
                    lLeg: { p: [], n: [], u: [] },
                    rLeg: { p: [], n: [], u: [] },
                    hips: { p: [], n: [], u: [] }
                };

                const mMatrix = mesh.matrixWorld;
                normalMatrix.getNormalMatrix(mMatrix);

                for (let i = 0; i < triLimit; i += 3) {
                    v0.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(mMatrix);
                    v1.set(posAttr.getX(i + 1), posAttr.getY(i + 1), posAttr.getZ(i + 1)).applyMatrix4(mMatrix);
                    v2.set(posAttr.getX(i + 2), posAttr.getY(i + 2), posAttr.getZ(i + 2)).applyMatrix4(mMatrix);

                    if (!isFinite(v0.x) || !isFinite(v0.y) || !isFinite(v0.z) ||
                        !isFinite(v1.x) || !isFinite(v1.y) || !isFinite(v1.z) ||
                        !isFinite(v2.x) || !isFinite(v2.y) || !isFinite(v2.z)) {
                        continue;
                    }

                    const cx = (v0.x + v1.x + v2.x) / 3;
                    const cy = (v0.y + v1.y + v2.y) / 3;

                    let bucketKey = 'hips';
                    if (cy >= headYCut) {
                        bucketKey = 'head';
                    } else if (cy >= baseHipsY * 0.75 && cx < -armXCut) {
                        bucketKey = 'lArm';
                    } else if (cy >= baseHipsY * 0.75 && cx > armXCut) {
                        bucketKey = 'rArm';
                    } else if (cy < baseHipsY * 0.98) {
                        if (cx < -0.01) bucketKey = 'lLeg';
                        else if (cx > 0.01) bucketKey = 'rLeg';
                        else bucketKey = 'hips';
                    } else if (cy >= baseHipsY + torsoH * 0.35) {
                        bucketKey = 'torso';
                    }

                    const b = buckets[bucketKey];
                    for (let vi = 0; vi < 3; vi++) {
                        const idx = i + vi;
                        const pos = (vi === 0) ? v0 : (vi === 1 ? v1 : v2);
                        b.p.push(pos.x, pos.y, pos.z);
                        if (normAttr) {
                            nVec.set(normAttr.getX(idx), normAttr.getY(idx), normAttr.getZ(idx))
                                .applyMatrix3(normalMatrix);
                            if (nVec.lengthSq() > 0.00001 && isFinite(nVec.x) && isFinite(nVec.y) && isFinite(nVec.z)) {
                                nVec.normalize();
                            } else {
                                nVec.set(0, 1, 0);
                            }
                            b.n.push(nVec.x, nVec.y, nVec.z);
                        } else {
                            b.n.push(0, 1, 0);
                        }
                        if (uvAttr) {
                            const ux = uvAttr.getX(idx);
                            const uy = uvAttr.getY(idx);
                            b.u.push(isFinite(ux) ? ux : 0, isFinite(uy) ? uy : 0);
                        } else {
                            b.u.push(0, 0);
                        }
                    }
                }

                const createSubMesh = (bucket, pivot, targetGroup) => {
                    const vertCount = Math.floor(bucket.p.length / 3);
                    if (vertCount === 0) return;

                    const pArr = new Float32Array(bucket.p.length);
                    for (let k = 0; k < bucket.p.length; k += 3) {
                        pArr[k] = bucket.p[k] - pivot.x;
                        pArr[k + 1] = bucket.p[k + 1] - pivot.y;
                        pArr[k + 2] = bucket.p[k + 2] - pivot.z;
                    }
                    const nArr = new Float32Array(bucket.n);
                    const uArr = new Float32Array(bucket.u);

                    const subGeom = new THREE.BufferGeometry();
                    subGeom.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
                    subGeom.setAttribute('normal', new THREE.BufferAttribute(nArr, 3));
                    subGeom.setAttribute('uv', new THREE.BufferAttribute(uArr, 2));
                    if (!normAttr) subGeom.computeVertexNormals();
                    subGeom.computeBoundingBox();
                    subGeom.computeBoundingSphere();

                    const subMesh = new THREE.Mesh(subGeom, safeMat);
                    subMesh.frustumCulled = false;
                    subMesh.castShadow = mesh.castShadow;
                    subMesh.receiveShadow = mesh.receiveShadow;
                    targetGroup.add(subMesh);
                    didPartitionAny = true;
                };

                createSubMesh(buckets.head, pHead, headGroup);
                createSubMesh(buckets.torso, pTorso, torso);
                createSubMesh(buckets.lArm, pLArm, leftArm.root);
                createSubMesh(buckets.rArm, pRArm, rightArm.root);
                createSubMesh(buckets.lLeg, pLLeg, leftLeg.root);
                createSubMesh(buckets.rLeg, pRLeg, rightLeg.root);
                createSubMesh(buckets.hips, pHips, hips);

                if (nonIndexed !== baseGeom && typeof nonIndexed.dispose === 'function') {
                    nonIndexed.dispose();
                }
            } catch (pErr) {
                console.warn("Mesh partition failed for a child mesh:", pErr);
            }
        });

        if (!didPartitionAny) {
            attachWholePreservingOffset();
        }

        return { hips, torso, headGroup, leftLeg, rightLeg, leftArm, rightArm };
    }

    function autoRigHumanoid(object3D, animations = [], customJoints = null) {
        try {
            if (!object3D) {
                object3D = buildExplorerStandalone();
            }

            // 1. 规范化与清理模型尺寸 (身高 1.75m，居中，底部 y=0)
            const cleanModel = sanitizeAndNormalizeModel(object3D, 1.75);

            // 2. 自带骨骼动画检测与初始化
            let mixer = null;
            if (animations && animations.length > 0) {
                try {
                    mixer = new THREE.AnimationMixer(cleanModel);
                    const action = mixer.clipAction(animations[0]);
                    action.play();
                } catch (e) {
                    console.warn("AnimationMixer init skipped:", e);
                }
            }

            // 3. 构建基于用户在 3D 工坊对称放置关节的物理控制骨骼层级
            const joints = customJoints || studioJoints || DEFAULT_RIG_JOINTS;
            const pelvisJ = (joints && joints.find(j => j.id === 'pelvis')) || { y: 0.55 };
            const chestJ = (joints && joints.find(j => j.id === 'chest')) || { y: 0.38 };
            const rShoulderJ = (joints && joints.find(j => j.id === 'r_shoulder')) || { x: 0.65, y: 0.29 };
            const rHipJ = (joints && joints.find(j => j.id === 'r_hip')) || { x: 0.59, y: 0.59 };

            const baseHipsY = Math.max(0.75, Math.min(1.15, (1.0 - pelvisJ.y) * 1.95));
            const hipSpan = Math.max(0.12, Math.min(0.35, (rHipJ.x - axisNormX) * 1.8));
            const shoulderSpan = Math.max(0.22, Math.min(0.50, (rShoulderJ.x - axisNormX) * 2.0));
            const torsoH = Math.max(0.30, Math.min(0.55, (pelvisJ.y - chestJ.y) * 1.95));

            const rigConfig = { baseHipsY, torsoH, shoulderSpan, hipSpan };

            // 检查模型是否原生包含 SkinnedMesh 与骨骼
            let hasSkinnedMesh = false;
            cleanModel.traverse(child => {
                if (child.isSkinnedMesh && child.skeleton && child.skeleton.bones && child.skeleton.bones.length > 0) {
                    hasSkinnedMesh = true;
                }
            });

            let nodes = null;
            if (hasSkinnedMesh) {
                // 原生骨骼模型：通过外层 modelOffset 保留 sanitizeAndNormalizeModel 计算的偏移，并记录原生骨骼初始 restRot
                const hips = new THREE.Group();
                hips.name = "hips";
                hips.position.y = baseHipsY;
                hips.userData.baseHipsY = baseHipsY;

                const torso = new THREE.Group();
                torso.name = "torso";
                torso.position.y = torsoH;
                hips.add(torso);

                const headGroup = new THREE.Group();
                headGroup.name = "headGroup";
                headGroup.position.y = 0.45;
                torso.add(headGroup);

                const leftLeg = { root: new THREE.Group(), shin: new THREE.Group() };
                const rightLeg = { root: new THREE.Group(), shin: new THREE.Group() };
                const leftArm = { root: new THREE.Group(), forearm: new THREE.Group() };
                const rightArm = { root: new THREE.Group(), forearm: new THREE.Group() };

                const modelOffset = new THREE.Group();
                modelOffset.position.y = -baseHipsY;
                modelOffset.add(cleanModel);
                hips.add(modelOffset);

                cleanModel.traverse(child => {
                    if (child.isSkinnedMesh && child.skeleton) {
                        child.skeleton.bones.forEach(b => {
                            if (!b) return;
                            const bName = (b.name || '').toLowerCase();
                            const recordBone = (targetHolder) => {
                                if (!b.userData.restRot) b.userData.restRot = b.rotation.clone();
                                targetHolder.root = b;
                            };
                            if (bName.includes('left') && (bName.includes('thigh') || bName.includes('upleg') || bName.includes('up_leg'))) recordBone(leftLeg);
                            if (bName.includes('right') && (bName.includes('thigh') || bName.includes('upleg') || bName.includes('up_leg'))) recordBone(rightLeg);
                            if (bName.includes('left') && (bName.includes('upperarm') || bName.includes('upper_arm') || bName.includes('arm'))) {
                                if (!bName.includes('fore')) recordBone(leftArm);
                            }
                            if (bName.includes('right') && (bName.includes('upperarm') || bName.includes('upper_arm') || bName.includes('arm'))) {
                                if (!bName.includes('fore')) recordBone(rightArm);
                            }
                        });
                    }
                });

                nodes = { hips, torso, headGroup, leftLeg, rightLeg, leftArm, rightArm };
            } else {
                // 静态网格模型 (OBJ / 普通 GLTF)：执行几何体骨骼解剖学切分与局部枢轴绑定
                nodes = partitionStaticMeshIntoSkeleton(cleanModel, rigConfig);
            }

            const riggedModel = new THREE.Group();
            riggedModel.add(nodes.hips);

            riggedModel.userData = {
                hips: nodes.hips,
                torso: nodes.torso,
                headGroup: nodes.headGroup,
                leftLeg: nodes.leftLeg,
                rightLeg: nodes.rightLeg,
                leftArm: nodes.leftArm,
                rightArm: nodes.rightArm,
                mixer: mixer,
                rawModel: cleanModel
            };

            return riggedModel;
        } catch (err) {
            console.error("autoRigHumanoid caught error, fallback to standalone explorer:", err);
            const fallback = buildExplorerStandalone();
            const rigged = new THREE.Group();
            rigged.add(fallback);
            rigged.userData = fallback.userData || {};
            return rigged;
        }
    }

    // ========================================================================
    // 3D MODEL STUDIO & SKELETAL RIGGING SYSTEM
    // 1. 3D 黑色背景工作台窗口，地表网格辅助线，3 点演播室布光
    // 2. 骨骼对称绑定：可拖动中心对称轴，右侧关节拖动镜像左侧联动，一键自动绑定骨骼
    // 3. Mixamo 预置动作实时预览：走、跑、跳、蹲下、坐、攻击、倒下、站起
    // 4. 动物模型模块：四足动物、鸟类、鱼类运动学绑定与生态群落自动漫游
    // 5. 环境模型模块：房屋建筑、植被景观无缝融入星球 Chunks 生成
    // 6. 模型删除：支持从世界和内存中安全卸载
    // ========================================================================
    let studioRenderer = null;
    let studioScene = null;
    let studioCamera = null;
    let studioModelRoot = null;
    let isStudioActive = false;
    let studioMode = 'rig'; // 'rig' | 'preview'
    let studioCategory = 'character'; // 'character' | 'animal' | 'environment'
    let studioCurrentName = '';
    let studioCurrentRawModel = null;
    let studioCurrentRiggedModel = null;
    let studioAnimState = 'walk';
    let studioAnimTime = 0;
    let studioCameraYaw = 0;
    let studioCameraPitch = 0.12;
    let studioCameraDist = 3.0;
    let studioLastRenderTime = performance.now();

    // Symmetry Axis Normalized Position (0.35 - 0.65, default 0.5)
    let axisNormX = 0.5;

    // Draggable Humanoid Joint Definitions (Mirrored across axisNormX)
    const DEFAULT_RIG_JOINTS = [
        { id: 'head', name: '头部', color: '#e040fb', x: 0.50, y: 0.13, isCenter: true },
        { id: 'neck', name: '颈部', color: '#7c4dff', x: 0.50, y: 0.23, isCenter: true },
        { id: 'chest', name: '胸腔', color: '#00e5ff', x: 0.50, y: 0.38, isCenter: true },
        { id: 'pelvis', name: '骨盆', color: '#00e676', x: 0.50, y: 0.55, isCenter: true },
        // Right side (auto-mirrored to left)
        { id: 'r_shoulder', name: '右肩', color: '#ff5252', x: 0.65, y: 0.29, isRight: true, mirrorId: 'l_shoulder', mirrorName: '左肩' },
        { id: 'r_elbow', name: '右肘', color: '#ff9100', x: 0.74, y: 0.43, isRight: true, mirrorId: 'l_elbow', mirrorName: '左肘' },
        { id: 'r_hand', name: '右手', color: '#ffd600', x: 0.82, y: 0.57, isRight: true, mirrorId: 'l_hand', mirrorName: '左手' },
        { id: 'r_hip', name: '右胯', color: '#69f0ae', x: 0.59, y: 0.59, isRight: true, mirrorId: 'l_hip', mirrorName: '左胯' },
        { id: 'r_knee', name: '右膝', color: '#40c4ff', x: 0.61, y: 0.74, isRight: true, mirrorId: 'l_knee', mirrorName: '左膝' },
        { id: 'r_foot', name: '右脚', color: '#b388ff', x: 0.63, y: 0.90, isRight: true, mirrorId: 'l_foot', mirrorName: '左脚' }
    ];
    let studioJoints = JSON.parse(JSON.stringify(DEFAULT_RIG_JOINTS));

    function initModelStudio() {
        const studioModal = document.getElementById('model-studio-modal');
        if (!studioModal) return;

        // 1. Dedicated Three.js Studio Scene (共享主引擎唯一的硬件 WebGL 上下文，彻底根绝 GPU 崩溃)
        try {
            studioScene = new THREE.Scene();
            studioScene.background = new THREE.Color(0x0e1118);

            // Studio Grid Floor
            const grid = new THREE.GridHelper(5, 10, 0x00e5ff, 0x1f2937);
            grid.position.y = 0;
            studioScene.add(grid);

            // Studio 3-point Lights
            const ambient = new THREE.AmbientLight(0xffffff, 0.95);
            studioScene.add(ambient);

            const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
            keyLight.position.set(3, 5, 4);
            studioScene.add(keyLight);

            const fillLight = new THREE.DirectionalLight(0x80d8ff, 0.8);
            fillLight.position.set(-3, 3, 2);
            studioScene.add(fillLight);

            const rimLight = new THREE.DirectionalLight(0xffd54f, 0.6);
            rimLight.position.set(0, 4, -4);
            studioScene.add(rimLight);

            studioCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
            studioCamera.position.set(0, 0.95, 3.0);
            studioCamera.lookAt(0, 0.88, 0);

            studioModelRoot = new THREE.Group();
            studioScene.add(studioModelRoot);
        } catch (e) {
            console.error("Studio Three.js initialization failed:", e);
        }

        // 2. Tab Switchers
        const tabBtnRig = document.getElementById('tab-btn-rig');
        const tabBtnPreview = document.getElementById('tab-btn-preview');

        if (tabBtnRig && tabBtnPreview) {
            tabBtnRig.addEventListener('click', () => switchStudioTab('rig'));
            tabBtnPreview.addEventListener('click', () => switchStudioTab('preview'));
        }

        // 3. Action Buttons in Studio
        const btnClose = document.getElementById('studio-btn-close');
        if (btnClose) btnClose.addEventListener('click', closeModelStudio);

        const btnBackToRig = document.getElementById('btn-back-to-rig');
        if (btnBackToRig) btnBackToRig.addEventListener('click', () => switchStudioTab('rig'));

        const btnApplyToGame = document.getElementById('btn-apply-to-game');
        if (btnApplyToGame) btnApplyToGame.addEventListener('click', applyStudioModelToGame);

        const btnResetJoints = document.getElementById('btn-reset-joints');
        if (btnResetJoints) btnResetJoints.addEventListener('click', resetStudioJoints);

        const btnExecuteRig = document.getElementById('btn-execute-rig');
        if (btnExecuteRig) btnExecuteRig.addEventListener('click', executeStudioRigging);

        // 4. Mixamo Animation Buttons
        const animButtons = document.querySelectorAll('.anim-btn');
        animButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                animButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                studioAnimState = btn.getAttribute('data-anim') || 'walk';
                triggerHaptic(20, 80);
            });
        });

        // 5. Interactive Symmetry Axis Dragging
        const axisDragHandle = document.getElementById('axis-drag-handle');
        const overlayContainer = document.getElementById('studio-rig-overlay');

        let isDraggingAxis = false;
        if (axisDragHandle && overlayContainer) {
            const onAxisPointerDown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                isDraggingAxis = true;
                axisDragHandle.classList.add('dragging');
            };
            axisDragHandle.addEventListener('mousedown', onAxisPointerDown);
            axisDragHandle.addEventListener('touchstart', onAxisPointerDown, { passive: false });

            window.addEventListener('mousemove', (e) => {
                if (!isDraggingAxis) return;
                const rect = overlayContainer.getBoundingClientRect();
                if (rect.width <= 0) return;
                axisNormX = Math.max(0.35, Math.min(0.65, (e.clientX - rect.left) / rect.width));
                updateJointsDOM();
            });

            window.addEventListener('touchmove', (e) => {
                if (!isDraggingAxis || e.touches.length === 0) return;
                const rect = overlayContainer.getBoundingClientRect();
                if (rect.width <= 0) return;
                axisNormX = Math.max(0.35, Math.min(0.65, (e.touches[0].clientX - rect.left) / rect.width));
                updateJointsDOM();
            }, { passive: false });

            const onAxisPointerUp = () => {
                if (isDraggingAxis) {
                    isDraggingAxis = false;
                    axisDragHandle.classList.remove('dragging');
                }
            };
            window.addEventListener('mouseup', onAxisPointerUp);
            window.addEventListener('touchend', onAxisPointerUp);
        }

        // 6. 3D Canvas Orbit Navigation (Touch / Mouse Orbit in Studio)
        let isOrbiting = false;
        let lastOrbitX = 0, lastOrbitY = 0;
        const canvasContainer = document.getElementById('studio-canvas-container');

        if (canvasContainer) {
            canvasContainer.addEventListener('mousedown', (e) => {
                if (e.target.closest('.joint-node') || e.target.closest('#symmetry-axis')) return;
                isOrbiting = true;
                lastOrbitX = e.clientX;
                lastOrbitY = e.clientY;
            });

            canvasContainer.addEventListener('touchstart', (e) => {
                if (e.target.closest('.joint-node') || e.target.closest('#symmetry-axis')) return;
                if (e.touches.length === 1) {
                    isOrbiting = true;
                    lastOrbitX = e.touches[0].clientX;
                    lastOrbitY = e.touches[0].clientY;
                }
            }, { passive: true });

            window.addEventListener('mousemove', (e) => {
                if (!isOrbiting) return;
                const dx = e.clientX - lastOrbitX;
                const dy = e.clientY - lastOrbitY;
                studioCameraYaw -= dx * 0.009;
                studioCameraPitch = Math.max(-0.25, Math.min(0.85, studioCameraPitch + dy * 0.007));
                lastOrbitX = e.clientX;
                lastOrbitY = e.clientY;
            });

            window.addEventListener('touchmove', (e) => {
                if (!isOrbiting || e.touches.length !== 1) return;
                const dx = e.touches[0].clientX - lastOrbitX;
                const dy = e.touches[0].clientY - lastOrbitY;
                studioCameraYaw -= dx * 0.009;
                studioCameraPitch = Math.max(-0.25, Math.min(0.85, studioCameraPitch + dy * 0.007));
                lastOrbitX = e.touches[0].clientX;
                lastOrbitY = e.touches[0].clientY;
            }, { passive: true });

            const endOrbit = () => { isOrbiting = false; };
            window.addEventListener('mouseup', endOrbit);
            window.addEventListener('touchend', endOrbit);

            canvasContainer.addEventListener('wheel', (e) => {
                e.preventDefault();
                studioCameraDist = Math.max(1.6, Math.min(5.2, studioCameraDist + e.deltaY * 0.003));
            }, { passive: false });
        }
    }

    function switchStudioTab(tab) {
        studioMode = tab;
        const tabBtnRig = document.getElementById('tab-btn-rig');
        const tabBtnPreview = document.getElementById('tab-btn-preview');
        const rigOverlay = document.getElementById('studio-rig-overlay');
        const previewOverlay = document.getElementById('studio-preview-overlay');

        if (tab === 'rig') {
            if (tabBtnRig) tabBtnRig.classList.add('active');
            if (tabBtnPreview) tabBtnPreview.classList.remove('active');
            if (rigOverlay) rigOverlay.classList.remove('hidden');
            if (previewOverlay) previewOverlay.classList.add('hidden');
            studioCameraYaw = 0;
            studioCameraPitch = 0.05;
            studioCameraDist = 3.0;
            updateJointsDOM();
        } else {
            if (tabBtnRig) tabBtnRig.classList.remove('active');
            if (tabBtnPreview) tabBtnPreview.classList.add('active');
            if (rigOverlay) rigOverlay.classList.add('hidden');
            if (previewOverlay) previewOverlay.classList.remove('hidden');
        }
        triggerHaptic(15, 60);
    }

    function resetStudioJoints() {
        axisNormX = 0.5;
        studioJoints = JSON.parse(JSON.stringify(DEFAULT_RIG_JOINTS));
        updateJointsDOM();
        triggerHaptic(20, 80);
    }

    function updateJointsDOM() {
        const symmetryAxis = document.getElementById('symmetry-axis');
        const container = document.getElementById('joint-nodes-container');
        const overlay = document.getElementById('studio-rig-overlay');
        if (!container || !overlay) return;

        if (symmetryAxis) {
            symmetryAxis.style.left = `${axisNormX * 100}%`;
        }

        container.innerHTML = '';
        const rect = overlay.getBoundingClientRect();
        if (rect.width <= 0) return;

        studioJoints.forEach(joint => {
            if (joint.isCenter) {
                const node = createJointDOMElement(joint, axisNormX, joint.y, false, (newX, newY) => {
                    joint.y = newY;
                    updateJointsDOM();
                });
                container.appendChild(node);
            } else if (joint.isRight) {
                const rNode = createJointDOMElement(joint, joint.x, joint.y, true, (newX, newY) => {
                    joint.x = Math.max(axisNormX + 0.03, Math.min(0.96, newX));
                    joint.y = newY;
                    updateJointsDOM();
                });
                container.appendChild(rNode);

                // Mirrored left joint
                const leftNormX = axisNormX - (joint.x - axisNormX);
                const lNode = document.createElement('div');
                lNode.className = 'joint-node mirror-joint';
                lNode.style.left = `${leftNormX * 100}%`;
                lNode.style.top = `${joint.y * 100}%`;
                lNode.style.borderColor = joint.color;
                lNode.style.backgroundColor = joint.color + '44';
                lNode.innerHTML = `<span class="joint-tag" style="background:${joint.color}">${joint.mirrorName} ⇹</span>`;
                container.appendChild(lNode);
            }
        });
    }

    function createJointDOMElement(joint, normX, normY, isRightSide, onDrag) {
        const el = document.createElement('div');
        el.className = 'joint-node' + (isRightSide ? ' right-joint' : ' center-joint');
        el.style.left = `${normX * 100}%`;
        el.style.top = `${normY * 100}%`;
        el.style.borderColor = joint.color;
        el.style.backgroundColor = joint.color + '66';
        el.innerHTML = `<span class="joint-tag" style="background:${joint.color}">${joint.name}</span>`;

        let isDragging = false;
        const overlay = document.getElementById('studio-rig-overlay');

        const onPointerDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            el.classList.add('dragging');
            triggerHaptic(15, 60);
        };
        el.addEventListener('mousedown', onPointerDown);
        el.addEventListener('touchstart', onPointerDown, { passive: false });

        const onMove = (clientX, clientY) => {
            if (!isDragging || !overlay) return;
            const rect = overlay.getBoundingClientRect();
            const nx = (clientX - rect.left) / rect.width;
            const ny = Math.max(0.06, Math.min(0.94, (clientY - rect.top) / rect.height));
            onDrag(nx, ny);
        };

        window.addEventListener('mousemove', (e) => {
            if (isDragging) onMove(e.clientX, e.clientY);
        });

        window.addEventListener('touchmove', (e) => {
            if (isDragging && e.touches.length > 0) {
                onMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false });

        const onUp = () => {
            if (isDragging) {
                isDragging = false;
                el.classList.remove('dragging');
            }
        };
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);

        return el;
    }

    function executeStudioRigging() {
        if (!studioCurrentRawModel) {
            studioCurrentRawModel = buildExplorerStandalone();
        }

        const rigged = autoRigHumanoid(studioCurrentRawModel, [], studioJoints);
        studioCurrentRiggedModel = rigged;

        while (studioModelRoot.children.length > 0) {
            studioModelRoot.remove(studioModelRoot.children[0]);
        }
        studioModelRoot.add(rigged);

        switchStudioTab('preview');
        triggerHaptic(40, 160);

        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = "骨骼对称绑定成功！正在预览 Mixamo 动作 ✨";
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2600);
        }
    }

    function buildExplorerStandalone() {
        const dummyGroup = new THREE.Group();
        buildExplorerModel(dummyGroup);
        return dummyGroup;
    }

    function setPoseRotation(node, rx, ry, rz) {
        if (!node || !node.rotation) return;
        if (node.userData && node.userData.restRot) {
            const rr = node.userData.restRot;
            node.rotation.set(rr.x + rx, rr.y + ry, rr.z + rz);
        } else {
            node.rotation.set(rx, ry, rz);
        }
    }

    function evaluateMixamoAnimation(model, state, time) {
        if (!model || !model.userData) return;
        const hips = model.userData.hips;
        const torso = model.userData.torso;
        const leftLeg = model.userData.leftLeg;
        const rightLeg = model.userData.rightLeg;
        const leftArm = model.userData.leftArm;
        const rightArm = model.userData.rightArm;
        const headGroup = model.userData.headGroup;

        if (!hips || !leftLeg || !rightLeg) return;
        const baseHipsY = (hips.userData && isFinite(hips.userData.baseHipsY)) ? hips.userData.baseHipsY : 0.95;

        // Reset baseline pose relative to bind rest pose
        hips.rotation.set(0, 0, 0);
        if (torso) torso.rotation.set(0, 0, 0);
        if (headGroup) headGroup.rotation.set(0, 0, 0);
        setPoseRotation(leftLeg.root, 0, 0, 0);
        setPoseRotation(rightLeg.root, 0, 0, 0);
        if (leftLeg.shin) setPoseRotation(leftLeg.shin, 0, 0, 0);
        if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0, 0, 0);
        if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0, 0, 0);
        if (rightArm && rightArm.root) setPoseRotation(rightArm.root, 0, 0, 0);

        if (state === 'walk') {
            const t = time * 5.0;
            const swing = Math.sin(t);
            hips.position.y = baseHipsY + Math.abs(Math.sin(t * 2)) * 0.05;
            hips.rotation.y = swing * 0.08;
            if (torso) torso.rotation.y = -swing * 0.08;
            setPoseRotation(leftLeg.root, swing * 0.65, 0, 0);
            setPoseRotation(rightLeg.root, -swing * 0.65, 0, 0);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, Math.max(0, -swing * 0.7), 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, Math.max(0, swing * 0.7), 0, 0);
            if (leftArm && leftArm.root) setPoseRotation(leftArm.root, -swing * 0.55, 0, 0);
            if (rightArm && rightArm.root) setPoseRotation(rightArm.root, swing * 0.55, 0, 0);
        } else if (state === 'run') {
            const t = time * 9.0;
            const swing = Math.sin(t);
            hips.position.y = baseHipsY - 0.04 + Math.abs(Math.sin(t * 2)) * 0.08;
            hips.rotation.x = 0.22;
            hips.rotation.y = swing * 0.12;
            if (torso) torso.rotation.y = -swing * 0.12;
            setPoseRotation(leftLeg.root, swing * 1.1, 0, 0);
            setPoseRotation(rightLeg.root, -swing * 1.1, 0, 0);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, Math.max(0, -swing * 1.2), 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, Math.max(0, swing * 1.2), 0, 0);
            if (leftArm && leftArm.root) setPoseRotation(leftArm.root, -swing * 0.95, 0, 0);
            if (rightArm && rightArm.root) setPoseRotation(rightArm.root, swing * 0.95, 0, 0);
        } else if (state === 'jump') {
            const cycle = (time * 1.6) % 2.0;
            if (cycle < 0.3) {
                hips.position.y = baseHipsY - 0.25;
                setPoseRotation(leftLeg.root, -0.5, 0, 0);
                setPoseRotation(rightLeg.root, -0.5, 0, 0);
                if (leftLeg.shin) setPoseRotation(leftLeg.shin, 0.8, 0, 0);
                if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0.8, 0, 0);
            } else if (cycle < 1.3) {
                const airT = (cycle - 0.3) / 1.0;
                const jumpH = Math.sin(airT * Math.PI) * 0.55;
                hips.position.y = baseHipsY + jumpH;
                setPoseRotation(leftLeg.root, -0.4, 0, 0);
                setPoseRotation(rightLeg.root, 0.3, 0, 0);
                if (leftLeg.shin) setPoseRotation(leftLeg.shin, 0.7, 0, 0);
                if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0.5, 0, 0);
                if (leftArm && leftArm.root) setPoseRotation(leftArm.root, -1.3, 0, 0);
                if (rightArm && rightArm.root) setPoseRotation(rightArm.root, -1.3, 0, 0);
            } else {
                hips.position.y = baseHipsY - 0.15;
            }
        } else if (state === 'crouch') {
            const breathe = Math.sin(time * 2.5) * 0.02;
            hips.position.y = baseHipsY - 0.35 + breathe;
            hips.rotation.x = 0.32;
            if (torso) torso.rotation.x = -0.15;
            setPoseRotation(leftLeg.root, -0.95, 0, 0);
            setPoseRotation(rightLeg.root, -0.95, 0, 0);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, 1.4, 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, 1.4, 0, 0);
            if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0.5, 0, 0);
            if (rightArm && rightArm.root) setPoseRotation(rightArm.root, 0.5, 0, 0);
        } else if (state === 'sit') {
            hips.position.y = baseHipsY - 0.48;
            hips.rotation.x = -0.15;
            if (torso) torso.rotation.x = 0.05;
            setPoseRotation(leftLeg.root, -Math.PI / 2 + 0.1, 0, 0);
            setPoseRotation(rightLeg.root, -Math.PI / 2 + 0.1, 0, 0);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, 0.15, 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0.15, 0, 0);
            if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0.4, 0, 0);
            if (rightArm && rightArm.root) setPoseRotation(rightArm.root, 0.4, 0, 0);
        } else if (state === 'attack') {
            const cycle = (time * 2.8) % 2.0;
            hips.position.y = baseHipsY;
            if (cycle < 0.9) {
                const p = Math.sin(cycle / 0.9 * Math.PI);
                if (leftArm && leftArm.root) setPoseRotation(leftArm.root, -1.55 * p, 0, 0);
                if (torso) torso.rotation.y = -0.35 * p;
                if (rightArm && rightArm.root) setPoseRotation(rightArm.root, 0.3, 0, 0);
                setPoseRotation(leftLeg.root, -0.25 * p, 0, 0);
            } else {
                const p = Math.sin((cycle - 0.9) / 1.1 * Math.PI);
                if (rightArm && rightArm.root) setPoseRotation(rightArm.root, -1.65 * p, 0, 0);
                if (torso) torso.rotation.y = 0.42 * p;
                if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0.4, 0, 0);
                setPoseRotation(rightLeg.root, 0.35 * p, 0, 0);
            }
        } else if (state === 'fall') {
            const cycle = Math.min((time * 1.5) % 3.5, 3.0);
            if (cycle < 1.0) {
                const t = cycle;
                hips.position.y = baseHipsY * (1 - t * 0.75);
                hips.rotation.x = -t * 1.3;
                if (torso) torso.rotation.x = -t * 0.3;
                setPoseRotation(leftLeg.root, -t * 0.6, 0, 0);
                setPoseRotation(rightLeg.root, -t * 0.5, 0, 0);
                if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0, 0, -t * 0.8);
                if (rightArm && rightArm.root) setPoseRotation(rightArm.root, 0, 0, t * 0.8);
            } else {
                hips.position.y = 0.22;
                hips.rotation.x = -1.35;
                setPoseRotation(leftLeg.root, -0.55, 0, 0);
                setPoseRotation(rightLeg.root, -0.45, 0, 0);
                if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0, 0, -0.8);
                if (rightArm && rightArm.root) setPoseRotation(rightArm.root, 0, 0, 0.8);
            }
        } else if (state === 'stand') {
            const cycle = (time * 1.5) % 3.0;
            if (cycle < 1.4) {
                const t = cycle / 1.4;
                hips.position.y = 0.25 + t * (baseHipsY - 0.25);
                hips.rotation.x = -1.2 * (1 - t);
                setPoseRotation(leftLeg.root, -0.8 * (1 - t), 0, 0);
                setPoseRotation(rightLeg.root, -0.8 * (1 - t), 0, 0);
                if (leftLeg.shin) setPoseRotation(leftLeg.shin, 1.2 * (1 - t), 0, 0);
                if (rightLeg.shin) setPoseRotation(rightLeg.shin, 1.2 * (1 - t), 0, 0);
                if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0.6 * (1 - t), 0, 0);
                if (rightArm && rightArm.root) setPoseRotation(rightArm.root, 0.6 * (1 - t), 0, 0);
            } else {
                const breathe = Math.sin(time * 2.5) * 0.02;
                hips.position.y = baseHipsY + breathe;
            }
        }
    }

    function applyStudioModelToGame() {
        if (studioCategory === 'character' && studioCurrentRiggedModel) {
            customModelGroup = studioCurrentRiggedModel;
            customModelDisplayName = studioCurrentName || "自定义角色";
            customModelsCache[customModelDisplayName] = studioCurrentRiggedModel;
            createCharacter('custom');

            if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoaded === 'function') {
                try { window.AndroidBridge.onModelLoaded(customModelDisplayName, true); } catch (e) {}
            }
        }
        closeModelStudio();
        triggerHaptic(50, 200);

        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = `已成功应用到游戏世界: ${studioCurrentName} 🎉`;
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 3000);
        }
    }

    function openModelStudio(category = 'character', name = '', autoOpenPreview = false) {
        initAudio();
        const studioModal = document.getElementById('model-studio-modal');
        if (!studioModal) return;

        studioCategory = category;
        studioCurrentName = name || (category === 'character' ? '3D 人物模型' : (category === 'animal' ? '野生动物' : '环境建筑'));

        const titleEl = document.getElementById('studio-title');
        const badgeEl = document.getElementById('studio-model-badge');
        const tabsRow = document.getElementById('studio-tabs-row');

        if (badgeEl) badgeEl.textContent = studioCurrentName;
        if (titleEl) {
            if (category === 'character') titleEl.textContent = "3D 人物骨骼对称绑定与动作工坊";
            else if (category === 'animal') titleEl.textContent = "3D 动物模型预览与动态表现";
            else titleEl.textContent = "3D 环境模型展示";
        }

        const animPanel = document.querySelector('.anim-panel');
        const btnBackToRig = document.getElementById('btn-back-to-rig');

        if (category === 'character') {
            if (tabsRow) tabsRow.style.display = 'flex';
            if (animPanel) animPanel.style.display = 'block';
            if (btnBackToRig) btnBackToRig.style.display = 'inline-flex';
            switchStudioTab(autoOpenPreview ? 'preview' : 'rig');
        } else {
            if (tabsRow) tabsRow.style.display = 'none';
            if (animPanel) animPanel.style.display = 'none';
            if (btnBackToRig) btnBackToRig.style.display = 'none';
            switchStudioTab('preview');
        }

        if (!studioModelRoot) {
            studioModelRoot = new THREE.Group();
            if (studioScene) studioScene.add(studioModelRoot);
        }

        while (studioModelRoot.children.length > 0) {
            studioModelRoot.remove(studioModelRoot.children[0]);
        }
        studioModelRoot.position.set(0, 0, 0);
        studioModelRoot.rotation.set(0, 0, 0);

        try {
            if (category === 'character') {
                const cached = customModelsCache[name];
                if (cached) {
                    studioCurrentRiggedModel = cached;
                    if (cached.userData && cached.userData.rawModel) {
                        studioCurrentRawModel = cached.userData.rawModel;
                    }
                    if (cached.parent) cached.parent.remove(cached);
                    studioModelRoot.add(cached);
                } else if (studioCurrentRawModel) {
                    studioCurrentRiggedModel = autoRigHumanoid(studioCurrentRawModel, [], studioJoints);
                    studioModelRoot.add(studioCurrentRiggedModel);
                } else {
                    const dummy = buildExplorerStandalone();
                    studioCurrentRawModel = dummy;
                    studioCurrentRiggedModel = autoRigHumanoid(dummy, [], studioJoints);
                    studioModelRoot.add(studioCurrentRiggedModel);
                }
            } else if (category === 'animal') {
                const cached = customAnimalsCache[name];
                const srcMesh = (cached && cached.mesh) ? cached.mesh : createCatModel();
                const previewMesh = safeCloneObject3D(srcMesh) || srcMesh;
                previewMesh.position.set(0, 0, 0);
                studioModelRoot.add(previewMesh);
            } else {
                const pB = customBuildingPool.find(b => b.name === name);
                const pV = customVegetationPool.find(v => v.name === name);
                const srcMesh = pB ? pB.mesh : (pV ? pV.mesh : buildProceduralBuilding(0, Math.random));
                const previewMesh = safeCloneObject3D(srcMesh) || srcMesh;
                previewMesh.position.set(0, 0, 0);
                previewMesh.scale.multiplyScalar(0.45);
                studioModelRoot.add(previewMesh);
            }
        } catch (loadErr) {
            console.error("Studio model setup failed:", loadErr);
            const fallback = buildExplorerStandalone();
            studioModelRoot.add(fallback);
        }

        studioModal.classList.remove('hidden');
        isStudioActive = true;
        studioLastRenderTime = performance.now();

        // 保持 WebGL <canvas> 永久挂载在 #canvas-container 中，严禁 DOM 跨容器 appendChild 搬运导致 Android Chromium 合成器灰屏/横线
        // animate() 会自动通过 setViewport + setScissor 将 studioScene 精准绘制到 #studio-canvas-container 视口区域
        const syncStudioOverlay = () => {
            const studioContainer = document.getElementById('studio-canvas-container');
            if (studioContainer && studioCamera) {
                const w = Math.max(1, studioContainer.clientWidth || window.innerWidth);
                const h = Math.max(1, studioContainer.clientHeight || window.innerHeight);
                studioCamera.aspect = w / h;
                studioCamera.updateProjectionMatrix();
            }
            updateJointsDOM();
        };
        syncStudioOverlay();
        setTimeout(syncStudioOverlay, 50);
        triggerHaptic(25, 100);
    }
    window.openModelStudio = openModelStudio;

    function closeModelStudio() {
        const studioModal = document.getElementById('model-studio-modal');
        if (studioModal) studioModal.classList.add('hidden');
        isStudioActive = false;

        if (renderer) {
            renderer.setScissorTest(false);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        }
        if (camera) {
            adaptCameraFOV();
        }
        // 确保关闭工坊时若当前使用自定义角色，模型能完整还原回主游戏角色节点下
        if (currentCharacterType === 'custom' && studioCategory === 'character') {
            createCharacter('custom');
        }
        triggerHaptic(20, 80);
    }
    window.closeModelStudio = closeModelStudio;

    // ========================================================================
    // MULTI-CATEGORY 3D MODEL PARSER (人物、动物、环境建筑、植被景观)
    // ========================================================================
    function parseAndApplyCustomModel(name, base64Data, extension, icon, category = 'character', subType = '') {
        try {
            if (!base64Data || base64Data.length === 0) {
                if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoadFailed === 'function') {
                    window.AndroidBridge.onModelLoadFailed("模型文件数据为空");
                }
                return;
            }

            const bytes = decodeBase64ToUint8Array(base64Data);
            const buffer = bytes.buffer;

            const onParsed = (object3D, animations = []) => {
                try {
                    if (!object3D) {
                        const msg = "解析后的 3D 模型为空";
                        if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoadFailed === 'function') {
                            window.AndroidBridge.onModelLoadFailed(msg);
                        }
                        return;
                    }

                    if (category === 'character') {
                        const rigged = autoRigHumanoid(object3D, animations);
                        customModelsCache[name] = rigged;
                        customModelGroup = rigged;
                        customModelDisplayName = name;
                        customModelDisplayIcon = icon || "🎮";

                        studioCurrentRawModel = object3D;
                        studioCurrentRiggedModel = rigged;
                        openModelStudio('character', name, false);

                        if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoaded === 'function') {
                            try { window.AndroidBridge.onModelLoaded(name, true); } catch (e) {}
                        }
                    } else if (category === 'animal') {
                        const cleanAnimal = sanitizeAndNormalizeModel(object3D, 0.85);
                        customAnimalsCache[name] = { id: name, name, type: subType || 'quadruped', mesh: cleanAnimal };

                        const spawned = safeCloneObject3D(cleanAnimal) || cleanAnimal;
                        const customAnimalId = `custom_animal_${name}_${Date.now()}`;
                        if (subType === 'bird') {
                            spawned.position.set(charPos.x + 15, 12, charPos.z + 15);
                            scene.add(spawned);
                            faunaAnimals.push({
                                id: customAnimalId,
                                label: name,
                                mesh: spawned,
                                type: 'bird',
                                radius: 30,
                                orbitSpeed: 0.35,
                                angle: 0,
                                baseY: 12
                            });
                        } else {
                            const ax = charPos.x + 6 + (Math.random() - 0.5) * 6;
                            const az = charPos.z + 6 + (Math.random() - 0.5) * 6;
                            const ay = getTerrainHeight(ax, az);
                            spawned.position.set(ax, ay, az);
                            scene.add(spawned);
                            faunaAnimals.push({
                                id: customAnimalId,
                                label: name,
                                mesh: spawned,
                                type: 'cat',
                                homeX: ax,
                                homeZ: az,
                                sitTimer: 0
                            });
                        }

                        openModelStudio('animal', name, true);
                        if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoaded === 'function') {
                            try { window.AndroidBridge.onModelLoaded(name, true); } catch (e) {}
                        }
                    } else if (category === 'environment') {
                        const targetH = (subType === 'vegetation') ? 2.8 : 4.5;
                        const cleanEnv = sanitizeAndNormalizeModel(object3D, targetH);
                        if (subType === 'vegetation') {
                            customVegetationPool.push({ name, mesh: cleanEnv });
                        } else {
                            customBuildingPool.push({ name, mesh: cleanEnv });
                        }

                        openModelStudio('environment', name, true);
                        if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoaded === 'function') {
                            try { window.AndroidBridge.onModelLoaded(name, true); } catch (e) {}
                        }
                    }
                } catch (applyErr) {
                    console.error("Error applying parsed model:", applyErr);
                    if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoadFailed === 'function') {
                        window.AndroidBridge.onModelLoadFailed(applyErr.message || applyErr.toString());
                    }
                }
            };

            const ext = (extension || '').toLowerCase();
            if ((ext === 'gltf' || ext === 'glb') && THREE.GLTFLoader) {
                const loader = new THREE.GLTFLoader();
                loader.parse(buffer, '', (gltf) => {
                    const sceneModel = gltf.scene || (gltf.scenes && gltf.scenes[0]) || gltf;
                    onParsed(sceneModel, gltf.animations || []);
                }, (err) => {
                    console.error("GLTF Parse Error:", err);
                    if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoadFailed === 'function') {
                        window.AndroidBridge.onModelLoadFailed(err.message || err.toString());
                    }
                });
            } else if (ext === 'obj' && THREE.OBJLoader) {
                const text = new TextDecoder().decode(bytes);
                const loader = new THREE.OBJLoader();
                const obj = loader.parse(text);
                onParsed(obj);
            } else if (ext === 'json') {
                const text = new TextDecoder().decode(bytes);
                const json = JSON.parse(text);
                const loader = new THREE.ObjectLoader();
                const obj = loader.parse(json);
                onParsed(obj);
            }
        } catch (err) {
            console.error("Error loading model:", err);
            if (window.AndroidBridge && typeof window.AndroidBridge.onModelLoadFailed === 'function') {
                window.AndroidBridge.onModelLoadFailed(err.message || err.toString());
            }
        }
    }

    // Called from Native Android Bridge
    window.loadPendingCustomModel = function (displayName, extension, displayIcon) {
        setTimeout(() => {
            try {
                const bridge = window.AndroidBridge;
                let b64 = '';

                if (bridge && typeof bridge.getPendingModelLength === 'function') {
                    const totalLen = bridge.getPendingModelLength();
                    if (totalLen > 0) {
                        const chunkSize = 256 * 1024;
                        let offset = 0;
                        const parts = [];
                        while (offset < totalLen) {
                            parts.push(bridge.getPendingModelChunk(offset, chunkSize));
                            offset += chunkSize;
                        }
                        b64 = parts.join('');
                    }
                }

                if (!b64 && bridge && typeof bridge.getPendingModelBase64 === 'function') {
                    b64 = bridge.getPendingModelBase64();
                }

                const name = displayName || (bridge && typeof bridge.getPendingModelName === 'function' ? bridge.getPendingModelName() : '本地模型');
                const ext = (extension || (bridge && typeof bridge.getPendingModelExt === 'function' ? bridge.getPendingModelExt() : 'glb')).toLowerCase();
                const icon = displayIcon || (bridge && typeof bridge.getPendingModelIcon === 'function' ? bridge.getPendingModelIcon() : '📦');
                const category = (bridge && typeof bridge.getPendingCategory === 'function' ? bridge.getPendingCategory() : 'character');
                const subType = (bridge && typeof bridge.getPendingSubType === 'function' ? bridge.getPendingSubType() : '');

                if (bridge && typeof bridge.clearPendingModelData === 'function') {
                    try { bridge.clearPendingModelData(); } catch (e) {}
                }

                if (!b64 || b64.length === 0) return;

                parseAndApplyCustomModel(name, b64, ext, icon, category, subType);
            } catch (e) {
                console.error("loadPendingCustomModel error:", e);
            }
        }, 30);
    };

    window.loadCustomModelData = function (fileName, base64Data, extension) {
        if (!base64Data && window.AndroidBridge) {
            window.loadPendingCustomModel(fileName, extension, '📦');
        } else {
            parseAndApplyCustomModel(fileName, base64Data, extension, '📦', 'character', '');
        }
    };

    // --- Safe Model Deletion from World & Memory ---
    function deleteCustomModel(category, name) {
        if (!name) return;
        if (category === 'character' || !category) {
            delete customModelsCache[name];
            if (customModelDisplayName === name) {
                customModelGroup = null;
                customModelDisplayName = "草帽探险家";
                customModelDisplayIcon = "🌾";
                window.switchCharacterModel('explorer');
            }
        } else if (category === 'animal') {
            const cached = customAnimalsCache[name];
            if (cached && cached.mesh) {
                scene.remove(cached.mesh);
                faunaAnimals = faunaAnimals.filter(a => a.mesh !== cached.mesh);
            }
            delete customAnimalsCache[name];
        } else if (category === 'environment' || category === 'building') {
            const idx = customBuildingPool.findIndex(b => b.name === name);
            if (idx >= 0) customBuildingPool.splice(idx, 1);
        } else if (category === 'vegetation') {
            const idx = customVegetationPool.findIndex(v => v.name === name);
            if (idx >= 0) customVegetationPool.splice(idx, 1);
        }

        triggerHaptic(25, 100);
        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = `已成功删除模型: ${name} 🗑️`;
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2200);
        }
    }
    window.deleteCustomModel = deleteCustomModel;

    // --- Action Handlers: Jump, Crouch, Sit, Kick ---
    function doJump() {
        if (!isGrounded || isSitting) return;
        charVel.y = 7.2;
        isGrounded = false;
        charState = 'jump';
        playJumpSound();
        triggerHaptic(35, 180);
        reportStateToNative('jump');
    }

    function toggleCrouch() {
        if (isSitting) return;
        isCrouching = !isCrouching;
        charState = isCrouching ? 'crouch' : 'idle';
        triggerHaptic(20, 100);
        reportStateToNative(charState);

        const btn = document.getElementById('btn-crouch');
        if (btn) btn.classList.toggle('active', isCrouching);
    }

    function toggleSit() {
        if (!isGrounded && !isSitting) return;
        isSitting = !isSitting;
        isCrouching = false;
        charState = isSitting ? 'sit' : 'idle';
        triggerHaptic(30, 150);
        reportStateToNative(charState);

        if (isSitting) {
            playChimeNote(523.25);
            setTimeout(() => playChimeNote(659.25), 250);
            setTimeout(() => playChimeNote(783.99), 500);
        }

        const sitText = document.getElementById('sit-btn-text');
        const sitBtn = document.getElementById('btn-sit');
        if (sitText) sitText.textContent = isSitting ? '站起' : '坐下';
        if (sitBtn) sitBtn.classList.toggle('active', isSitting);

        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = isSitting ? "静享夏日午后微风..." : "站起身来，继续探索草原";
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2800);
        }
    }

    // ========================================================================
    // WEAPONS & COMBAT SYSTEM (随机散落武器、拾取、挥舞攻击、音效与丢弃)
    // ========================================================================
    function createWeaponMesh(type = 'sword') {
        const group = new THREE.Group();
        if (type === 'sword') {
            // 勇者长剑
            const hilt = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8),
                new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 })
            );
            hilt.position.y = -0.15;
            group.add(hilt);

            const guard = new THREE.Mesh(
                new THREE.BoxGeometry(0.24, 0.05, 0.08),
                new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.8, roughness: 0.3 })
            );
            guard.position.y = 0.02;
            group.add(guard);

            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.75, 0.03),
                new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.2 })
            );
            blade.position.y = 0.42;
            group.add(blade);
        } else if (type === 'staff') {
            // 魔法木杖
            const staff = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.05, 1.1, 8),
                new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 })
            );
            staff.position.y = 0.35;
            group.add(staff);

            const gem = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.12, 0),
                new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00838f, roughness: 0.1 })
            );
            gem.position.y = 0.95;
            group.add(gem);
        } else {
            // 晨星木棒
            const club = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.04, 0.8, 8),
                new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 })
            );
            club.position.y = 0.3;
            group.add(club);
        }

        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        return group;
    }

    function spawnGroundWeaponsAround(cx, cz) {
        const weaponTypes = [
            { type: 'sword', name: '勇者长剑', icon: '⚔️' },
            { type: 'staff', name: '魔法木杖', icon: '🪄' },
            { type: 'club', name: '晨星木棒', icon: '🪵' }
        ];

        // 随机在玩家周围 6~18m 散落武器
        const numToSpawn = 3;
        for (let i = 0; i < numToSpawn; i++) {
            const chosen = weaponTypes[i % weaponTypes.length];
            const dist = 6 + i * 5 + Math.random() * 4;
            const angle = (i / numToSpawn) * Math.PI * 2 + (Math.random() - 0.5);
            const wx = cx + Math.sin(angle) * dist;
            const wz = cz + Math.cos(angle) * dist;
            const wy = getTerrainHeight(wx, wz);

            const mesh = createWeaponMesh(chosen.type);
            mesh.position.set(wx, wy + 0.35, wz);
            mesh.rotation.z = Math.PI / 4;
            scene.add(mesh);

            groundWeapons.push({
                id: `wpn_${Date.now()}_${i}`,
                name: chosen.name,
                type: chosen.type,
                icon: chosen.icon,
                mesh: mesh,
                x: wx,
                z: wz,
                y: wy
            });
        }
    }

    function doPickUp() {
        if (isSitting) return;
        // 查找玩家 2.5m 范围内最近的武器
        let closest = null;
        let minDist = 2.5;
        for (let i = 0; i < groundWeapons.length; i++) {
            const w = groundWeapons[i];
            const dx = charPos.x - w.x;
            const dz = charPos.z - w.z;
            const d = Math.hypot(dx, dz);
            if (d < minDist) {
                minDist = d;
                closest = w;
            }
        }

        if (closest) {
            // 如果已有手持武器，先掉落旧武器
            if (equippedWeapon) {
                doDropWeapon(false);
            }

            // 从地面移除并装备至角色右手上
            scene.remove(closest.mesh);
            groundWeapons = groundWeapons.filter(item => item !== closest);

            const handMesh = createWeaponMesh(closest.type);
            handMesh.scale.set(0.7, 0.7, 0.7);
            handMesh.position.set(0, -0.32, 0.15);
            handMesh.rotation.set(Math.PI / 2, 0, 0);

            if (character && character.userData && character.userData.rightArm && character.userData.rightArm.root) {
                character.userData.rightArm.root.add(handMesh);
            } else if (character) {
                character.add(handMesh);
            }

            equippedWeapon = {
                name: closest.name,
                type: closest.type,
                mesh: handMesh
            };

            playPickupSound();
            triggerHaptic(40, 200);

            const dropBtn = document.getElementById('btn-drop');
            if (dropBtn) dropBtn.classList.remove('hidden');

            const hint = document.getElementById('hint-banner');
            if (hint) {
                hint.textContent = `已拾取并装备: ${closest.name} ⚔️ 点击攻击可挥舞！`;
                hint.classList.add('show');
                setTimeout(() => hint.classList.remove('show'), 2600);
            }
        } else {
            // 拾取落叶微风音
            playRustle();
            const hint = document.getElementById('hint-banner');
            if (hint) {
                hint.textContent = "附近没有可拾取的武器或物品";
                hint.classList.add('show');
                setTimeout(() => hint.classList.remove('show'), 1800);
            }
        }
    }

    function doDropWeapon(notify = true) {
        if (!equippedWeapon) return;
        if (equippedWeapon.mesh && equippedWeapon.mesh.parent) {
            equippedWeapon.mesh.parent.remove(equippedWeapon.mesh);
        }

        const dropX = charPos.x + Math.sin(charRotation) * 1.2;
        const dropZ = charPos.z + Math.cos(charRotation) * 1.2;
        const dropY = getTerrainHeight(dropX, dropZ);

        const groundMesh = createWeaponMesh(equippedWeapon.type);
        groundMesh.position.set(dropX, dropY + 0.35, dropZ);
        groundMesh.rotation.z = Math.PI / 4;
        scene.add(groundMesh);

        groundWeapons.push({
            id: `wpn_${Date.now()}`,
            name: equippedWeapon.name,
            type: equippedWeapon.type,
            mesh: groundMesh,
            x: dropX,
            z: dropZ,
            y: dropY
        });

        const droppedName = equippedWeapon.name;
        equippedWeapon = null;

        const dropBtn = document.getElementById('btn-drop');
        if (dropBtn) dropBtn.classList.add('hidden');

        playRustle();
        triggerHaptic(20, 100);

        if (notify) {
            const hint = document.getElementById('hint-banner');
            if (hint) {
                hint.textContent = `已扔掉武器: ${droppedName}`;
                hint.classList.add('show');
                setTimeout(() => hint.classList.remove('show'), 2000);
            }
        }
    }

    function doAttack() {
        if (isSitting || isAttacking) return;
        isAttacking = true;
        attackTimer = 0.42;
        attackAnimPhase = 0;

        playAttackSound();
        triggerHaptic(45, 220);

        // 如果前方有皮球，顺带击飞皮球
        const dist = charPos.distanceTo(ballPos);
        if (dist < 2.8) {
            const kickDir = new THREE.Vector3().subVectors(ballPos, charPos).normalize();
            kickDir.y = 0.55;
            kickDir.normalize();
            ballVel.copy(kickDir.multiplyScalar(12.0));
            playKickSound();
        }

        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = equippedWeapon ? `挥舞 ${equippedWeapon.name} 斩击！⚔️` : "挥拳猛击！👊";
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 1600);
        }
    }

    // ========================================================================
    // ANIMAL MOUNT & RIDING SYSTEM (动物骑乘与下马操控)
    // ========================================================================
    function updateAnimalMountHUD() {
        const mountBtn = document.getElementById('btn-mount');
        const mountText = document.getElementById('mount-btn-text');
        if (!mountBtn) return;

        if (mountedAnimal) {
            mountBtn.classList.remove('hidden');
            mountBtn.classList.add('riding');
            if (mountText) mountText.textContent = "下坐骑 (Dismount)";
            return;
        }

        // 仅在 2.5m 范围内出现骑乘按键，离开范围立即隐藏消失
        let nearAnimal = null;
        for (let i = 0; i < faunaAnimals.length; i++) {
            const a = faunaAnimals[i];
            if (a.type === 'sheep' || a.type === 'cat' || a.type === 'quadruped') {
                const dx = charPos.x - a.mesh.position.x;
                const dz = charPos.z - a.mesh.position.z;
                const d = Math.hypot(dx, dz);
                if (d < 2.5) {
                    nearAnimal = a;
                    break;
                }
            }
        }

        if (nearAnimal) {
            mountBtn.classList.remove('hidden');
            mountBtn.classList.remove('riding');
            const animalName = nearAnimal.type === 'sheep' ? '草原绵羊' : (nearAnimal.type === 'cat' ? '小橘猫' : '萌宠坐骑');
            if (mountText) mountText.textContent = `骑乘 ${animalName} 🏇`;
        } else {
            mountBtn.classList.add('hidden');
            mountBtn.classList.remove('riding');
        }
    }

    function mountNearestAnimal() {
        if (mountedAnimal) {
            // 下马
            dismountAnimal();
            return;
        }

        let nearAnimal = null;
        for (let i = 0; i < faunaAnimals.length; i++) {
            const a = faunaAnimals[i];
            if (a.type === 'sheep' || a.type === 'cat' || a.type === 'quadruped') {
                const dx = charPos.x - a.mesh.position.x;
                const dz = charPos.z - a.mesh.position.z;
                if (Math.hypot(dx, dz) < 2.6) {
                    nearAnimal = a;
                    break;
                }
            }
        }

        if (nearAnimal) {
            mountedAnimal = nearAnimal;
            isSitting = false;
            isCrouching = false;
            playMountSound(true);
            playAnimalVoice(nearAnimal.type);
            triggerHaptic(50, 240);

            const animalName = nearAnimal.type === 'sheep' ? '草原绵羊' : (nearAnimal.type === 'cat' ? '小橘猫' : '灵兽坐骑');
            const hint = document.getElementById('hint-banner');
            if (hint) {
                hint.textContent = `已骑乘在 ${animalName} 背上！用右下角轮盘操控奔驰 🏇`;
                hint.classList.add('show');
                setTimeout(() => hint.classList.remove('show'), 3000);
            }
            updateAnimalMountHUD();
        }
    }

    function dismountAnimal() {
        if (!mountedAnimal) return;
        mountedAnimal = null;
        charPos.y = getTerrainHeight(charPos.x, charPos.z);

        // 彻底复位腿部骨骼姿态，解决下马后双腿仍向外分开的BUG
        if (character && character.userData) {
            const isCat = (currentCharacterType === 'cat');
            const baseHipsY = isCat ? 0.55 : 0.95;
            if (character.userData.hips) {
                character.userData.hips.position.y = baseHipsY;
                character.userData.hips.rotation.set(0, 0, 0);
            }
            if (character.userData.leftLeg && character.userData.leftLeg.root) {
                character.userData.leftLeg.root.rotation.set(0, 0, 0);
                if (character.userData.leftLeg.shin) character.userData.leftLeg.shin.rotation.set(0, 0, 0);
            }
            if (character.userData.rightLeg && character.userData.rightLeg.root) {
                character.userData.rightLeg.root.rotation.set(0, 0, 0);
                if (character.userData.rightLeg.shin) character.userData.rightLeg.shin.rotation.set(0, 0, 0);
            }
            if (character.userData.leftArm && character.userData.leftArm.root) character.userData.leftArm.root.rotation.set(0, 0, 0);
            if (character.userData.rightArm && character.userData.rightArm.root) character.userData.rightArm.root.rotation.set(0, 0, 0);
        }

        playMountSound(false);
        triggerHaptic(30, 120);

        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = "已离开坐骑，恢复双脚行走 🚶";
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2200);
        }
        updateAnimalMountHUD();
    }

    function doKick() {
        if (isSitting || mountedAnimal) return;
        isKicking = true;
        kickTimer = 0.35;
        triggerHaptic(40, 200);

        const dist = charPos.distanceTo(ballPos);
        if (dist < 2.6) {
            const kickDir = new THREE.Vector3().subVectors(ballPos, charPos).normalize();
            kickDir.y = 0.45;
            kickDir.normalize();
            ballVel.copy(kickDir.multiplyScalar(9.5));
            playKickSound();
            triggerHaptic(60, 255);

            if (window.AndroidBridge && typeof window.AndroidBridge.onBallKicked === 'function') {
                try { window.AndroidBridge.onBallKicked(); } catch (e) {}
            }

            const hint = document.getElementById('hint-banner');
            if (hint) {
                hint.textContent = "好球！皮球飞奔在草地上 ⚽";
                hint.classList.add('show');
                setTimeout(() => hint.classList.remove('show'), 2200);
            }
        } else {
            playRustle();
        }
    }

    // --- Style Switcher: 3D (Default) vs 2D (三渲二, 黑色描边) ---
    function toggleRenderStyle() {
        currentRenderStyle = (currentRenderStyle === '3d') ? '2d' : '3d';
        const is2D = (currentRenderStyle === '2d');

        toonOutlines.forEach(outline => {
            if (outline) outline.visible = is2D;
        });

        applyWeatherVisuals();

        const styleBtn = document.getElementById('btn-style');
        const styleText = document.getElementById('style-text');
        if (styleBtn && styleText) {
            if (is2D) {
                styleText.textContent = "🎨 风格: 2D (三渲二)";
                styleBtn.classList.add('style-2d');
            } else {
                styleText.textContent = "🎨 风格: 3D";
                styleBtn.classList.remove('style-2d');
            }
        }

        triggerHaptic(30, 160);

        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = is2D
                ? "已开启 2D 三渲二黑色描边卡通风格 ✨"
                : "已恢复 3D 写实午后光影风格 ☀️";
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2500);
        }
    }
    window.toggleRenderStyle = toggleRenderStyle;

    // --- Ambient Light Intensity Adjustment (调节环境光照强度，告别太亮刺眼) ---
    function setAmbientIntensity(val) {
        // val: 0.1 ~ 1.5
        ambientIntensityMultiplier = Math.max(0.1, Math.min(1.5, val));
        applyWeatherVisuals();
        const lightSlider = document.getElementById('light-slider');
        if (lightSlider) {
            lightSlider.value = Math.round(ambientIntensityMultiplier * 100);
        }
    }
    window.setAmbientIntensity = setAmbientIntensity;

    // --- WebGL Turbo Render Acceleration (调用手机本地多余算力加速渲染) ---
    function setTurboRender(enabled) {
        isTurboRenderEnabled = !!enabled;
        if (renderer) {
            if (isTurboRenderEnabled) {
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
                if (sunLight && sunLight.shadow) {
                    sunLight.shadow.mapSize.width = 1536;
                    sunLight.shadow.mapSize.height = 1536;
                    if (sunLight.shadow.map) sunLight.shadow.map.dispose();
                    sunLight.shadow.map = null;
                }
            } else {
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
                if (sunLight && sunLight.shadow) {
                    sunLight.shadow.mapSize.width = 1024;
                    sunLight.shadow.mapSize.height = 1024;
                    if (sunLight.shadow.map) sunLight.shadow.map.dispose();
                    sunLight.shadow.map = null;
                }
            }
        }
        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = isTurboRenderEnabled
                ? "⚡ 已开启 WebGL 算力加速模式 (GPU 深度渲染提升)!"
                : "已恢复平衡省电渲染模式";
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2600);
        }
    }
    window.setTurboRender = setTurboRender;

    // --- Cycle Time of Day Moods ---
    function cycleMood() {
        currentMoodIdx = (currentMoodIdx + 1) % MOODS.length;
        const mood = MOODS[currentMoodIdx];

        applyWeatherVisuals();

        // 切换对应时刻真实天空贴图
        if (skyDomeMesh) {
            skyDomeMesh.material.map = getSkyDomeTexture(currentMoodIdx);
            skyDomeMesh.material.needsUpdate = true;
        }

        document.getElementById('mood-title').textContent = mood.name;
        document.getElementById('time-icon').textContent = mood.icon;

        triggerHaptic(20, 100);
    }
    window.cycleMood = cycleMood;

    // --- Reset Character to Start ---
    function resetPosition() {
        charPos.set(0, getTerrainHeight(0, 0), 0);
        charVel.set(0, 0, 0);
        charRotation = 0;
        isSitting = false;
        isCrouching = false;
        charState = 'idle';

        ballPos.set(2.5, getTerrainHeight(2.5, 2.0) + ballRadius, 2.0);
        ballVel.set(0, 0, 0);

        triggerHaptic(30, 150);
        const hint = document.getElementById('hint-banner');
        if (hint) {
            hint.textContent = "已回到起点草坪";
            hint.classList.add('show');
            setTimeout(() => hint.classList.remove('show'), 2000);
        }
    }
    window.resetPosition = resetPosition;

    // ========================================================================
    // TOUCH CONTROLS & THIRD-PERSON CAMERA
    // 左下角：跳跃大按键 (Primary Jump Button)
    // 右下角：方向操控轮盘 (Move Joystick)
    // 摄像机：第三人称智能跟随角色视角 (Third-Person Follow Camera)
    // ========================================================================
    function setupControls() {
        const jumpBtn = document.getElementById('btn-jump');
        const moveZone = document.getElementById('joystick-move-zone');
        const moveHandle = document.getElementById('joystick-move-handle');

        let moveTouchId = null;
        let moveCenter = { x: 0, y: 0 };
        const maxDist = 44;

        let screenTouchId = null;
        let lastScreenX = 0;
        let lastScreenY = 0;
        let mouseMoveActive = false;

        // 1. PRIMARY JUMP BUTTON (左下角独立跳跃大按键)
        if (jumpBtn) {
            const handleJumpTrigger = (e) => {
                e.preventDefault();
                e.stopPropagation();
                initAudio();
                jumpBtn.classList.add('active');
                doJump();
                setTimeout(() => jumpBtn.classList.remove('active'), 180);
            };
            jumpBtn.addEventListener('touchstart', handleJumpTrigger, { passive: false });
            jumpBtn.addEventListener('click', handleJumpTrigger);
        }

        // 2. RIGHT MOVE JOYSTICK (右下角方向操控轮盘)
        const updateMoveHandle = (clientX, clientY) => {
            const dx = clientX - moveCenter.x;
            const dy = clientY - moveCenter.y;
            const dist = Math.hypot(dx, dy);
            const clampedDist = Math.min(dist, maxDist);
            const angle = Math.atan2(dy, dx);

            const handleX = Math.cos(angle) * clampedDist;
            const handleY = Math.sin(angle) * clampedDist;
            if (moveHandle) moveHandle.style.transform = `translate(${handleX}px, ${handleY}px)`;

            input.moveX = (clampedDist / maxDist) * Math.cos(angle);
            input.moveY = (clampedDist / maxDist) * Math.sin(angle);
        };

        const resetMoveHandle = () => {
            if (moveHandle) moveHandle.style.transform = `translate(0px, 0px)`;
            moveTouchId = null;
            mouseMoveActive = false;
            input.moveX = 0;
            input.moveY = 0;
        };

        if (moveZone) {
            moveZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (moveTouchId !== null) return;
                initAudio();
                const touch = e.changedTouches[0];
                moveTouchId = touch.identifier;
                const rect = moveZone.getBoundingClientRect();
                moveCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                updateMoveHandle(touch.clientX, touch.clientY);
                triggerHaptic(15, 60);
            }, { passive: false });

            moveZone.addEventListener('mousedown', (e) => {
                mouseMoveActive = true;
                initAudio();
                const rect = moveZone.getBoundingClientRect();
                moveCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                updateMoveHandle(e.clientX, e.clientY);
            });
        }

        // Global Multi-touch tracking
        window.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === moveTouchId) {
                    e.preventDefault();
                    updateMoveHandle(t.clientX, t.clientY);
                } else if (t.identifier === screenTouchId) {
                    // 屏幕背景滑动微调视角
                    e.preventDefault();
                    const deltaX = t.clientX - lastScreenX;
                    const deltaY = t.clientY - lastScreenY;
                    cameraYaw -= deltaX * 0.0055;
                    cameraPitch = Math.max(-0.15, Math.min(1.05, cameraPitch + deltaY * 0.004));
                    lastScreenX = t.clientX;
                    lastScreenY = t.clientY;
                }
            }
        }, { passive: false });

        window.addEventListener('mousemove', (e) => {
            if (mouseMoveActive) {
                updateMoveHandle(e.clientX, e.clientY);
            }
        });

        const onTouchRelease = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === moveTouchId) {
                    resetMoveHandle();
                } else if (t.identifier === screenTouchId) {
                    screenTouchId = null;
                }
            }
        };
        window.addEventListener('touchend', onTouchRelease, { passive: false });
        window.addEventListener('touchcancel', onTouchRelease, { passive: false });
        window.addEventListener('mouseup', () => {
            if (mouseMoveActive) resetMoveHandle();
        });

        // 全局触控激活音频与右半屏盲操摇杆
        window.addEventListener('touchstart', (e) => {
            initAudio();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier !== moveTouchId) {
                    const target = document.elementFromPoint(t.clientX, t.clientY);
                    const isControl = target && (target.closest('.floating-joystick') || target.closest('.floating-action-buttons') || target.closest('.floating-jump-zone') || target.closest('.bottom-left-controls') || target.closest('.top-bar'));
                    if (!isControl) {
                        if (t.clientX >= window.innerWidth * 0.55 && moveTouchId === null && moveZone) {
                            // 触控右侧半屏自动激活方向摇杆
                            moveTouchId = t.identifier;
                            const rect = moveZone.getBoundingClientRect();
                            moveCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                            updateMoveHandle(t.clientX, t.clientY);
                            triggerHaptic(15, 60);
                        } else if (screenTouchId === null) {
                            screenTouchId = t.identifier;
                            lastScreenX = t.clientX;
                            lastScreenY = t.clientY;
                        }
                    }
                }
            }
        }, { passive: true });

        // 3. ACTION BUTTONS
        const bindButton = (id, handler) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                initAudio();
                handler();
            }, { passive: false });
            btn.addEventListener('click', () => {
                initAudio();
                handler();
            });
        };

        bindButton('btn-crouch', toggleCrouch);
        bindButton('btn-sit', toggleSit);
        bindButton('btn-kick', doKick);

        // Attack, Pickup, Drop Weapon, and Animal Ride Buttons
        bindButton('btn-attack', doAttack);
        bindButton('btn-pickup', doPickUp);
        bindButton('btn-drop', () => doDropWeapon(true));
        bindButton('btn-mount', mountNearestAnimal);
        bindButton('btn-magic-wand', openMagicWandCameraForTouchedModel);

        bindButton('btn-style', toggleRenderStyle);
        bindButton('btn-time', cycleMood);
        bindButton('btn-weather', cycleWeather);
        bindButton('btn-reset', resetPosition);

        // Ambient Light Slider in Top Bar
        const lightSlider = document.getElementById('light-slider');
        if (lightSlider) {
            lightSlider.addEventListener('input', (e) => {
                setAmbientIntensity(parseFloat(e.target.value) / 100);
            });
        }
        const lightIcon = document.getElementById('light-icon');
        if (lightIcon) {
            lightIcon.addEventListener('click', () => {
                // 循环切换亮度: 0.4(柔和) -> 0.75(标准) -> 1.1(明亮)
                const nextLight = (ambientIntensityMultiplier < 0.6) ? 0.75 : (ambientIntensityMultiplier < 0.9 ? 1.1 : 0.4);
                setAmbientIntensity(nextLight);
            });
        }

        // Music Switcher Button in HUD
        const musicBtn = document.getElementById('btn-music-track');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => switchMusicTrack());
            musicBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                switchMusicTrack();
            }, { passive: false });
        }

        // Volume Slider in HUD
        const volSlider = document.getElementById('volume-slider');
        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                setMusicVolume(parseFloat(e.target.value) / 100);
            });
        }

        // Volume Icon Mute/Unmute Toggle
        const volIcon = document.getElementById('vol-icon');
        if (volIcon) {
            volIcon.addEventListener('click', () => {
                if (musicVolume > 0.01) {
                    setMusicVolume(0);
                } else {
                    setMusicVolume(0.7);
                }
            });
        }
    }

    // --- Obstacle Collision Resolution & Magic Wand Target Tracking ---
    const activeCollidingIds = new Set();
    const collidableRegistry = new Map(); // id -> { id, name, mesh }
    let lastTouchedObject = null; // { id, name, mesh, partsSpec }

    const PART_ORDER = [
        { key: 'roof',   label: '屋顶' },
        { key: 'wall',   label: '外墙' },
        { key: 'window', label: '窗子' },
        { key: 'door',   label: '门' },
        { key: 'leaves', label: '树叶' },
        { key: 'trunk',  label: '树干' }
    ];

    function getMeshPartSpec(mesh) {
        if (!mesh) return '';
        const found = new Set();
        mesh.traverse(child => {
            if (child.isMesh && child.userData && child.userData.partType) {
                found.add(child.userData.partType);
            }
        });
        const entries = [];
        PART_ORDER.forEach(p => {
            if (found.has(p.key)) entries.push(`${p.key}:${p.label}`);
        });
        return entries.join(',');
    }

    function registerTouchCollision(id, name, mesh, soundType, animalType = null) {
        if (!id) return;
        if (mesh) {
            collidableRegistry.set(id, { id, name: name || '3D 模型', mesh });
        }

        const isNewCollision = !activeCollidingIds.has(id);
        activeCollidingIds.add(id);

        if (isNewCollision) {
            play8BitCollisionMusic(soundType);
            if (animalType) {
                playAnimalVoice(animalType);
            }
        }

        if (mesh) {
            const partsSpec = getMeshPartSpec(mesh);
            const changed = !lastTouchedObject || lastTouchedObject.id !== id || lastTouchedObject.partsSpec !== partsSpec;
            lastTouchedObject = { id, name: name || '3D 模型', mesh, partsSpec };
            const wandBtn = document.getElementById('btn-magic-wand');
            if (wandBtn) wandBtn.classList.add('wand-ready');
            if (changed && window.AndroidBridge) {
                try {
                    if (typeof window.AndroidBridge.onObjectTouchedWithParts === 'function') {
                        window.AndroidBridge.onObjectTouchedWithParts(id, lastTouchedObject.name, partsSpec);
                    } else if (typeof window.AndroidBridge.onObjectTouched === 'function') {
                        window.AndroidBridge.onObjectTouched(id, lastTouchedObject.name);
                    }
                } catch (e) {}
            }
        }
    }

    function openMagicWandCameraForTouchedModel() {
        if (!lastTouchedObject || !lastTouchedObject.id) {
            const hint = document.getElementById('hint-banner');
            if (hint) {
                hint.textContent = "请先移动角色碰撞任意建筑、树木或动物，再点击魔法棒拍照贴图 🪄";
                hint.classList.add('show');
                setTimeout(() => hint.classList.remove('show'), 2600);
            }
            return;
        }
        if (window.AndroidBridge) {
            try {
                if (typeof window.AndroidBridge.requestMagicWandCameraWithParts === 'function') {
                    window.AndroidBridge.requestMagicWandCameraWithParts(
                        lastTouchedObject.id,
                        lastTouchedObject.name,
                        lastTouchedObject.partsSpec || ''
                    );
                } else if (typeof window.AndroidBridge.requestMagicWandCamera === 'function') {
                    window.AndroidBridge.requestMagicWandCamera(lastTouchedObject.id, lastTouchedObject.name);
                }
            } catch (e) {}
        }
    }

    function ensureBoxUVs(geometry) {
        if (!geometry || (geometry.attributes && geometry.attributes.uv)) return;
        const pos = geometry.attributes && geometry.attributes.position;
        if (!pos) return;
        const uvs = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = pos.getZ(i);
            uvs[i * 2] = (x + z) * 0.35;
            uvs[i * 2 + 1] = y * 0.35;
        }
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.attributes.uv.needsUpdate = true;
    }

    window.applyMagicTextureToModel = function (targetId, imageDataUrl, partKey = 'all') {
        if (!targetId || !imageDataUrl) return;
        const record = (lastTouchedObject && lastTouchedObject.id === targetId)
            ? lastTouchedObject
            : collidableRegistry.get(targetId);
        if (!record || !record.mesh) return;

        const targetPart = (partKey && partKey !== '') ? partKey : 'all';
        const img = new Image();
        img.onload = () => {
            try {
                const tex = new THREE.Texture(img);
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.LinearFilter;
                tex.generateMipmaps = false;
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.encoding = THREE.sRGBEncoding;
                tex.needsUpdate = true;

                let matchedMeshes = 0;
                const applyToSubMesh = (child) => {
                    ensureBoxUVs(child.geometry);
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map(m => {
                            if (!m) return m;
                            const cloned = m.clone();
                            cloned.map = tex;
                            if (cloned.color) cloned.color.setHex(0xffffff);
                            cloned.needsUpdate = true;
                            return cloned;
                        });
                    } else {
                        const cloned = child.material.clone();
                        cloned.map = tex;
                        if (cloned.color) cloned.color.setHex(0xffffff);
                        cloned.needsUpdate = true;
                        child.material = cloned;
                    }
                    matchedMeshes++;
                };

                const eligibleMeshes = [];
                record.mesh.traverse(child => {
                    if (!child.isMesh || !child.material) return;
                    if (child.userData && child.userData.isParticle) return;

                    // Skip 2D Toon inverted-hull black outline meshes
                    const checkMat = Array.isArray(child.material) ? child.material[0] : child.material;
                    if (checkMat && checkMat.side === THREE.BackSide && checkMat.color && checkMat.color.getHex() === 0x050505) {
                        return;
                    }
                    eligibleMeshes.push(child);
                });

                eligibleMeshes.forEach(child => {
                    if (targetPart === 'all' || (child.userData && child.userData.partType === targetPart)) {
                        applyToSubMesh(child);
                    }
                });

                if (matchedMeshes === 0 && targetPart !== 'all') {
                    eligibleMeshes.forEach(applyToSubMesh);
                }

                playPickupSound();
                const partEntry = PART_ORDER.find(p => p.key === targetPart);
                const partSuffix = (targetPart !== 'all' && partEntry) ? ` (${partEntry.label})` : '';
                const hint = document.getElementById('hint-banner');
                if (hint) {
                    hint.textContent = `✨ 已将低清纹理贴图贴给「${record.name}」${partSuffix}！`;
                    hint.classList.add('show');
                    setTimeout(() => hint.classList.remove('show'), 2800);
                }
            } catch (err) {
                console.error("applyMagicTextureToModel error:", err);
            }
        };
        img.src = imageDataUrl;
    };

    function resolvePlayerObstacleCollisions() {
        const playerRadius = 0.50;
        const EXIT_MARGIN = 0.32;
        const stillInsideIds = new Set();

        // 1. 与建筑和植被碰撞 (OBB 导向包围盒精准解算，带脱离滞回区间，保证单次碰撞仅播一次音效)
        for (const colliders of worldColliders.values()) {
            for (let i = 0; i < colliders.length; i++) {
                const col = colliders[i];
                const colId = col.id || `col_${Math.round(col.x)}_${Math.round(col.z)}`;
                if (col.type === 'building' && col.halfWidth && col.halfDepth) {
                    const dx = charPos.x - col.x;
                    const dz = charPos.z - col.z;
                    const maxBound = col.radius + playerRadius + EXIT_MARGIN;
                    if (dx * dx + dz * dz > maxBound * maxBound) continue;

                    const rot = col.rot || 0;
                    const cosR = Math.cos(-rot);
                    const sinR = Math.sin(-rot);
                    const localX = dx * cosR - dz * sinR;
                    const localZ = dx * sinR + dz * cosR;

                    const extX = col.halfWidth + playerRadius;
                    const extZ = col.halfDepth + playerRadius;

                    if (Math.abs(localX) < extX + EXIT_MARGIN && Math.abs(localZ) < extZ + EXIT_MARGIN) {
                        stillInsideIds.add(colId);
                    }

                    if (Math.abs(localX) < extX && Math.abs(localZ) < extZ) {
                        const penX = extX - Math.abs(localX);
                        const penZ = extZ - Math.abs(localZ);

                        let newLocalX = localX;
                        let newLocalZ = localZ;

                        if (penX < penZ) {
                            newLocalX = (localX >= 0 ? 1 : -1) * extX;
                        } else {
                            newLocalZ = (localZ >= 0 ? 1 : -1) * extZ;
                        }

                        const worldDx = newLocalX * Math.cos(rot) - newLocalZ * Math.sin(rot);
                        const worldDz = newLocalX * Math.sin(rot) + newLocalZ * Math.cos(rot);
                        charPos.x = col.x + worldDx;
                        charPos.z = col.z + worldDz;

                        registerTouchCollision(colId, col.label || '建筑模型', col.mesh, 'building');
                    }
                } else {
                    const dx = charPos.x - col.x;
                    const dz = charPos.z - col.z;
                    const rad = col.radius || 1.0;
                    const minDist = playerRadius + rad;
                    const exitDist = minDist + EXIT_MARGIN;
                    const distSq = dx * dx + dz * dz;
                    if (distSq < exitDist * exitDist) {
                        stillInsideIds.add(colId);
                    }
                    if (distSq < minDist * minDist) {
                        const dist = Math.sqrt(distSq);
                        if (dist > 0.0001) {
                            const pushDist = minDist - dist;
                            charPos.x += (dx / dist) * pushDist;
                            charPos.z += (dz / dist) * pushDist;
                        } else {
                            charPos.x += minDist;
                        }
                        registerTouchCollision(colId, col.label || (col.type === 'tree' ? '树木植被' : '场景物体'), col.mesh, col.type === 'tree' ? 'tree' : 'building');
                    }
                }
            }
        }

        // 2. 与场景中的漫游野生动物碰撞（如果未处于骑乘状态）
        if (!mountedAnimal) {
            for (let i = 0; i < faunaAnimals.length; i++) {
                const a = faunaAnimals[i];
                if (a.type === 'bird') continue;
                const animalId = a.id || `fauna_${a.type}_${i}`;
                const animalName = a.label || (a.type === 'sheep' ? '草原绵羊' : (a.type === 'cat' ? '小橘猫' : (a.type === 'chicken' ? '庭院小鸡' : (a.type === 'snake' ? '沙漠灵蛇' : '野生动物'))));
                const animalRadius = (a.type === 'sheep') ? 0.8 : ((a.type === 'cat') ? 0.5 : 0.65);
                const dx = charPos.x - a.mesh.position.x;
                const dz = charPos.z - a.mesh.position.z;
                const minDist = playerRadius + animalRadius;
                const exitDist = minDist + EXIT_MARGIN;
                const distSq = dx * dx + dz * dz;
                if (distSq < exitDist * exitDist) {
                    stillInsideIds.add(animalId);
                }
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    if (dist > 0.0001) {
                        const pushDist = (minDist - dist) * 0.7;
                        charPos.x += (dx / dist) * pushDist;
                        charPos.z += (dz / dist) * pushDist;
                        a.mesh.position.x -= (dx / dist) * pushDist * 0.3;
                        a.mesh.position.z -= (dz / dist) * pushDist * 0.3;
                    }
                    registerTouchCollision(animalId, animalName, a.mesh, 'animal', a.type);
                }
            }
        }

        // 3. 皮球碰撞去重跟踪
        if (ball) {
            const distToBall = Math.hypot(ballPos.x - charPos.x, ballPos.z - charPos.z);
            if (distToBall < ballRadius + 0.55 + EXIT_MARGIN && Math.abs(ballPos.y - charPos.y) < 1.5) {
                stillInsideIds.add('soccer_ball');
            }
        }

        // 清理已完全脱离碰撞区间的物体 ID，以便下次重新碰触时再次播放一次碰撞音效
        for (const oldId of Array.from(activeCollidingIds)) {
            if (!stillInsideIds.has(oldId)) {
                activeCollidingIds.delete(oldId);
            }
        }
    }

    // --- Main Game Update Loop ---
    function updateGame(delta) {
        // 1. Process Move from Right Joystick
        const moveMag = Math.hypot(input.moveX, input.moveY);
        let isMoving = moveMag > 0.15 && !isSitting;

        if (isMoving) {
            // Forward is UP on joystick (input.moveY < 0, forward > 0).
            const forward = -input.moveY; 
            const dirX = -Math.sin(cameraYaw) * forward + Math.cos(cameraYaw) * input.moveX;
            const dirZ = -Math.cos(cameraYaw) * forward - Math.sin(cameraYaw) * input.moveX;

            // 骑乘模式下速度更快，且带动坐骑一同奔跑
            const baseSpeed = mountedAnimal ? 7.2 : (isCrouching ? 2.2 : 5.4);
            const speed = baseSpeed * moveMag;
            charVel.x = dirX * speed;
            charVel.z = dirZ * speed;

            let targetRot = Math.atan2(dirX, dirZ);
            let diff = targetRot - charRotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            charRotation += diff * 0.22;

            walkPhase += delta * (mountedAnimal ? 18 : (isCrouching ? 7 : 14));

            if (isGrounded && Math.sin(walkPhase) > 0.95) {
                playFootstepSound(!!mountedAnimal);
            }

            if (isGrounded && !isCrouching) {
                charState = mountedAnimal ? 'ride' : 'walk';
            }

            // 2. 第三人称智能跟随视角：摄像机平滑转到角色身后，跟随玩家前进方向
            const targetCameraYaw = charRotation + Math.PI;
            let yawDiff = targetCameraYaw - cameraYaw;
            while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
            while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            cameraYaw += yawDiff * Math.min(delta * 2.8, 0.16);
        } else {
            charVel.x *= 0.6;
            charVel.z *= 0.6;
            if (isGrounded && !isCrouching && !isSitting) {
                charState = mountedAnimal ? 'ride' : 'idle';
            }
        }

        // Gravity
        if (!isGrounded) {
            charVel.y -= 22 * delta;
        }

        // Integrate Position
        charPos.x += charVel.x * delta;
        charPos.z += charVel.z * delta;
        charPos.y += charVel.y * delta;

        // Ground Collision & Seamless Downhill Slope Snapping
        const groundY = getTerrainHeight(charPos.x, charPos.z);
        const heightDiff = charPos.y - groundY;

        if (charPos.y <= groundY) {
            charPos.y = groundY;
            charVel.y = 0;
            isGrounded = true;
        } else if (isGrounded && charVel.y <= 0.01) {
            if (heightDiff < 1.0) {
                charPos.y = groundY;
                charVel.y = 0;
                isGrounded = true;
            } else {
                isGrounded = false;
            }
        }

        // 如果处于骑乘模式：坐骑位置紧贴玩家脚下，坐骑朝向跟随玩家
        if (mountedAnimal && mountedAnimal.mesh) {
            mountedAnimal.mesh.position.set(charPos.x, charPos.y, charPos.z);
            mountedAnimal.mesh.rotation.y = charRotation;
            // 提升角色自身Y轴，使得玩家跨坐在动物背上
            charPos.y += 0.55;
            if (character) {
                character.position.set(charPos.x, charPos.y, charPos.z);
            }
        }

        // 障碍物刚体碰撞：双重解算彻底杜绝玩家穿透建筑与树木、动物刚体
        resolvePlayerObstacleCollisions();
        resolvePlayerObstacleCollisions();

        // Procedural Infinite World: Keep generating terrain, buildings and vegetation around player
        updateProceduralWorld(charPos.x, charPos.z);

        if (isKicking) {
            kickTimer -= delta;
            if (kickTimer <= 0) isKicking = false;
        }

        if (isAttacking) {
            attackTimer -= delta;
            attackAnimPhase += delta * 12;
            if (attackTimer <= 0) isAttacking = false;
        }

        // 刷新浮动骑乘按钮提示
        updateAnimalMountHUD();

        // Animate Skeleton (Built-in and Auto-Rigged Custom Models)
        animateCharacterSkeleton(delta, isMoving);

        // Update Ball Physics
        updateBallPhysics(delta);

        // Update Environment Effects
        updateEnvironment(delta);

        // Update Camera
        updateCameraPosition();
    }

    function animateCharacterSkeleton(delta, isMoving) {
        if (!character) return;

        character.position.set(charPos.x, charPos.y, charPos.z);
        character.rotation.y = charRotation;

        if (character.userData.mixer) {
            character.userData.mixer.update(delta);
        }

        const hips = character.userData.hips;
        const torso = character.userData.torso;
        const leftLeg = character.userData.leftLeg;
        const rightLeg = character.userData.rightLeg;
        const leftArm = character.userData.leftArm;
        const rightArm = character.userData.rightArm;

        if (!hips || !leftLeg || !rightLeg) return;

        const isCustom = (currentCharacterType === 'custom');
        const isCat = (currentCharacterType === 'cat');
        const baseHipsY = isCat ? 0.55 : ((hips.userData && isFinite(hips.userData.baseHipsY)) ? hips.userData.baseHipsY : 0.95);

        // 关键复位：每一帧开始前相对 bind rest pose 归零左右腿与手臂角度，彻底解决下马后双腿仍向外分开及骨骼扭曲 BUG
        hips.rotation.set(0, 0, 0);
        if (torso) torso.rotation.set(0, 0, 0);
        setPoseRotation(leftLeg.root, 0, 0, 0);
        setPoseRotation(rightLeg.root, 0, 0, 0);
        if (leftLeg.shin) setPoseRotation(leftLeg.shin, 0, 0, 0);
        if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0, 0, 0);
        if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0, 0, 0);
        if (rightArm && rightArm.root) setPoseRotation(rightArm.root, 0, 0, 0);

        if (mountedAnimal) {
            // 骑乘坐姿：跨坐于动物身上，双手扶握
            hips.position.y = baseHipsY - 0.22;
            hips.rotation.x = -0.15;
            setPoseRotation(leftLeg.root, -0.65, 0, -0.35);
            setPoseRotation(rightLeg.root, -0.65, 0, 0.35);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, 0.7, 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0.7, 0, 0);
            if (leftArm && leftArm.root) setPoseRotation(leftArm.root, -0.6, 0, 0.2);
            if (rightArm && rightArm.root) setPoseRotation(rightArm.root, -0.6, 0, -0.2);
        } else if (isAttacking) {
            // 攻击动作：右臂大力劈砍挥舞，躯干轻微侧转
            const p = Math.sin(Math.min(attackAnimPhase, Math.PI));
            hips.position.y = baseHipsY;
            if (torso) torso.rotation.y = 0.45 * p;
            if (rightArm && rightArm.root) {
                setPoseRotation(rightArm.root, -1.75 * p + (1 - p) * 0.2, 0, -0.35 * p);
            }
            if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0.4 * p, 0, 0);
            setPoseRotation(rightLeg.root, 0.35 * p, 0, 0);
            setPoseRotation(leftLeg.root, -0.25 * p, 0, 0);
        } else if (isSitting) {
            hips.position.y = isCustom ? 0.48 : (isCat ? 0.35 : 0.42);
            hips.rotation.x = -0.15;
            if (torso) torso.rotation.x = 0.05;

            setPoseRotation(leftLeg.root, -Math.PI / 2 + 0.1, 0, 0);
            setPoseRotation(rightLeg.root, -Math.PI / 2 + 0.1, 0, 0);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, 0.2, 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0.2, 0, 0);

            if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0.4, 0, 0);
            if (rightArm && rightArm.root) setPoseRotation(rightArm.root, 0.4, 0, 0);
        } else if (isKicking) {
            hips.position.y = baseHipsY;
            setPoseRotation(leftLeg.root, 0, 0, 0);
            setPoseRotation(rightLeg.root, -1.1, 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0.3, 0, 0);
            if (leftArm && leftArm.root) setPoseRotation(leftArm.root, 0.6, 0, 0);
            if (rightArm && rightArm.root) setPoseRotation(rightArm.root, -0.7, 0, 0);
        } else if (isCrouching) {
            hips.position.y = isCustom ? 0.65 : (isCat ? 0.38 : 0.58);
            hips.rotation.x = 0.35;
            if (torso) torso.rotation.x = -0.15;

            setPoseRotation(leftLeg.root, -0.85, 0, 0);
            setPoseRotation(rightLeg.root, -0.85, 0, 0);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, 1.3, 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, 1.3, 0, 0);
        } else if (!isGrounded) {
            hips.position.y = baseHipsY;
            hips.rotation.x = 0;
            if (torso) torso.rotation.x = 0;

            setPoseRotation(leftLeg.root, -0.55, 0, 0);
            setPoseRotation(rightLeg.root, 0.35, 0, 0);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, 0.7, 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0.5, 0, 0);

            if (leftArm && leftArm.root) setPoseRotation(leftArm.root, -1.2, 0, 0);
            if (rightArm && rightArm.root) setPoseRotation(rightArm.root, -1.2, 0, 0);
        } else if (isMoving) {
            const swing = Math.sin(walkPhase);
            hips.position.y = baseHipsY + Math.abs(Math.sin(walkPhase * 2)) * 0.08;
            hips.rotation.x = 0.1;
            if (isCustom) {
                hips.rotation.y = swing * 0.08;
                hips.rotation.z = Math.sin(walkPhase) * 0.03;
            } else if (torso) {
                torso.rotation.y = swing * 0.12;
            }

            setPoseRotation(leftLeg.root, swing * 0.7, 0, 0);
            setPoseRotation(rightLeg.root, -swing * 0.7, 0, 0);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, Math.max(0, -swing * 0.8), 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, Math.max(0, swing * 0.8), 0, 0);

            if (leftArm && leftArm.root) {
                const armFactor = isCat ? 0.7 : -0.6;
                setPoseRotation(leftArm.root, swing * armFactor, 0, 0);
                if (rightArm && rightArm.root) setPoseRotation(rightArm.root, -swing * armFactor, 0, 0);
            }
        } else {
            const breathe = Math.sin(clock.getElapsedTime() * 2.2);
            hips.position.y = baseHipsY + breathe * 0.02;
            hips.rotation.x = 0;
            hips.rotation.y = 0;
            hips.rotation.z = 0;
            if (torso) {
                torso.rotation.x = 0;
                torso.rotation.y = 0;
            }

            setPoseRotation(leftLeg.root, 0, 0, 0);
            setPoseRotation(rightLeg.root, 0, 0, 0);
            if (leftLeg.shin) setPoseRotation(leftLeg.shin, 0, 0, 0);
            if (rightLeg.shin) setPoseRotation(rightLeg.shin, 0, 0, 0);

            if (leftArm && leftArm.root) {
                setPoseRotation(leftArm.root, breathe * 0.05, 0, 0);
                if (rightArm && rightArm.root) setPoseRotation(rightArm.root, -breathe * 0.05, 0, 0);
            }
        }
    }

    function updateBallPhysics(delta) {
        if (!ball) return;

        ballVel.y -= 16 * delta;
        ballVel.x *= 0.985;
        ballVel.z *= 0.985;

        ballPos.x += ballVel.x * delta;
        ballPos.y += ballVel.y * delta;
        ballPos.z += ballVel.z * delta;

        const groundY = getTerrainHeight(ballPos.x, ballPos.z) + ballRadius;
        if (ballPos.y <= groundY) {
            ballPos.y = groundY;
            if (Math.abs(ballVel.y) > 1.2) {
                ballVel.y = -ballVel.y * 0.62;
                playKickSound();
                triggerHaptic(15, 60);
            } else {
                ballVel.y = 0;
            }
        }

        // Ball collision against obstacles (buildings & trees)
        for (const colliders of worldColliders.values()) {
            for (let i = 0; i < colliders.length; i++) {
                const col = colliders[i];
                const dx = ballPos.x - col.x;
                const dz = ballPos.z - col.z;
                const minDist = ballRadius + col.radius;
                const distSq = dx * dx + dz * dz;
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    if (dist > 0.0001) {
                        const nx = dx / dist;
                        const nz = dz / dist;
                        ballPos.x = col.x + nx * minDist;
                        ballPos.z = col.z + nz * minDist;
                        const dot = ballVel.x * nx + ballVel.z * nz;
                        if (dot < 0) {
                            ballVel.x -= 1.5 * dot * nx;
                            ballVel.z -= 1.5 * dot * nz;
                        }
                    }
                }
            }
        }

        const distToPlayer = Math.hypot(ballPos.x - charPos.x, ballPos.z - charPos.z);
        if (distToPlayer < ballRadius + 0.55 && Math.abs(ballPos.y - charPos.y) < 1.4) {
            const pushDir = new THREE.Vector3(ballPos.x - charPos.x, 0.2, ballPos.z - charPos.z).normalize();
            ballVel.x += pushDir.x * 4.5;
            ballVel.z += pushDir.z * 4.5;
            ballVel.y += 2.0;
            registerTouchCollision('soccer_ball', '沙滩皮球', ball, 'building');
            playKickSound();
            triggerHaptic(25, 120);
        }

        ball.position.copy(ballPos);

        const rollSpeed = Math.hypot(ballVel.x, ballVel.z);
        if (rollSpeed > 0.05) {
            ball.rotation.x += ballVel.z * delta * 2.5;
            ball.rotation.z -= ballVel.x * delta * 2.5;
        }
    }

    function updateEnvironment(delta) {
        const time = clock.getElapsedTime();

        if (chimneySmokeGroup) {
            chimneySmokeGroup.children.forEach(puff => {
                puff.position.y += puff.userData.speedY;
                puff.position.x += puff.userData.driftX;
                puff.scale.addScalar(puff.userData.scaleSpeed);
                if (puff.position.y > 4.2) {
                    puff.position.y = 0;
                    puff.position.x = (Math.random() - 0.5) * 0.4;
                    puff.scale.set(1, 1, 1);
                }
            });
        }

        if (dustParticles) {
            const posAttr = dustParticles.geometry.attributes.position;
            const vels = dustParticles.userData.velocities;
            for (let i = 0; i < posAttr.count; i++) {
                let py = posAttr.getY(i) + vels[i * 3 + 1];
                let px = posAttr.getX(i) + vels[i * 3 + 0] + Math.sin(time + i) * 0.003;
                let pz = posAttr.getZ(i) + vels[i * 3 + 2];
                if (py > 6.5) py = 0.5;
                posAttr.setXYZ(i, px, py, pz);
            }
            posAttr.needsUpdate = true;
        }

        butterflies.forEach(b => {
            const bTime = time * 1.8 + b.userData.timeOffset;
            const r = b.userData.radius;
            b.position.x = b.userData.center.x + Math.sin(bTime) * r;
            b.position.z = b.userData.center.z + Math.cos(bTime * 0.8) * r;
            b.position.y = getTerrainHeight(b.position.x, b.position.z) + 1.2 + Math.sin(bTime * 3) * 0.4;
            b.rotation.y = -bTime + Math.PI / 2;

            const wingAngle = Math.sin(time * 26) * 0.75;
            b.userData.leftWing.rotation.y = wingAngle;
            b.userData.rightWing.rotation.y = -wingAngle;
        });

        // 1. 天空穹顶中心跟随镜头视角
        if (skyDomeMesh && camera) {
            skyDomeMesh.position.copy(camera.position);
        }

        // 2. 湖泊清澈水面微澜起伏
        activeWaterMeshes.forEach(wm => {
            wm.position.y = Math.sin(time * 2.2 + wm.position.x * 0.1) * 0.05;
        });

        // 3. 动态更新野生动物群落 (鸟、羊、鸡、猫、蛇) 与自然音效
        updateFauna(delta, time);

        // 4. 动态天气系统（阴雨、下雪、天晴、大雾、雷雨云朵与闪电 + 自动随机切换）
        weatherCloudGroups.forEach(cloud => {
            const speed = (cloud.userData && cloud.userData.driftSpeed) ? cloud.userData.driftSpeed : 0.6;
            const mult = (currentWeatherKey === 'thunderstorm') ? 2.4 : (currentWeatherKey === 'rain' ? 1.6 : 1.0);
            cloud.position.x += delta * speed * mult;
            if (cloud.position.x > charPos.x + 85) {
                cloud.position.x = charPos.x - 85;
                cloud.position.z = charPos.z + (Math.random() - 0.5) * 140;
            }
        });

        if (rainParticleSystem && rainParticleSystem.visible) {
            const rPos = rainParticleSystem.geometry.attributes.position;
            const fallSpeed = (currentWeatherKey === 'thunderstorm') ? 28 : 20;
            rainParticleSystem.position.set(charPos.x, 0, charPos.z);
            for (let i = 0; i < rPos.count; i += 2) {
                let x0 = rPos.getX(i);
                let y0 = rPos.getY(i) - fallSpeed * delta;
                let z0 = rPos.getZ(i);
                if (y0 < -1) {
                    x0 = (Math.random() - 0.5) * 46;
                    y0 = 22 + Math.random() * 4;
                    z0 = (Math.random() - 0.5) * 46;
                }
                rPos.setXYZ(i, x0, y0, z0);
                rPos.setXYZ(i + 1, x0 - 0.14, y0 - 0.85, z0);
            }
            rPos.needsUpdate = true;
        }

        if (snowParticleSystem && snowParticleSystem.visible) {
            const sPos = snowParticleSystem.geometry.attributes.position;
            const sOff = snowParticleSystem.userData.offsets;
            snowParticleSystem.position.set(charPos.x, 0, charPos.z);
            for (let i = 0; i < sPos.count; i++) {
                let sx = sPos.getX(i) + Math.sin(time * 1.4 + sOff[i]) * delta * 0.9;
                let sy = sPos.getY(i) - 2.6 * delta;
                let sz = sPos.getZ(i) + Math.cos(time * 1.1 + sOff[i]) * delta * 0.7;
                if (sy < -1) {
                    sx = (Math.random() - 0.5) * 46;
                    sy = 21 + Math.random() * 3;
                    sz = (Math.random() - 0.5) * 46;
                }
                sPos.setXYZ(i, sx, sy, sz);
            }
            sPos.needsUpdate = true;
        }

        if (lightningVisibleTimer > 0) {
            lightningVisibleTimer -= delta;
            if (lightningVisibleTimer <= 0 && lightningBoltMesh) {
                lightningBoltMesh.visible = false;
            }
        }
        if (lightningFlashIntensity > 0) {
            lightningFlashIntensity = Math.max(0, lightningFlashIntensity - delta * 6.5);
            const cfg = WEATHER_CONFIGS[currentWeatherKey] || WEATHER_CONFIGS.sunny;
            const mood = MOODS[currentMoodIdx] || MOODS[0];
            const is2D = (currentRenderStyle === '2d');
            if (sunLight) {
                const baseSun = is2D ? mood.sunIntensity * 1.35 : mood.sunIntensity;
                sunLight.intensity = baseSun * ambientIntensityMultiplier * cfg.sunMult + lightningFlashIntensity;
            }
            if (hemiLight) {
                hemiLight.intensity = (is2D ? 1.1 : 0.85) * ambientIntensityMultiplier * cfg.hemiMult + lightningFlashIntensity * 0.45;
            }
        }

        if (currentWeatherKey === 'thunderstorm') {
            nextLightningTime -= delta;
            if (nextLightningTime <= 0) {
                nextLightningTime = 4.5 + Math.random() * 6.5;
                triggerLightningStrike();
            }
        }

        if (weatherAutoEnabled && time >= nextWeatherSwitchTime) {
            const candidates = WEATHER_KEYS.filter(k => k !== currentWeatherKey);
            const randomNext = candidates[Math.floor(Math.random() * candidates.length)];
            window.setWeatherMode(randomNext, true);
        }

        const nowSoundMs = performance.now();
        if (nowSoundMs - lastAnimalVoiceTime > 9500) {
            for (let i = 0; i < faunaAnimals.length; i++) {
                const a = faunaAnimals[i];
                if (a.type === 'cat' || a.type === 'chicken' || a.type === 'sheep') {
                    const d = Math.hypot(a.mesh.position.x - charPos.x, a.mesh.position.z - charPos.z);
                    if (d < 8.5) {
                        lastAnimalVoiceTime = nowSoundMs;
                        playAnimalVoice(a.type);
                        break;
                    }
                }
            }
        }
        if (nowSoundMs - lastAmbientThunderTime > 26000) {
            lastAmbientThunderTime = nowSoundMs;
            if (currentWeatherKey === 'thunderstorm' || currentMoodIdx >= 2) {
                playThunderSound();
            }
        }

        const ballDist = Math.round(charPos.distanceTo(ballPos) * 10) / 10;
        const telemetry = document.getElementById('telemetry-badge');
        if (telemetry) {
            const styleLabel = (currentRenderStyle === '2d') ? '2D 三渲二描边' : '3D 写实渲染';
            const wCfg = WEATHER_CONFIGS[currentWeatherKey] || WEATHER_CONFIGS.sunny;
            telemetry.textContent = `${wCfg.icon} ${wCfg.name} · ⚽ ${ballDist}m · ${styleLabel}`;
        }
    }

    function adaptCameraFOV() {
        if (!camera) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (!w || !h || w <= 0 || h <= 0) return;
        const aspect = w / h;
        camera.aspect = aspect;
        if (aspect > 2.05) {
            camera.fov = 48; // 21:9 / 20:9 超宽屏手机自适应视野
        } else if (aspect < 1.45) {
            camera.fov = 62; // 折叠屏展开态 / 平板电脑广角视野
        } else {
            camera.fov = 54; // 标准 16:9 / 18:9 黄金视野
        }
        camera.updateProjectionMatrix();
    }

    function updateCameraPosition() {
        if (!camera) return;

        if (!charPos || !isFinite(charPos.x) || !isFinite(charPos.y) || !isFinite(charPos.z)) {
            charPos = new THREE.Vector3(0, 0, 0);
            charPos.y = getTerrainHeight(0, 0) + 0.1;
        }

        if (!isFinite(cameraYaw)) cameraYaw = 0;
        if (!isFinite(cameraPitch)) cameraPitch = 0.28;
        if (!isFinite(cameraDistance) || cameraDistance < 1.0) cameraDistance = 5.2;

        const target = new THREE.Vector3(charPos.x, charPos.y + 1.35, charPos.z);

        const cx = Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;
        const cy = Math.sin(cameraPitch) * cameraDistance;
        const cz = Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;

        camera.position.set(target.x + cx, target.y + cy, target.z + cz);

        const groundH = getTerrainHeight(camera.position.x, camera.position.z);
        const camGroundY = (isFinite(groundH) ? groundH : 0) + 0.45;
        if (camera.position.y < camGroundY) {
            camera.position.y = camGroundY;
        }

        camera.lookAt(target);
    }

    window.addEventListener('resize', () => {
        if (!renderer) return;
        const width = window.innerWidth;
        const height = window.innerHeight;
        if (!width || !height || width <= 0 || height <= 0) return;

        const maxDPR = isTurboRenderEnabled ? 1.5 : 1.0;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDPR));
        renderer.setSize(width, height);
        adaptCameraFOV();

        if (isStudioActive) {
            const studioContainer = document.getElementById('studio-canvas-container');
            if (studioContainer && studioCamera) {
                const w = Math.max(1, studioContainer.clientWidth || width);
                const h = Math.max(1, studioContainer.clientHeight || height);
                studioCamera.aspect = w / h;
                studioCamera.updateProjectionMatrix();
            }
            updateJointsDOM();
        }
    });

    let isAppLifecyclePaused = false;
    window.setAppLifecyclePaused = function (paused) {
        isAppLifecyclePaused = !!paused;
        try {
            if (isAppLifecyclePaused) {
                stopMusicLoop();
                if (audioCtx && audioCtx.state === 'running' && typeof audioCtx.suspend === 'function') {
                    audioCtx.suspend();
                }
            } else {
                if (audioCtx && audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
                    audioCtx.resume();
                }
                if (audioCtx && soundEnabled && bgmEnabled && !musicTimer && !customBgmSource) {
                    startMusicLoop();
                }
                if (clock) clock.getDelta();
                if (renderer && window.innerWidth > 0 && window.innerHeight > 0) {
                    const maxDPR = isTurboRenderEnabled ? 1.5 : 1.0;
                    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDPR));
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    adaptCameraFOV();
                }
            }
        } catch (e) {}
    };

    function animate() {
        requestAnimationFrame(animate);
        if (isAppLifecyclePaused) return;
        const delta = Math.min(clock.getDelta(), 0.05);

        try {
            if (renderer && renderer.getContext) {
                const gl = renderer.getContext();
                if (gl && typeof gl.isContextLost === 'function' && gl.isContextLost()) {
                    return;
                }
            }

            const winW = window.innerWidth;
            const winH = window.innerHeight;
            if (!winW || !winH || winW <= 0 || winH <= 0) return;

            if (isStudioActive) {
                studioAnimTime += delta;
                if (studioCamera) {
                    const target = new THREE.Vector3(0, 0.88, 0);
                    const cx = Math.sin(studioCameraYaw) * Math.cos(studioCameraPitch) * studioCameraDist;
                    const cy = Math.sin(studioCameraPitch) * studioCameraDist;
                    const cz = Math.cos(studioCameraYaw) * Math.cos(studioCameraPitch) * studioCameraDist;
                    studioCamera.position.set(target.x + cx, target.y + cy, target.z + cz);
                    studioCamera.lookAt(target);
                }

                if (studioCategory === 'character' && studioCurrentRiggedModel && studioMode === 'preview') {
                    evaluateMixamoAnimation(studioCurrentRiggedModel, studioAnimState, studioAnimTime);
                } else if (studioCategory === 'animal' && studioModelRoot) {
                    const sway = Math.sin(studioAnimTime * 2.5) * 0.04;
                    studioModelRoot.position.y = Math.abs(sway);
                    studioModelRoot.rotation.y += delta * 0.4;
                } else if (studioCategory === 'environment' && studioModelRoot) {
                    studioModelRoot.rotation.y += delta * 0.45;
                }

                const studioContainer = document.getElementById('studio-canvas-container');
                if (renderer && studioScene && studioCamera && studioContainer) {
                    const rect = studioContainer.getBoundingClientRect();
                    const vx = Math.max(0, Math.floor(rect.left));
                    const vw = Math.max(1, Math.min(winW - vx, Math.floor(rect.width)));
                    const vh = Math.max(1, Math.min(winH, Math.floor(rect.height)));
                    const vy = Math.max(0, Math.floor(winH - rect.bottom));

                    if (vw > 0 && vh > 0 && Math.abs(studioCamera.aspect - (vw / vh)) > 0.002) {
                        studioCamera.aspect = vw / vh;
                        studioCamera.updateProjectionMatrix();
                    }

                    renderer.setScissorTest(false);
                    renderer.setViewport(0, 0, winW, winH);
                    renderer.setClearColor(0x07090e, 1);
                    renderer.clear(true, true, false);

                    renderer.setScissorTest(true);
                    renderer.setScissor(vx, vy, vw, vh);
                    renderer.setViewport(vx, vy, vw, vh);
                    renderer.render(studioScene, studioCamera);
                    renderer.setScissorTest(false);
                    renderer.setViewport(0, 0, winW, winH);
                }
            } else {
                updateGame(delta);
                if (renderer && scene && camera) {
                    const mood = MOODS[currentMoodIdx] || MOODS[0];
                    renderer.setScissorTest(false);
                    renderer.setViewport(0, 0, winW, winH);
                    renderer.setClearColor(mood.skyColor, 1);
                    renderer.render(scene, camera);
                }
            }
        } catch (frameErr) {
            console.error("Render loop recovered from frame error:", frameErr);
            if (renderer) renderer.setScissorTest(false);
        }

        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
            currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
            frameCount = 0;
            lastFpsTime = now;

            const calls = (renderer.info && renderer.info.render) ? renderer.info.render.calls : 0;
            const tris = (renderer.info && renderer.info.render) ? renderer.info.render.triangles : 0;

            if (window.AndroidBridge && typeof window.AndroidBridge.onWebGLTelemetry === 'function') {
                try {
                    window.AndroidBridge.onWebGLTelemetry(hardwareGpuName, currentFps, calls, tris);
                } catch (e) {}
            }

            const telemetry = document.getElementById('telemetry-badge');
            if (telemetry) {
                const styleLabel = (currentRenderStyle === '2d') ? '2D 三渲二' : '3D 写实';
                telemetry.textContent = `⚡ 本地GPU算力: ${currentFps} FPS · ${hardwareGpuName} · ${styleLabel}`;
            }
        }
    }

    function startApp() {
        initScene();
        setupControls();
        initModelStudio();
        animate();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }

})();
