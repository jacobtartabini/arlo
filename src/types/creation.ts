// Types for the 3D Creation workspace

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type PrimitiveType = 
  | 'box' 
  | 'sphere' 
  | 'cylinder' 
  | 'cone' 
  | 'torus'
  | 'capsule'
  | 'roundedBox'
  | 'pyramid'
  | 'plane'
  | 'tube'
  | 'torusKnot'
  | 'lathe';

export interface SceneObject {
  id: string;
  name: string;
  type: 'primitive' | 'imported' | 'group';
  primitiveType?: PrimitiveType;
  assetId?: string; // Reference to creation_assets for imported STLs
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  visible: boolean;
  locked: boolean;
  color: string;
  groupId?: string; // Parent group ID if part of a group
  children?: string[]; // Child object IDs if this is a group
}

export interface SceneState {
  objects: SceneObject[];
  cameraPosition?: Vector3;
  cameraTarget?: Vector3;
}

export interface CreationProject {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreationAsset {
  id: string;
  project_id: string;
  file_path: string;
  original_name: string;
  created_at: string;
}

export interface CreationSceneState {
  project_id: string;
  state_json: SceneState;
  updated_at: string;
}

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type ViewMode = 'solid' | 'wireframe';
export type CameraPreset = 'top' | 'front' | 'side' | 'isometric';
export type ExportFormat = 'stl' | 'stl-binary' | 'gltf' | 'glb';
export type ExportScope = 'selected' | 'all';

export interface SnapSettings {
  enabled: boolean;
  translateSnap: number; // in mm
  rotateSnap: number; // in degrees
}

export interface MeasurePoint {
  position: Vector3;
  label: string;
}

export interface Measurement {
  point1: Vector3;
  point2: Vector3;
  distance: number;
}

export interface HistoryEntry {
  sceneState: SceneState;
  description: string;
  timestamp: number;
}

export interface BoundingBoxInfo {
  width: number;
  height: number;
  depth: number;
  center: Vector3;
}

export type BooleanOperation = 'union' | 'subtract' | 'intersect';

export interface MeasureTool {
  active: boolean;
  point1: Vector3 | null;
  point2: Vector3 | null;
  distance: number | null;
}
