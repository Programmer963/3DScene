
import React from "react";
import { useEffect, useState, useMemo } from "react";
import { View, PanResponder, Platform } from 'react-native';
import { GLView } from "expo-gl";
import { Renderer, THREE } from "expo-three";
import { PerspectiveCamera, Scene, CubeTextureLoader, TextureLoader, PointLight, Vector2, Vector3 } from "three";

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
  const textureLoader = new TextureLoader();
  const waterTexture = textureLoader.load("https://media.istockphoto.com/id/1355902841/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%B0%D0%B1%D1%81%D1%82%D1%80%D0%B0%D0%BA%D1%86%D0%B8%D1%8F-%D0%B3%D0%BE%D0%BB%D1%83%D0%B1%D0%BE%D0%B9-%D0%B2%D0%BE%D0%BB%D0%BD%D1%8B-%D0%B2%D0%BE%D0%B4%D1%8B-%D0%B8%D0%BB%D0%B8-%D0%B5%D1%81%D1%82%D0%B5%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F-%D1%82%D0%B5%D0%BA%D1%81%D1%82%D1%83%D1%80%D0%B0-%D0%BF%D1%83%D0%B7%D1%8B%D1%80%D1%8C%D0%BA%D0%BE%D0%B2-%D0%B3%D0%B5%D0%BB%D0%B5%D0%B2%D0%BE%D0%B5-%D0%BC%D1%8B%D0%BB%D0%BE-%D1%84%D0%BE%D0%BD%D0%BE%D0%B2%D0%B0%D1%8F.jpg?s=612x612&w=0&k=20&c=bSzVCKTWM9lsDTwH-wwXxLB2wOQJcOaR0jgICmvfYVc=");
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Светлый цвет
    side: THREE.DoubleSide,
    map: waterTexture,
    roughness: 0.3,
    metalness: 0.1
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = Math.PI / 2;
  plane.receiveShadow = true;
  plane.castShadow = false;

  return plane;
}

function createRedCube(position: Vector3) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    roughness: 1,
    metalness: 0
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.copy(position);
  cube.castShadow = true;
  cube.receiveShadow = true;

  return cube;
}

function createMetalCone(position: Vector3) {
  const geometry = new THREE.ConeGeometry(0.5, 1, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    metalness: 1,
    roughness: 0.1,
    envMap: environmentTexture,
    envMapIntensity: 1
  })

  const cone = new THREE.Mesh(geometry, material);
  cone.position.copy(position);
  cone.castShadow = true;
  cone.receiveShadow = true;

  return cone;
}

export default function App() {
  const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
  
  const sphere = createSphere();
  const plane = createPlane();
  const redCube1 = createRedCube(new THREE.Vector3(2, 0.5, 0));
  const redCube2 = createRedCube(new THREE.Vector3(-2, 0.5, 0));
  const redCube3 = createRedCube(new THREE.Vector3(0, 0.5, 2));
  const metalCone1 = createMetalCone(new THREE.Vector3(0, 0.5, -2));
  const metalCone2 = createMetalCone(new THREE.Vector3(2, 0.5, 2));
  const metalCone3 = createMetalCone(new THREE.Vector3(-2, 0.5, -2));

  const group = new THREE.Group();
  group.add(sphere);
  group.add(plane);
  group.add(redCube1);
  group.add(redCube2);
  group.add(redCube3);
  group.add(metalCone1);
  group.add(metalCone2);
  group.add(metalCone3);

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

          const pointLight = new PointLight(0xff00ff, 1, 25);
          pointLight.position.set(5, 5, 5);
          scene.add(pointLight);

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
