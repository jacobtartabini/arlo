// CSG Boolean Operations using three-bvh-csg
import * as THREE from 'three';
import { Evaluator, Brush, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import { createPrimitiveGeometry } from './stl-exporter';
import type { SceneObject, BooleanOperation } from '@/types/creation';

// Create the CSG evaluator
const csgEvaluator = new Evaluator();

export async function performBooleanOperation(
  objectA: SceneObject,
  objectB: SceneObject,
  operation: BooleanOperation,
  getSTLGeometry?: (assetId: string) => Promise<THREE.BufferGeometry | null>
): Promise<THREE.BufferGeometry | null> {
  try {
    // Get geometry for object A
    let geometryA: THREE.BufferGeometry | null = null;
    if (objectA.type === 'primitive' && objectA.primitiveType) {
      geometryA = createPrimitiveGeometry(objectA.primitiveType);
    } else if (objectA.type === 'imported' && objectA.assetId && getSTLGeometry) {
      geometryA = await getSTLGeometry(objectA.assetId);
    }

    // Get geometry for object B
    let geometryB: THREE.BufferGeometry | null = null;
    if (objectB.type === 'primitive' && objectB.primitiveType) {
      geometryB = createPrimitiveGeometry(objectB.primitiveType);
    } else if (objectB.type === 'imported' && objectB.assetId && getSTLGeometry) {
      geometryB = await getSTLGeometry(objectB.assetId);
    }

    if (!geometryA || !geometryB) {
      console.error('Could not get geometries for CSG operation');
      return null;
    }

    // Clone geometries to avoid modifying originals
    const cloneA = geometryA.clone();
    const cloneB = geometryB.clone();

    // Apply transforms to geometries
    const matrixA = new THREE.Matrix4();
    matrixA.compose(
      new THREE.Vector3(objectA.position.x, objectA.position.y, objectA.position.z),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(objectA.rotation.x, objectA.rotation.y, objectA.rotation.z)
      ),
      new THREE.Vector3(objectA.scale.x, objectA.scale.y, objectA.scale.z)
    );
    cloneA.applyMatrix4(matrixA);

    const matrixB = new THREE.Matrix4();
    matrixB.compose(
      new THREE.Vector3(objectB.position.x, objectB.position.y, objectB.position.z),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(objectB.rotation.x, objectB.rotation.y, objectB.rotation.z)
      ),
      new THREE.Vector3(objectB.scale.x, objectB.scale.y, objectB.scale.z)
    );
    cloneB.applyMatrix4(matrixB);

    // Create brushes for CSG
    const brushA = new Brush(cloneA);
    const brushB = new Brush(cloneB);

    // Determine CSG operation type
    let csgOperation;
    switch (operation) {
      case 'union':
        csgOperation = ADDITION;
        break;
      case 'subtract':
        csgOperation = SUBTRACTION;
        break;
      case 'intersect':
        csgOperation = INTERSECTION;
        break;
      default:
        return null;
    }

    // Perform the operation
    const result = csgEvaluator.evaluate(brushA, brushB, csgOperation);
    
    if (!result || !result.geometry) {
      return null;
    }

    // Center the result
    result.geometry.computeBoundingBox();
    result.geometry.center();

    return result.geometry;
  } catch (error) {
    console.error('CSG operation failed:', error);
    return null;
  }
}
