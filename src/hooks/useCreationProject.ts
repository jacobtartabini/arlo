import { useState, useEffect, useCallback } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import { storageUpload, storageGetSignedUrl } from '@/lib/storage-proxy';
import { supabase } from '@/integrations/supabase/client';
import { useCreationHistory } from './useCreationHistory';
import { performBooleanOperation } from '@/utils/csg-operations';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import type { 
  CreationProject, 
  CreationAsset, 
  SceneState, 
  SceneObject, 
  PrimitiveType,
  Vector3,
  BooleanOperation,
  LabProjectStatus,
} from '@/types/creation';
import { toast } from 'sonner';

// Get user ID from session storage (set by AuthProvider from JWT)
const getUserId = (): string => {
  const userId = sessionStorage.getItem('arlo_user_id');
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
};

const defaultSceneState: SceneState = {
  objects: [],
  cameraPosition: { x: 5, y: 5, z: 5 },
  cameraTarget: { x: 0, y: 0, z: 0 }
};

function normalizeProject(row: CreationProject): CreationProject {
  return {
    ...row,
    description: row.description ?? '',
    status: (row.status as LabProjectStatus) || 'in_progress',
  };
}

export function useCreationProject(projectId: string | undefined) {
  const [currentProject, setCurrentProject] = useState<CreationProject | null>(null);
  const [sceneState, setSceneState] = useState<SceneState>(defaultSceneState);
  const [assets, setAssets] = useState<CreationAsset[]>([]);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // History management
  const { pushState, undo: historyUndo, redo: historyRedo, canUndo, canRedo, reset: resetHistory } = useCreationHistory(defaultSceneState);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      setCurrentProject(null);
      setSceneState(defaultSceneState);
      resetHistory(defaultSceneState);
      setAssets([]);
      setSelectedObjectIds([]);
      return;
    }
    loadProject(projectId);
  }, [projectId]);

  // Track scene changes for history
  const updateSceneWithHistory = useCallback((
    updater: (prev: SceneState) => SceneState,
    description: string
  ) => {
    setSceneState(prev => {
      const newState = updater(prev);
      pushState(newState, description);
      return newState;
    });
  }, [pushState]);

  const undo = useCallback(() => {
    const state = historyUndo();
    if (state) {
      setSceneState(state);
      toast.success('Undone');
    }
  }, [historyUndo]);

  const redo = useCallback(() => {
    const state = historyRedo();
    if (state) {
      setSceneState(state);
      toast.success('Redone');
    }
  }, [historyRedo]);

  const loadProject = async (projectId: string) => {
    try {
      setIsLoading(true);
      
      const projectRes = await dataApiHelpers.select<CreationProject[]>('creation_projects', {
        filters: { id: projectId }
      });
      
      if (projectRes.data && projectRes.data.length > 0) {
        setCurrentProject(normalizeProject(projectRes.data[0]));
      }

      const assetsRes = await dataApiHelpers.select<CreationAsset[]>('creation_assets', {
        filters: { project_id: projectId }
      });
      if (assetsRes.data) {
        setAssets(assetsRes.data);
      }

      const { data: sceneData, error } = await supabase
        .from('creation_scene_state')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (sceneData && !error) {
        const loadedState = sceneData.state_json as unknown as SceneState;
        // Ensure locked property exists for all objects
        loadedState.objects = loadedState.objects.map(obj => ({
          ...obj,
          locked: obj.locked ?? false
        }));
        setSceneState(loadedState);
        resetHistory(loadedState);
      } else {
        setSceneState(defaultSceneState);
        resetHistory(defaultSceneState);
      }

      setSelectedObjectIds([]);

      void dataApiHelpers.update('creation_projects', projectId, {
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (
    name: string = 'Untitled Project',
    opts?: { description?: string; status?: LabProjectStatus }
  ) => {
    try {
      const response = await dataApiHelpers.insert<CreationProject>('creation_projects', {
        name,
        description: opts?.description ?? '',
        status: opts?.status ?? 'in_progress',
        user_id: getUserId()
      });
      
      if (response.data) {
        const p = normalizeProject(response.data as CreationProject);
        toast.success('Project created');
        return p;
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    }
    return null;
  };

  const saveProject = async () => {
    if (!currentProject) {
      toast.error('No project to save');
      return;
    }

    try {
      setIsSaving(true);

      const { data: existing } = await supabase
        .from('creation_scene_state')
        .select('project_id')
        .eq('project_id', currentProject.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('creation_scene_state')
          .update({ state_json: sceneState } as any)
          .eq('project_id', currentProject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creation_scene_state')
          .insert({
            project_id: currentProject.id,
            state_json: sceneState
          } as any);
        if (error) throw error;
      }

      await dataApiHelpers.update('creation_projects', currentProject.id, {
        updated_at: new Date().toISOString()
      });

      toast.success('Project saved');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const updateProjectName = async (name: string) => {
    if (!currentProject) return;

    try {
      await dataApiHelpers.update('creation_projects', currentProject.id, { name });
      setCurrentProject(prev => prev ? { ...prev, name } : null);
    } catch (error) {
      console.error('Failed to update project name:', error);
    }
  };

  const generateId = () => crypto.randomUUID();

  const addPrimitive = (type: PrimitiveType) => {
    const newObject: SceneObject = {
      id: generateId(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${sceneState.objects.length + 1}`,
      type: 'primitive',
      primitiveType: type,
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      locked: false,
      color: '#6366f1'
    };

    updateSceneWithHistory(prev => ({
      ...prev,
      objects: [...prev.objects, newObject]
    }), `Add ${type}`);
    setSelectedObjectIds([newObject.id]);
  };

  const importSTL = async (file: File) => {
    if (!currentProject) {
      toast.error('Open a project in Lab before importing');
      return null;
    }

    try {
      const activeProjectId = currentProject.id;
      const filePath = `${getUserId()}/${activeProjectId}/${Date.now()}_${file.name}`;

      const uploadResult = await storageUpload('creation-assets', filePath, file);
      if (!uploadResult) throw new Error('Upload failed');

      const assetRes = await dataApiHelpers.insert<CreationAsset>('creation_assets', {
        project_id: activeProjectId,
        file_path: filePath,
        original_name: file.name
      });

      if (assetRes.data) {
        const asset = assetRes.data as CreationAsset;
        setAssets(prev => [...prev, asset]);

        const newObject: SceneObject = {
          id: generateId(),
          name: file.name.replace('.stl', ''),
          type: 'imported',
          assetId: asset.id,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: -Math.PI / 2, y: 0, z: 0 },
          scale: { x: 0.01, y: 0.01, z: 0.01 },
          visible: true,
          locked: false,
          color: '#10b981'
        };

        updateSceneWithHistory(prev => ({
          ...prev,
          objects: [...prev.objects, newObject]
        }), `Import ${file.name}`);
        setSelectedObjectIds([newObject.id]);

        toast.success(`Imported ${file.name}`);
        return asset;
      }
    } catch (error) {
      console.error('Failed to import STL:', error);
      toast.error('Failed to import STL file');
    }
    return null;
  };

  const updateObject = (id: string, updates: Partial<SceneObject>, description?: string) => {
    updateSceneWithHistory(prev => ({
      ...prev,
      objects: prev.objects.map(obj => 
        obj.id === id ? { ...obj, ...updates } : obj
      )
    }), description || 'Update object');
  };

  const updateObjectTransform = (id: string, property: 'position' | 'rotation' | 'scale', value: Vector3) => {
    // For continuous transforms, don't push to history every time
    setSceneState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => 
        obj.id === id ? { ...obj, [property]: value } : obj
      )
    }));
  };

  const commitTransform = (id: string) => {
    pushState(sceneState, 'Transform object');
  };

  const duplicateObject = (id: string) => {
    const obj = sceneState.objects.find(o => o.id === id);
    if (!obj) return;

    const newObject: SceneObject = {
      ...obj,
      id: generateId(),
      name: `${obj.name} (copy)`,
      position: {
        x: obj.position.x + 1,
        y: obj.position.y,
        z: obj.position.z
      }
    };

    updateSceneWithHistory(prev => ({
      ...prev,
      objects: [...prev.objects, newObject]
    }), 'Duplicate object');
    setSelectedObjectIds([newObject.id]);
  };

  const deleteObject = (id: string) => {
    updateSceneWithHistory(prev => ({
      ...prev,
      objects: prev.objects.filter(obj => obj.id !== id)
    }), 'Delete object');
    setSelectedObjectIds(prev => prev.filter(sid => sid !== id));
  };

  const deleteSelectedObjects = () => {
    if (selectedObjectIds.length === 0) return;
    updateSceneWithHistory(prev => ({
      ...prev,
      objects: prev.objects.filter(obj => !selectedObjectIds.includes(obj.id))
    }), `Delete ${selectedObjectIds.length} object(s)`);
    setSelectedObjectIds([]);
  };

  const toggleObjectVisibility = (id: string) => {
    const obj = sceneState.objects.find(o => o.id === id);
    updateObject(id, { visible: !obj?.visible }, 'Toggle visibility');
  };

  const toggleObjectLock = (id: string) => {
    const obj = sceneState.objects.find(o => o.id === id);
    updateObject(id, { locked: !obj?.locked }, 'Toggle lock');
  };

  const renameObject = (id: string, name: string) => {
    updateObject(id, { name }, 'Rename object');
  };

  // Grouping
  const groupSelectedObjects = () => {
    if (selectedObjectIds.length < 2) return;

    const group: SceneObject = {
      id: generateId(),
      name: `Group ${sceneState.objects.filter(o => o.type === 'group').length + 1}`,
      type: 'group',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      locked: false,
      color: '#9333ea',
      children: selectedObjectIds
    };

    updateSceneWithHistory(prev => ({
      ...prev,
      objects: [
        ...prev.objects.map(obj => 
          selectedObjectIds.includes(obj.id) 
            ? { ...obj, groupId: group.id }
            : obj
        ),
        group
      ]
    }), 'Group objects');
    setSelectedObjectIds([group.id]);
  };

  const ungroupObject = (groupId: string) => {
    const group = sceneState.objects.find(o => o.id === groupId);
    if (!group || group.type !== 'group') return;

    updateSceneWithHistory(prev => ({
      ...prev,
      objects: prev.objects
        .filter(obj => obj.id !== groupId)
        .map(obj => 
          obj.groupId === groupId 
            ? { ...obj, groupId: undefined }
            : obj
        )
    }), 'Ungroup');
    setSelectedObjectIds(group.children || []);
  };

  // Alignment actions
  const alignToOrigin = () => {
    if (selectedObjectIds.length === 0) return;
    updateSceneWithHistory(prev => ({
      ...prev,
      objects: prev.objects.map(obj => 
        selectedObjectIds.includes(obj.id)
          ? { ...obj, position: { x: 0, y: obj.position.y, z: 0 } }
          : obj
      )
    }), 'Align to origin');
  };

  const dropToGround = () => {
    if (selectedObjectIds.length === 0) return;
    updateSceneWithHistory(prev => ({
      ...prev,
      objects: prev.objects.map(obj => 
        selectedObjectIds.includes(obj.id)
          ? { ...obj, position: { ...obj.position, y: 0.5 } }
          : obj
      )
    }), 'Drop to ground');
  };

  const centerInScene = () => {
    if (selectedObjectIds.length === 0) return;
    updateSceneWithHistory(prev => ({
      ...prev,
      objects: prev.objects.map(obj => 
        selectedObjectIds.includes(obj.id)
          ? { ...obj, position: { x: 0, y: 0.5, z: 0 } }
          : obj
      )
    }), 'Center in scene');
  };

  // Load STL geometry helper for CSG operations
  const loadSTLGeometry = useCallback(async (assetId: string): Promise<THREE.BufferGeometry | null> => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return null;

    const signedUrl = await storageGetSignedUrl('creation-assets', asset.file_path);
    if (!signedUrl) return null;

    return new Promise((resolve) => {
      const loader = new STLLoader();
      loader.load(signedUrl, (geometry) => {
        geometry.computeVertexNormals();
        resolve(geometry);
      }, undefined, () => resolve(null));
    });
  }, [assets]);

  // Boolean operations
  const performBoolean = async (operation: BooleanOperation) => {
    if (selectedObjectIds.length !== 2) {
      toast.error('Select exactly 2 objects for boolean operations');
      return;
    }

    const objA = sceneState.objects.find(o => o.id === selectedObjectIds[0]);
    const objB = sceneState.objects.find(o => o.id === selectedObjectIds[1]);

    if (!objA || !objB) return;
    if (objA.type === 'group' || objB.type === 'group') {
      toast.error('Cannot perform boolean on groups');
      return;
    }

    toast.loading('Performing boolean operation...', { id: 'boolean-op' });

    try {
      const resultGeometry = await performBooleanOperation(objA, objB, operation, loadSTLGeometry);

      if (!resultGeometry) {
        toast.error('Boolean operation failed. Meshes may not overlap.', { id: 'boolean-op' });
        return;
      }

      // Store the result geometry for later export
      // For now, we create a "result" object that references the operation
      const newObject: SceneObject = {
        id: generateId(),
        name: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Result`,
        type: 'primitive',
        primitiveType: 'box', // Placeholder - will need custom handling for export
        position: { x: 0, y: 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        visible: true,
        locked: false,
        color: '#f59e0b'
      };

      // Remove the two input objects and add the result
      updateSceneWithHistory(prev => ({
        ...prev,
        objects: [
          ...prev.objects.filter(o => !selectedObjectIds.includes(o.id)),
          newObject
        ]
      }), `Boolean ${operation}`);
      setSelectedObjectIds([newObject.id]);

      toast.success(`${operation.charAt(0).toUpperCase() + operation.slice(1)} completed`, { id: 'boolean-op' });
    } catch (error) {
      console.error('Boolean operation error:', error);
      toast.error('Boolean operation failed', { id: 'boolean-op' });
    }
  };

  const getAssetUrl = useCallback(async (assetId: string): Promise<string | null> => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return null;

    return storageGetSignedUrl('creation-assets', asset.file_path);
  }, [assets]);

  // Multi-select support
  const toggleObjectSelection = (id: string, addToSelection: boolean) => {
    const obj = sceneState.objects.find(o => o.id === id);
    if (obj?.locked) return;

    if (addToSelection) {
      setSelectedObjectIds(prev => 
        prev.includes(id) 
          ? prev.filter(sid => sid !== id)
          : [...prev, id]
      );
    } else {
      setSelectedObjectIds([id]);
    }
  };

  const clearSelection = () => setSelectedObjectIds([]);

  const selectedObjects = sceneState.objects.filter(o => selectedObjectIds.includes(o.id));
  const selectedObject = selectedObjects.length === 1 ? selectedObjects[0] : null;

  return {
    currentProject,
    isLoading,
    isSaving,
    loadProject,
    createProject,
    saveProject,
    updateProjectName,

    // History
    undo,
    redo,
    canUndo,
    canRedo,

    // Scene state
    sceneState,
    setSceneState,
    assets,

    // Selection
    selectedObject,
    selectedObjects,
    selectedObjectIds,
    setSelectedObjectIds,
    toggleObjectSelection,
    clearSelection,

    // Object management
    addPrimitive,
    importSTL,
    updateObject,
    updateObjectTransform,
    commitTransform,
    duplicateObject,
    deleteObject,
    deleteSelectedObjects,
    toggleObjectVisibility,
    toggleObjectLock,
    renameObject,
    getAssetUrl,

    // Grouping
    groupSelectedObjects,
    ungroupObject,

    // Alignment
    alignToOrigin,
    dropToGround,
    centerInScene,

    // Boolean operations
    performBoolean
  };
}
