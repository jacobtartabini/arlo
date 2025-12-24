import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { SceneObject, PrimitiveType, ExportFormat } from '@/types/creation';

export function createPrimitiveGeometry(type: PrimitiveType): THREE.BufferGeometry {
  switch (type) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 32, 32);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, 32);
    case 'torus':
      return new THREE.TorusGeometry(0.5, 0.2, 16, 100);
    case 'capsule':
      return new THREE.CapsuleGeometry(0.3, 0.6, 16, 32);
    case 'roundedBox':
      // Create a box and bevel it slightly (simplified)
      return new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
    case 'pyramid':
      return new THREE.ConeGeometry(0.5, 1, 4);
    case 'plane':
      return new THREE.PlaneGeometry(1, 1, 1, 1);
    case 'tube':
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.5, 0, 0),
        new THREE.Vector3(0, 0.3, 0),
        new THREE.Vector3(0.5, 0, 0)
      ]);
      return new THREE.TubeGeometry(path, 20, 0.1, 8, false);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(0.4, 0.1, 100, 16);
    case 'lathe':
      const points: THREE.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        points.push(new THREE.Vector2(Math.sin(i * 0.2) * 0.3 + 0.1, (i - 5) * 0.1));
      }
      return new THREE.LatheGeometry(points);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

function createSceneMeshes(objects: SceneObject[]): THREE.Scene {
  const scene = new THREE.Scene();

  objects.forEach(obj => {
    if (!obj.visible) return;
    if (obj.type === 'group') return;
    if (obj.type !== 'primitive' || !obj.primitiveType) return;

    const geometry = createPrimitiveGeometry(obj.primitiveType);
    const material = new THREE.MeshStandardMaterial({ color: obj.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = obj.name;

    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);

    scene.add(mesh);
  });

  return scene;
}

export function exportObjectsToSTL(objects: SceneObject[], filename: string = 'export.stl', binary: boolean = false): void {
  if (objects.length === 0) {
    console.warn('No objects to export');
    return;
  }

  const scene = createSceneMeshes(objects);
  const exporter = new STLExporter();

  const result = exporter.parse(scene, { binary });
  
  // Download the file
  const blob = new Blob([result as BlobPart], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.stl') ? filename : `${filename}.stl`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportObjectsToGLTF(objects: SceneObject[], filename: string = 'export', binary: boolean = true): void {
  if (objects.length === 0) {
    console.warn('No objects to export');
    return;
  }

  const scene = createSceneMeshes(objects);
  const exporter = new GLTFExporter();

  exporter.parse(
    scene,
    (result) => {
      let blob: Blob;
      let extension: string;
      
      if (binary) {
        blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
        extension = '.glb';
      } else {
        blob = new Blob([JSON.stringify(result)], { type: 'application/json' });
        extension = '.gltf';
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename + extension;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    (error) => {
      console.error('GLTF export failed:', error);
    },
    { binary }
  );
}

export function exportSingleObjectToSTL(object: SceneObject, filename?: string): void {
  const name = filename || `${object.name.replace(/\s+/g, '_')}.stl`;
  exportObjectsToSTL([object], name);
}

export function exportObjects(
  objects: SceneObject[], 
  filename: string, 
  format: ExportFormat
): void {
  switch (format) {
    case 'stl':
      exportObjectsToSTL(objects, filename, false);
      break;
    case 'stl-binary':
      exportObjectsToSTL(objects, filename, true);
      break;
    case 'gltf':
      exportObjectsToGLTF(objects, filename, false);
      break;
    case 'glb':
      exportObjectsToGLTF(objects, filename, true);
      break;
  }
}
