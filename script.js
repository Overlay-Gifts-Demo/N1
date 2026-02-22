/**
 * JEWELS-AI | FAST AR VIDEO ENGINE
 * Optimized for speed + first frame thumbnail + smooth AR startup
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

let isPlaying = false;
let arStarted = false;

/* ===============================
   OPTIMIZED CHROMA KEY SHADER
================================ */
AFRAME.registerShader('chromakey', {
  schema: {
    src: { type: 'map' },
    color: { type: 'color', default: '#00FF00' },
    threshold: { type: 'number', default: 0.3 },
    smoothness: { type: 'number', default: 0.05 }
  },

  init: function (data) {
    const videoTexture = new THREE.VideoTexture(data.src);

    // PERFORMANCE BOOST SETTINGS
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;
    videoTexture.generateMipmaps = false;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: videoTexture },
        keyColor: { value: new THREE.Color(data.color) },
        similarity: { value: data.threshold },
        smoothness: { value: data.smoothness }
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
  }
});

/* ===============================
   GOOGLE DRIVE FAST LOADER
================================ */
async function loadDriveVideo() {
  try {
    if (toast) toast.textContent = "Connecting to Drive...";

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType='video/mp4'&fields=files(id,name)&key=${API_KEY}`
    );

    const data = await response.json();

    if (!data.files || data.files.length === 0) {
      if (toast) toast.textContent = "No MP4 found.";
      return;
    }

    const fileId = data.files[0].id;

    const streamUrl =
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;

    videoEl.src = streamUrl;
    videoEl.preload = "metadata";

    /* ===============================
       FIRST FRAME THUMBNAIL FIX
    ================================ */
    videoEl.addEventListener("loadeddata", async () => {

      // Force render first frame
      videoEl.currentTime = 0.01;

      if (toast) toast.textContent = "Video Ready ✔";

      // Start AR only after video is decoded
      if (!arStarted) {
        const sceneEl = document.querySelector("a-scene");
        await sceneEl.systems["mindar-image-system"].start();
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
   AR TARGET EVENTS
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
        await videoEl.play();
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