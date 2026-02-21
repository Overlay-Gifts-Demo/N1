// ===============================
// JEWELS-AI AR VIDEO ENGINE v2.0
// Aspect Ratio Fixed (No Squash)
// ===============================

// --- 1. CONFIGURATION ---
const API_KEY = "AIzaSyC35sqqZA1YaxZ-F4PJaDqQpKBxPyMKOzw";
const FOLDER_ID = "1fDj4lVzWcrXJnIQnljrC4-_SBEEV1dlz";

const videoEl = document.querySelector('#plan1Video');
const loadingMsg = document.querySelector('#loadingMsg');
const entryBtn = document.querySelector('#entryBtn');
const overlay = document.querySelector('#overlay');
const sceneEl = document.querySelector('a-scene');
const toggleButton = document.querySelector('#toggleButton');
const planButtons = document.querySelector('#planButtons');
const videoDisplay = document.querySelector('#videoDisplay');

let isPlaying = false;

// ===============================
// 2. FETCH LATEST VIDEO FROM DRIVE
// ===============================
async function loadLatestVideo() {

    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'video/'&orderBy=createdTime+desc&fields=files(id,name)&key=${API_KEY}`;

    try {
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();

        if (listData.files && listData.files.length > 0) {

            const fileId = listData.files[0].id;

            videoEl.src = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
            videoEl.load();

            loadingMsg.innerText = "Gift Ready!";
            entryBtn.style.display = "inline-block";

        } else {
            loadingMsg.innerText = "No videos found in Drive.";
        }

    } catch (err) {
        loadingMsg.innerText = "Error: Check Folder Permissions.";
        console.error(err);
    }
}

// ===============================
// 3. PERFECT ASPECT RATIO CIRCLE SHADER
// ===============================
AFRAME.registerShader('perfect-circle-video', {

    schema: { src: { type: 'map' } },

    init: function (data) {

        this.videoTexture = new THREE.VideoTexture(data.src);

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                tex: { value: this.videoTexture },
                aspectRatio: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tex;
                uniform float aspectRatio;
                varying vec2 vUv;

                void main() {

                    vec2 uv = vUv;
                    float videoAspect = aspectRatio;
                    float circleAspect = 1.0;

                    // FIT without distortion
                    if (videoAspect > circleAspect) {
                        float scale = circleAspect / videoAspect;
                        uv.y = (uv.y - 0.5) * scale + 0.5;
                    } else {
                        float scale = videoAspect / circleAspect;
                        uv.x = (uv.x - 0.5) * scale + 0.5;
                    }

                    // Circular mask
                    if (distance(vUv, vec2(0.5, 0.5)) > 0.5) {
                        discard;
                    }

                    gl_FragColor = texture2D(tex, uv);
                }
            `,
            transparent: true
        });
    },

    tick: function () {
        if (this.videoTexture && this.videoTexture.image) {
            this.videoTexture.needsUpdate = true;

            const video = this.videoTexture.image;

            if (video.videoWidth > 0 && video.videoHeight > 0) {
                this.material.uniforms.aspectRatio.value =
                    video.videoWidth / video.videoHeight;
            }
        }
    }
});

// ===============================
// 4. APPLY NEW SHADER TO CIRCLE
// ===============================
videoDisplay.setAttribute(
    'material',
    'shader: perfect-circle-video; src: #plan1Video; transparent: true; side: double;'
);

// ===============================
// 5. AR CONTROLS
// ===============================

entryBtn.addEventListener('click', () => {
    overlay.style.display = 'none';

    if (sceneEl.systems["mindar-image-system"]) {
        sceneEl.systems["mindar-image-system"].start();
    }
});

document.querySelector('#target1').addEventListener('targetFound', () => {
    planButtons.style.display = 'block';
});

document.querySelector('#target1').addEventListener('targetLost', () => {
    planButtons.style.display = 'none';
    videoEl.pause();
    isPlaying = false;
    toggleButton.textContent = "▶️ Play Video";
});

toggleButton.addEventListener('click', async () => {

    if (!isPlaying) {

        videoEl.muted = false;
        await videoEl.play();

        isPlaying = true;
        toggleButton.textContent = "⏸ Pause Video";

    } else {

        videoEl.pause();
        isPlaying = false;
        toggleButton.textContent = "▶️ Play Video";
    }
});

// ===============================
// 6. INITIAL LOAD
// ===============================
loadLatestVideo();