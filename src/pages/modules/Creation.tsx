import { useEffect, useState, useCallback } from "react";
import { useCreationProject } from "@/hooks/useCreationProject";
import { CreationViewport } from "@/components/creation/CreationViewport";
import { CreationToolbar } from "@/components/creation/CreationToolbar";
import { ObjectListPanel } from "@/components/creation/ObjectListPanel";
import { PropertiesPanel } from "@/components/creation/PropertiesPanel";
import { exportObjectsToSTL, exportSingleObjectToSTL } from "@/utils/stl-exporter";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { TransformMode, ViewMode, CreationAsset } from "@/types/creation";

export default function Creation() {
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [viewMode, setViewMode] = useState<ViewMode>('solid');

  const {
    currentProject,
    isLoading,
    isSaving,
    createProject,
    saveProject,
    updateProjectName,
    sceneState,
    assets,
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
    renameObject
  } = useCreationProject();

  useEffect(() => {
    document.title = "Creation — Arlo";
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'g':
          setTransformMode('translate');
          break;
        case 'r':
          setTransformMode('rotate');
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            setTransformMode('scale');
          }
          break;
        case 'delete':
        case 'backspace':
          if (selectedObjectId) {
            deleteObject(selectedObjectId);
          }
          break;
        case 'd':
          if ((e.ctrlKey || e.metaKey) && selectedObjectId) {
            e.preventDefault();
            duplicateObject(selectedObjectId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, deleteObject, duplicateObject]);

  const getAssetFilePath = useCallback((assetId: string): string | null => {
    const asset = assets.find((a: CreationAsset) => a.id === assetId);
    return asset?.file_path || null;
  }, [assets]);

  const handleTransformEnd = (id: string, position: any, rotation: any, scale: any) => {
    updateObjectTransform(id, 'position', position);
    updateObjectTransform(id, 'rotation', rotation);
    updateObjectTransform(id, 'scale', scale);
  };

  const handleExportSelected = () => {
    if (selectedObject) {
      exportSingleObjectToSTL(selectedObject);
    }
  };

  const handleExportAll = () => {
    const name = currentProject?.name || 'scene';
    exportObjectsToSTL(sceneState.objects, `${name}.stl`);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm">
        <Input
          value={currentProject?.name || 'Untitled Project'}
          onChange={(e) => updateProjectName(e.target.value)}
          className="w-48 h-8 text-sm font-medium bg-transparent border-none focus-visible:ring-1"
        />
        <CreationToolbar
          transformMode={transformMode}
          viewMode={viewMode}
          isSaving={isSaving}
          hasSelection={!!selectedObject}
          onAddPrimitive={addPrimitive}
          onImportSTL={importSTL}
          onTransformModeChange={setTransformMode}
          onViewModeChange={setViewMode}
          onSave={saveProject}
          onNewProject={() => createProject()}
          onExportSelected={handleExportSelected}
          onExportAll={handleExportAll}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Object List */}
        <div className="w-64 border-r border-border bg-card/50">
          <ObjectListPanel
            objects={sceneState.objects}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            onToggleVisibility={toggleObjectVisibility}
            onDuplicate={duplicateObject}
            onDelete={deleteObject}
            onRename={renameObject}
          />
        </div>

        {/* Center - 3D Viewport */}
        <div className="flex-1">
          <CreationViewport
            objects={sceneState.objects}
            selectedObjectId={selectedObjectId}
            transformMode={transformMode}
            viewMode={viewMode}
            onSelectObject={setSelectedObjectId}
            onTransformEnd={handleTransformEnd}
            getAssetFilePath={getAssetFilePath}
          />
        </div>

        {/* Right Panel - Properties */}
        <div className="w-72 border-l border-border bg-card/50">
          <PropertiesPanel
            selectedObject={selectedObject}
            onUpdatePosition={(v) => selectedObjectId && updateObjectTransform(selectedObjectId, 'position', v)}
            onUpdateRotation={(v) => selectedObjectId && updateObjectTransform(selectedObjectId, 'rotation', v)}
            onUpdateScale={(v) => selectedObjectId && updateObjectTransform(selectedObjectId, 'scale', v)}
            onUpdateColor={(c) => selectedObjectId && updateObject(selectedObjectId, { color: c })}
          />
        </div>
      </div>
    </div>
  );
}
