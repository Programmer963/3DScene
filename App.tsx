import React from "react";
import { useEffect, useState, useMemo } from "react";
import { View, PanResponder, Platform } from 'react-native';
import { GLView } from "expo-gl";
import { Renderer, THREE } from "expo-three";
import { GridHelper, PerspectiveCamera, Scene, CubeTextureLoader } from "three";

const moveSpeed = 0.2;
const rotateSpeed = 0.05;
const cameraInitialPosition = { x: 0, y: 2, z: 10 };

const place = "Park2";
const format = "jpg"; 

const textureUrls = [
    `./textures/cube/${place}/posx.${format}`, 
    `./textures/cube/${place}/negx.${format}`, 
    `./textures/cube/${place}/posy.${format}`, 
    `./textures/cube/${place}/negy.${format}`, 
    `./textures/cube/${place}/posz.${format}`, 
    `./textures/cube/${place}/negz.${format}` 
];

const environmentTexture = new CubeTextureLoader().load(textureUrls);

function createSphere() {
  const geometry = new THREE.SphereGeometry();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.1,
    envMap: environmentTexture,
    envMapIntensity: 1
  });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.y = 2;
  sphere.castShadow = true;
  sphere.receiveShadow = true;

  return sphere;
}

function createPlane() {
  const geometry = new THREE.PlaneGeometry(25, 25);
  const material = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    side: THREE.DoubleSide
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = Math.PI / 2;
  plane.receiveShadow = true;
  plane.castShadow = false;

  return plane;
}

function createGrid() {
  const grid = new THREE.GridHelper(25, 25);
  // grid.receiveShadow = true;
  
  return grid;
}

function createRedCube() {
  const geometry = new THREE.BoxGeometry(1,1,1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    roughness: 1,
    metalness: 0
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(0, 0.5, 0);
  cube.castShadow = true;
  cube.receiveShadow = true;

  return cube;
}

function createMetalCone() {
  const geometry = new THREE.ConeGeometry(0.5, 1, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    metalness: 1,
    roughness: 0.1,
    envMap: environmentTexture,
    envMapIntensity: 1
  })

  const cone = new THREE.Mesh(geometry, material);
  cone.position.set(2, 0.5, 0);
  cone.castShadow = true;
  cone.receiveShadow = true;

  return cone;
}

export default function App() {
  const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
  
  const sphere = createSphere();
  const plane = createPlane();
  const grid = createGrid();
  const redCube = createRedCube();
  const metalCone = createMetalCone();

  const group = new THREE.Group();
  group.add(sphere);
  group.add(plane);
  group.add(grid);
  group.add(redCube);
  group.add(metalCone);

  let rotationX = 0;
  let rotationY = 0;
  const radius = camera.position.distanceTo(sphere.position) + 10;
  
  const rotateCamera = (deltaX: number, deltaY: number) => {
    rotationX += deltaX;
    rotationY += deltaY;

    rotationY = Math.max(-1 * Math.PI / 2, Math.min(Math.PI / 2, rotationY));

    camera.position.x = radius * Math.cos(rotationY) * Math.sin(rotationX);
    camera.position.y = radius * Math.sin(rotationY);
    camera.position.z = radius * Math.cos(rotationY) * Math.cos(rotationX);

    camera.lookAt(sphere.position);
  };

  const [isTouchInput, setIsTouchInput] = useState(false);

  useEffect(() => {
    const checkInputType = () => {
      if (Platform.OS === "web") {
        const touchTest = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gamepadActive = Array.from(gamepads).some(gamepad => gamepad && gamepad.connected);

        if (gamepadActive) {
          setIsTouchInput(false);
        } else {
          setIsTouchInput(touchTest);
        }
      } else {
        setIsTouchInput(true);
      }
    }
    checkInputType();
    window.onresize = () => checkInputType;
    return () => {
      window.onresize = null;
    }
  },[]);

  const move = (deltaX: number, deltaY: number) => {
    group.position.x += deltaX;
    group.position.y += deltaY;
  }

  useEffect(() => {
    function handleGamepadInput() {
      if (!isTouchInput) {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gamepadFound = false;

        for (const gamepad of gamepads) {
          if (!gamepad) continue;

          const { axes } = gamepad;

          gamepadFound = true;

          const moveDeltaX = axes[0] * moveSpeed;
          const moveDeltaY = axes[1] * moveSpeed;
          move(moveDeltaX, moveDeltaY);

          if (axes[2] || axes[3]) {
            rotateCamera(axes[2] * rotateSpeed, axes[3] * rotateSpeed);
          }
        }
      }
    }
    const intervalId = setInterval(handleGamepadInput, 25);
    return () => {
      clearInterval(intervalId);
    }
  }, [isTouchInput])

  const panResponder = useMemo(() => 
    PanResponder.create({
      onMoveShouldSetPanResponder: () => isTouchInput,
      onPanResponderMove: (event, gestureState) => {
        if (!isTouchInput) return;
        const { dx, dy } = gestureState;
        const rotateSpeed = 0.0005;
        rotateCamera(dx * rotateSpeed, dy * rotateSpeed);
      }
    }), [isTouchInput]);

  return (
    <View style={{flex: 1}} {...panResponder.panHandlers}> 
      <GLView
        style={{flex: 1}}
        onContextCreate={async (gl) => {
          const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

          const renderer = new Renderer({gl});
          renderer.setSize(width,height);
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;

          const scene = new Scene();
          scene.background = environmentTexture;

          const ambientLight = new THREE.AmbientLight(0xcccccc, 0.2); 
          scene.add(ambientLight);

          const directionalLight = new THREE.DirectionalLight(0xcccccc, 1); 
          directionalLight.castShadow = true; 
          directionalLight.position.set(10, 10, 10); 
          directionalLight.shadow.mapSize.width = 1024;  
          directionalLight.shadow.mapSize.height = 1024;
          directionalLight.shadow.camera.near = 0.5;   
          directionalLight.shadow.camera.far = 500;
          directionalLight.shadow.camera.left = -10;
          directionalLight.shadow.camera.right = 10;
          directionalLight.shadow.camera.top = 10;
          directionalLight.shadow.camera.bottom = -10;
          scene.add(directionalLight);

          scene.add(group);
          scene.castShadow = true;
          scene.receiveShadow = true;

          camera.position.set(
            cameraInitialPosition.x,
            cameraInitialPosition.y,
            cameraInitialPosition.z
          );

          const render = () => {
            requestAnimationFrame(render);
            renderer.render(scene, camera);
            gl.endFrameEXP();
          }
          render();
        }}
      />
    </View>
  );
}
