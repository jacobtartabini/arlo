import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { SceneObject, PrimitiveType } from '@/types/creation';

function createPrimitiveGeometry(type: PrimitiveType): THREE.BufferGeometry {
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
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

export function exportObjectsToSTL(objects: SceneObject[], filename: string = 'export.stl'): void {
  if (objects.length === 0) {
    console.warn('No objects to export');
    return;
  }

  const scene = new THREE.Scene();
  const exporter = new STLExporter();

  objects.forEach(obj => {
    if (!obj.visible) return;
    if (obj.type !== 'primitive' || !obj.primitiveType) return;

    const geometry = createPrimitiveGeometry(obj.primitiveType);
    const material = new THREE.MeshStandardMaterial({ color: obj.color });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);

    scene.add(mesh);
  });

  const stlString = exporter.parse(scene, { binary: false });
  
  // Download the file
  const blob = new Blob([stlString], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.stl') ? filename : `${filename}.stl`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleObjectToSTL(object: SceneObject, filename?: string): void {
  const name = filename || `${object.name.replace(/\s+/g, '_')}.stl`;
  exportObjectsToSTL([object], name);
}
