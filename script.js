/**
 * JEWELS-AI | Professional Google Drive AR Video Script
 * Fixed: No blue screen, no black box before play.
 */

// --- CONFIGURATION ---
const API_KEY = "AIzaSyC35sqqZA1YaxZ-F4PJaDqQpKBxPyMKOzw";
const FOLDER_ID = "1fDj4lVzWcrXJnIQnljrC4-_SBEEV1dlz";

const videoEl = document.querySelector('#driveVideo');
const videoDisplay = document.querySelector('#videoDisplay');
const buttonsContainer = document.querySelector('#planButtons');
const toggleButton = document.querySelector('#toggleButton');
const target = document.querySelector('#target1');

let isPlaying = false;

// --- 1. CHROMA KEY SHADER ---
AFRAME.registerShader('chromakey', {
  schema: {
    src: {type: 'map'},
    color: {type: 'color', default: '#00FF00'},
    threshold: {type: 'number', default: 0.3},
    smoothness: {type: 'number', default: 0.05}
  },
  init: function(data) {
    const videoTexture = new THREE.VideoTexture(data.src);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tex: {value: videoTexture},
        keyColor: {value: new THREE.Color(data.color)},
        similarity: {value: data.threshold},
        smoothness: {value: data.smoothness}
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
          
          // Smoothly remove green background
          float alpha = smoothstep(similarity, similarity + smoothness, dist);
          
          // Discard pixels if outside circle or matching green key
          if (alpha < 0.1 || dToCenter > 0.5) {
            discard;
          }
          gl_FragColor = vec4(videoColor.rgb, alpha);
        }
      `,
      transparent: true
    });
  }
});

// --- 2. GOOGLE DRIVE LOADER ---
async function loadDriveVideo() {
  try {
    // List files in the folder to find the MP4
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType='video/mp4'&key=${API_KEY}`
    );
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      const fileId = data.files[0].id;
      // Use the alt=media parameter for direct video streaming
      const streamUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
      
      videoEl.src = streamUrl;
      videoEl.load();
    } else {
      console.error("No MP4 files found in the Drive folder.");
    }
  } catch (error) {
    console.error("Google Drive Fetch Error:", error);
  }
}

// --- 3. AR EVENT LISTENERS & UI ---
target.addEventListener('targetFound', () => {
  buttonsContainer.style.display = 'block';
});

target.addEventListener('targetLost', () => {
  buttonsContainer.style.display = 'none';
  videoEl.pause();
  isPlaying = false;
  // Immediately hide the display to prevent seeing a frozen black frame
  videoDisplay.setAttribute('visible', false);
  toggleButton.textContent = "▶️ Play Video";
});

toggleButton.addEventListener('click', async () => {
  if (!isPlaying) {
    try {
      await videoEl.play();
      isPlaying = true;
      toggleButton.textContent = "⏸ Pause Video";
      
      // Delay showing the circle by 150ms to ensure the first frame is ready
      setTimeout(() => {
        videoDisplay.setAttribute('visible', true);
      }, 150);
      
    } catch (err) {
      console.error("Video playback failed:", err);
    }
  } else {
    videoEl.pause();
    isPlaying = false;
    // Hide the display when paused to keep the look clean
    videoDisplay.setAttribute('visible', false);
    toggleButton.textContent = "▶️ Play Video";
  }
});

// Disable right-click for a cleaner app experience
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Start the loading process
loadDriveVideo();