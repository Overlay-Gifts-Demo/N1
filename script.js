/**
 * JEWELS-AI | Google Drive AR Video Script
 * Handles custom Chroma Key shader, Google Drive API fetching, and MindAR events.
 */

// --- CONFIGURATION ---
const API_KEY = "AIzaSyC35sqqZA1YaxZ-F4PJaDqQpKBxPyMKOzw";
const FOLDER_ID = "1fDj4lVzWcrXJnIQnljrC4-_SBEEV1dlz";

const videoEl = document.querySelector('#driveVideo');
const toast = document.querySelector('#status-toast');
const buttonsContainer = document.querySelector('#planButtons');
const toggleButton = document.querySelector('#toggleButton');
const target = document.querySelector('#target1');

let isPlaying = false;

// --- 1. CUSTOM ROUND CHROMA KEY SHADER ---
// This shader removes the green background and crops the video into a circle
AFRAME.registerShader('chromakey', {
  schema: {
    src: {type: 'map'},
    color: {type: 'color', default: '#00FF00'},
    [cite_start]threshold: {type: 'number', default: 0.3}, [cite: 1]
    [cite_start]smoothness: {type: 'number', default: 0.05} [cite: 1]
  },
  init: function(data) {
    const videoTexture = new THREE.VideoTexture(data.src);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tex: {value: videoTexture},
        [cite_start]keyColor: {value: new THREE.Color(data.color)}, [cite: 3]
        [cite_start]similarity: {value: data.threshold}, [cite: 3]
        [cite_start]smoothness: {value: data.smoothness} [cite: 3]
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
          
          // Circle Crop Logic: Center is 0.5, 0.5
          float dToCenter = distance(vUv, vec2(0.5, 0.5));
          
          [cite_start]// Alpha transition using smoothstep for cleaner edges [cite: 4]
          float alpha = smoothstep(similarity, similarity + smoothness, dist);
          
          [cite_start]// Discard pixels if they match the key color or are outside the circle radius [cite: 5]
          if (alpha < 0.1 || dToCenter > 0.5) {
            discard;
          }
          gl_FragColor = vec4(videoColor.rgb, alpha);
        }
      `,
      transparent: true
    });
  },
  update: function(data) {
    if (this.material) {
      [cite_start]this.material.uniforms.similarity.value = data.threshold; [cite: 7]
      this.material.uniforms.smoothness.value = data.smoothness;
      [cite_start]this.material.uniforms.keyColor.value = new THREE.Color(data.color); [cite: 7]
    }
  }
});

// --- 2. GOOGLE DRIVE INTEGRATION ---
// Fetches the latest MP4 file from your specified folder
async function loadDriveVideo() {
  try {
    if (toast) toast.textContent = "Connecting to Drive...";

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType='video/mp4'&key=${API_KEY}`
    );
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      const fileId = data.files[0].id;
      [cite_start]// Direct media link for streaming [cite: 8]
      const streamUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
      
      videoEl.src = streamUrl;
      videoEl.load();
      
      if (toast) {
        toast.textContent = "Video Linked: " + data.files[0].name;
        setTimeout(() => toast.style.display = 'none', 3000);
      }
    } else {
      if (toast) toast.textContent = "Error: No MP4 found in Drive folder.";
    }
  } catch (error) {
    if (toast) toast.textContent = "Drive Connection Failed.";
    console.error("Drive Fetch Error:", error);
  }
}

// --- 3. UI & AR EVENT LISTENERS ---
target.addEventListener('targetFound', () => {
  buttonsContainer.style.display = 'block';
});

target.addEventListener('targetLost', () => {
  buttonsContainer.style.display = 'none';
  videoEl.pause();
  isPlaying = false;
  toggleButton.textContent = "▶️ Play Video";
});

toggleButton.addEventListener('click', async () => {
  if (!isPlaying) {
    try {
      await videoEl.play();
      isPlaying = true;
      toggleButton.textContent = "⏸ Pause Video";
    } catch (err) {
      console.error("Playback failed:", err);
    }
  } else {
    videoEl.pause();
    isPlaying = false;
    toggleButton.textContent = "▶️ Play Video";
  }
});

// Disable right-click to protect the UI
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Run the Drive loader
loadDriveVideo();