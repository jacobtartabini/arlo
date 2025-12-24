import { useState, useEffect, useCallback } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import { supabase } from '@/integrations/supabase/client';
import type { 
  CreationProject, 
  CreationAsset, 
  SceneState, 
  SceneObject, 
  PrimitiveType,
  Vector3 
} from '@/types/creation';
import { toast } from 'sonner';

const ARLO_USER_ID = '00000000-0000-0000-0000-000000000001';

const defaultSceneState: SceneState = {
  objects: [],
  cameraPosition: { x: 5, y: 5, z: 5 },
  cameraTarget: { x: 0, y: 0, z: 0 }
};

export function useCreationProject() {
  const [projects, setProjects] = useState<CreationProject[]>([]);
  const [currentProject, setCurrentProject] = useState<CreationProject | null>(null);
  const [sceneState, setSceneState] = useState<SceneState>(defaultSceneState);
  const [assets, setAssets] = useState<CreationAsset[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await dataApiHelpers.select<CreationProject[]>('creation_projects', {
        order: { column: 'updated_at', ascending: false }
      });
      if (response.data) {
        setProjects(response.data);
        // Auto-load most recent project
        if (response.data.length > 0) {
          await loadProject(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProject = async (projectId: string) => {
    try {
      setIsLoading(true);
      
      // Load project details
      const projectRes = await dataApiHelpers.select<CreationProject[]>('creation_projects', {
        filters: { id: projectId }
      });
      
      if (projectRes.data && projectRes.data.length > 0) {
        setCurrentProject(projectRes.data[0]);
      }

      // Load assets
      const assetsRes = await dataApiHelpers.select<CreationAsset[]>('creation_assets', {
        filters: { project_id: projectId }
      });
      if (assetsRes.data) {
        setAssets(assetsRes.data);
      }

      // Load scene state - use custom query since project_id is the primary key
      const { data: sceneData, error } = await supabase
        .from('creation_scene_state')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (sceneData && !error) {
        setSceneState(sceneData.state_json as unknown as SceneState);
      } else {
        setSceneState(defaultSceneState);
      }

      setSelectedObjectId(null);
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (name: string = 'Untitled Project') => {
    try {
      const response = await dataApiHelpers.insert<CreationProject>('creation_projects', {
        name,
        user_id: ARLO_USER_ID
      });
      
      if (response.data) {
        setProjects(prev => [response.data as CreationProject, ...prev]);
        setCurrentProject(response.data as CreationProject);
        setSceneState(defaultSceneState);
        setAssets([]);
        setSelectedObjectId(null);
        toast.success('Project created');
        return response.data as CreationProject;
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

      // Upsert scene state using raw query approach
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

      // Update project timestamp
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
      setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, name } : p));
    } catch (error) {
      console.error('Failed to update project name:', error);
    }
  };

  // Object management
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
      color: '#6366f1'
    };

    setSceneState(prev => ({
      ...prev,
      objects: [...prev.objects, newObject]
    }));
    setSelectedObjectId(newObject.id);
  };

  const importSTL = async (file: File) => {
    if (!currentProject) {
      const project = await createProject('Untitled Project');
      if (!project) return null;
    }

    try {
      const projectId = currentProject!.id;
      const filePath = `${ARLO_USER_ID}/${projectId}/${Date.now()}_${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('creation-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create asset record
      const assetRes = await dataApiHelpers.insert<CreationAsset>('creation_assets', {
        project_id: projectId,
        file_path: filePath,
        original_name: file.name
      });

      if (assetRes.data) {
        const asset = assetRes.data as CreationAsset;
        setAssets(prev => [...prev, asset]);

        // Add to scene
        const newObject: SceneObject = {
          id: generateId(),
          name: file.name.replace('.stl', ''),
          type: 'imported',
          assetId: asset.id,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: -Math.PI / 2, y: 0, z: 0 }, // STL files are often oriented differently
          scale: { x: 0.01, y: 0.01, z: 0.01 }, // Scale down for typical STL sizes
          visible: true,
          color: '#10b981'
        };

        setSceneState(prev => ({
          ...prev,
          objects: [...prev.objects, newObject]
        }));
        setSelectedObjectId(newObject.id);

        toast.success(`Imported ${file.name}`);
        return asset;
      }
    } catch (error) {
      console.error('Failed to import STL:', error);
      toast.error('Failed to import STL file');
    }
    return null;
  };

  const updateObject = (id: string, updates: Partial<SceneObject>) => {
    setSceneState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => 
        obj.id === id ? { ...obj, ...updates } : obj
      )
    }));
  };

  const updateObjectTransform = (id: string, property: 'position' | 'rotation' | 'scale', value: Vector3) => {
    updateObject(id, { [property]: value });
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

    setSceneState(prev => ({
      ...prev,
      objects: [...prev.objects, newObject]
    }));
    setSelectedObjectId(newObject.id);
  };

  const deleteObject = (id: string) => {
    setSceneState(prev => ({
      ...prev,
      objects: prev.objects.filter(obj => obj.id !== id)
    }));
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
    }
  };

  const toggleObjectVisibility = (id: string) => {
    updateObject(id, { 
      visible: !sceneState.objects.find(o => o.id === id)?.visible 
    });
  };

  const renameObject = (id: string, name: string) => {
    updateObject(id, { name });
  };

  // Get asset URL for imported STLs
  const getAssetUrl = useCallback((assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return null;

    const { data } = supabase.storage
      .from('creation-assets')
      .getPublicUrl(asset.file_path);

    return data.publicUrl;
  }, [assets]);

  const selectedObject = sceneState.objects.find(o => o.id === selectedObjectId) || null;

  return {
    // Project management
    projects,
    currentProject,
    isLoading,
    isSaving,
    loadProject,
    createProject,
    saveProject,
    updateProjectName,

    // Scene state
    sceneState,
    setSceneState,
    assets,

    // Object management
    selectedObject,
    selectedObjectId,
    setSelectedObjectId,
    addPrimitive,
    importSTL,
    updateObject,
    updateObjectTransform,
    duplicateObject,
    deleteObject,
    toggleObjectVisibility,
    renameObject,
    getAssetUrl
  };
}
