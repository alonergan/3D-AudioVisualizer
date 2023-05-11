/**
 * 3D Audio Visualizer
 */
import * as THREE from 'three';
import * as NOISE from 'simplex-noise';

let scene, camera, renderer, light, mesh, meshRadius; // threeJS objects
let audioContext, audioElement, source, gainNode, analyserNode, noise; // Web Audio API objects
let playButton, gainSlider; // Audio controls
let bufferLength, dataArray; // Sound data storage
let container;

function main() {
    // Setup audio and audio controls
    initAudio();
    initControls();

    // Initialize threeJS objects
    initScene();
    initObject();

    // Render scene
    render();
}

/**
 * Initializes threeJS scene with no object
 */
function initScene() {
    // Renderer
    container = document.querySelector("#visCanvas");
    renderer = new THREE.WebGLRenderer({canvas: container, antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color('grey');

    // Camera
    camera = new THREE.PerspectiveCamera(
        70,  // FOV
        container.clientWidth / container.clientHeight,   // Aspect Ratio
        0.1, // Near
        100, // Far
    );
    camera.position.set(0, 0, 20);

    // Lights
    light = new THREE.AmbientLight('white', 1);
    light.position.set(0, 10, -5);

    scene.add(camera, light);
}

/**
 * Initializes threeJS 3D display mesh
 */
function initObject() {
    const geometry = new THREE.IcosahedronGeometry(6, 6);
    const material = new THREE.MeshLambertMaterial({color: 'blue', wireframe: true});
    mesh = new THREE.Mesh(geometry, material);
    meshRadius = 6;
    
    scene.add(mesh);
}

/**
 * Initializes audio graph nodes
 */
function initAudio() {
    // First things first initialize an AudioContext
    audioContext = new AudioContext();
  
    // Give the audio context a sound source
    audioElement = document.querySelector("#audioFile");
  
    // Pass this audio source into the AudioContext
    source = audioContext.createMediaElementSource(audioElement);
  
    // Connect this audio to its destination (computer speakers in this case)
    source.connect(audioContext.destination); // Now audio graph looks like:   [Source] -> [Destination]
  
    // To modify the audio signal we need a node inbetween the source and destination
    gainNode = audioContext.createGain();
    source.connect(gainNode).connect(audioContext.destination); // [Source] -> [Gain Node] -> [Destination]
  
    // Now to analyze the audio signal we need another node
    analyserNode = audioContext.createAnalyser();
    source.connect(gainNode).connect(analyserNode).connect(audioContext.destination); // [Source] -> [Gain Node] -> [Analyser Node] -> [Destination]
  
    // Set up analyser
    analyserNode.fftSize = 2048; // Default: 2048
    bufferLength = analyserNode.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    // Set up noise
    noise = new NOISE.createNoise3D();
}

/**
 * Initializes audio controls
 */
function initControls() {
    // Play/Pause Button
    playButton = document.querySelector("#playButton");
  
    playButton.addEventListener(
      "click",
      () => {
        if (audioContext.state === "suspended") {
          audioContext.resume();
        }
  
        if (playButton.dataset.playing === "false") {
          audioElement.play();
          playButton.dataset.playing = "true";
        } else if (playButton.dataset.playing === "true") {
          audioElement.pause();
          playButton.dataset.playing = "false";
        }
      },
      false
    );
  
    // Add listener to audio element to update button on song end
    audioElement.addEventListener(
      "ended",
      () => {
        playButton.dataset.playing = "false";
      },
      false
    );
  
    // Gain control slider
    gainSlider = document.querySelector("#gainSlider");
  
    gainSlider.addEventListener(
      "input",
      () => {
        gainNode.gain.value = gainSlider.value;
      },
      false
    )
}

/**
 * Gets audio data for current frame and morphs object
 */
function induceChange() {
    // Get levels for frame
    analyserNode.getByteFrequencyData(dataArray);

    // Split into frequencies and get averages
    const firstHalf = dataArray.slice(0, (dataArray.length / 2) - 1);
    const secondHalf = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);
    const firstAvg = getAverage(firstHalf);
    const secondAvg = getAverage(secondHalf);

    // Morph mesh
    morphMesh();
}

/**
 * Morphs display mesh
 */
function morphMesh(bassAvg, trebleAvg) {
    // Rotate mesh
    mesh.rotation.y += .005;

    // Update vertices based on audio data
    const bassFrequency = modulateSignal(bassAvg, 0, 1, 0, 8);
    const trebleFrequency = modulateSignal(trebleAvg, 0, 1, 0, 4);

    // Compute new vertices
    const normals = mesh.geometry.getAttribute("normal");
    const vertices = mesh.geometry.getAttribute("position");
    
    for (let i = 0; i < vertices.count; i ++) {
        // Get variables for morphing
        let x = vertices.getX(i);
        let y = vertices.getY(i);
        let z = vertices.getZ(i);
        const amplitude = 5;
        const time = window.performance.now();
        const rf = 0.00001;

        // Calculate new distance
        const distance = (meshRadius + bassFrequency) + noise(x + time * rf * 4, y + time * rf * 6, z + time * rf * 7) * amplitude * trebleFrequency * 2;

        // Update vertices
        x = normals[i] * distance;
        y = normals[i + 1] * distance;
        z = normals[i + 2] * distance;

        // Set Vertices
        vertices.setXYZ(i, x, y, z);
    }
    // Update mesh
    vertices.needsUpdate = true;
    
}

/**
 * Modulates signal from analyzerNode
 */
function modulateSignal(signal, min, max, outMin, outMax) {
    // Fractionate signal
    const fraction = (signal - min) / (max - min);
    
    // Get delta
    const d = outMax - outMin;

    return (outMin + (fraction * d));
}

/**
 * Gets array average
 */
function getAverage(array) {
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
        sum += array.ge;
    }
    return (sum / array.length);
}

/**
 * Renders frame
 */
function render() {
    requestAnimationFrame(render);
    induceChange();
    renderer.render(scene, camera);
}

main();