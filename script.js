/**
 * JEWELS-AI | FINAL STABLE AR VIDEO ENGINE
 * Production Ready
 */

/* ===============================
   CONFIGURATION
================================ */
const API_KEY = "AIzaSyC35sqqZA1YaxZ-F4PJaDqQpKBxPyMKOzw";
const FOLDER_ID = "1fDj4lVzWcrXJnIQnljrC4-_SBEEV1dlz";

const videoEl = document.querySelector('#driveVideo');
const toast = document.querySelector('#status-toast');
const buttonsContainer = document.querySelector('#planButtons');
const toggleButton = document.querySelector('#toggleButton');
const target = document.querySelector('#target1');
const sceneEl = document.querySelector('a-scene');

let isPlaying = false;
let arStarted = false;


/* ===============================
   CHROMA KEY + CIRCLE SHADER
================================ */
AFRAME.registerShader('chromakey', {

  schema: {
    src: { type: 'map' },
    color: { type: 'color', default: '#00FF00' },
    threshold: { type: 'number', default: 0.3 },
    smoothness: { type: 'number', default: 0.05 }
  },

  init: function (data) {

    this.videoTexture = new THREE.VideoTexture(data.src);
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.generateMipmaps = false;

    this.material = new THREE.ShaderMaterial({

      uniforms: {
        tex: { value: this.videoTexture },
        keyColor: { value: new THREE.Color(data.color) },
        similarity: { value: data.threshold },
        smoothness: { value: data.smoothness }
      },

      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix *
                        modelViewMatrix *
                        vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        uniform sampler2D tex;
        uniform vec3 keyColor;
        uniform float similarity;
        uniform float smoothness;
        varying vec2 vUv;

        void main() {

          vec4 videoColor = texture2D(tex, vUv);

          float dist = distance(videoColor.rgb, keyColor);
          float dToCenter = distance(vUv, vec2(0.5, 0.5));
          float alpha = smoothstep(similarity, similarity + smoothness, dist);

          if (alpha < 0.1 || dToCenter > 0.5) discard;

          gl_FragColor = vec4(videoColor.rgb, alpha);
        }
      `,
      transparent: true
    });
  },

  // 🔥 CRITICAL: prevents black freeze
  tick: function () {
    if (this.videoTexture) {
      this.videoTexture.needsUpdate = true;
    }
  }
});


/* ===============================
   GOOGLE DRIVE VIDEO LOADER
================================ */
async function loadDriveVideo() {

  try {

    if (toast) toast.textContent = "Connecting to Drive...";

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType='video/mp4'&fields=files(id,name)&orderBy=createdTime desc&key=${API_KEY}`
    );

    const data = await response.json();

    if (!data.files || data.files.length === 0) {
      if (toast) toast.textContent = "No MP4 found in Drive folder.";
      return;
    }

    const fileId = data.files[0].id;

    // ✅ IMPORTANT: Use public download link (fix black video)
    videoEl.src = `https://drive.google.com/uc?export=download&id=${fileId}`;
    videoEl.crossOrigin = "anonymous";
    videoEl.muted = true;
    videoEl.preload = "auto";
    videoEl.load();

    videoEl.addEventListener("loadeddata", async () => {

      // Force first frame render
      videoEl.currentTime = 0.01;

      if (toast) toast.textContent = "Video Ready ✔";

      // ✅ Correct MindAR system
      if (!arStarted && sceneEl.systems["mindar-image"]) {
        await sceneEl.systems["mindar-image"].start();
        arStarted = true;
      }

      setTimeout(() => {
        if (toast) toast.style.display = "none";
      }, 2000);

    }, { once: true });

  } catch (error) {

    if (toast) toast.textContent = "Drive Connection Failed.";
    console.error("Drive Error:", error);
  }
}


/* ===============================
   TARGET EVENTS
================================ */
if (target) {

  target.addEventListener("targetFound", () => {
    if (buttonsContainer) buttonsContainer.style.display = "block";
  });

  target.addEventListener("targetLost", () => {

    if (buttonsContainer) buttonsContainer.style.display = "none";

    videoEl.pause();
    isPlaying = false;

    if (toggleButton)
      toggleButton.textContent = "▶️ Play Video";
  });
}


/* ===============================
   PLAY / PAUSE BUTTON
================================ */
if (toggleButton) {

  toggleButton.addEventListener("click", async () => {

    if (!isPlaying) {

      try {
        await videoEl.play();   // play muted first
        videoEl.muted = false;  // unmute after user interaction

        isPlaying = true;
        toggleButton.textContent = "⏸ Pause Video";

      } catch (err) {
        console.error("Playback blocked:", err);
      }

    } else {

      videoEl.pause();
      isPlaying = false;
      toggleButton.textContent = "▶️ Play Video";
    }

  });

}


/* ===============================
   UI PROTECTION
================================ */
document.addEventListener("contextmenu", (e) => e.preventDefault());


/* ===============================
   START ENGINE
================================ */
loadDriveVideo();