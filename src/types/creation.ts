// Types for the 3D Creation workspace

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus';

export interface SceneObject {
  id: string;
  name: string;
  type: 'primitive' | 'imported';
  primitiveType?: PrimitiveType;
  assetId?: string; // Reference to creation_assets for imported STLs
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  visible: boolean;
  color: string;
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
