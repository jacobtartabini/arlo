import { useEffect, useState, useCallback, useRef } from "react";
import { useCreationProject } from "@/hooks/useCreationProject";
import { CreationViewport } from "@/components/creation/CreationViewport";
import { CreationToolbar } from "@/components/creation/CreationToolbar";
import { ObjectListPanel } from "@/components/creation/ObjectListPanel";
import { PropertiesPanel } from "@/components/creation/PropertiesPanel";
import { ExportDialog } from "@/components/creation/ExportDialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { TransformMode, ViewMode, CreationAsset, SnapSettings, CameraPreset } from "@/types/creation";

export default function Creation() {
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [viewMode, setViewMode] = useState<ViewMode>('solid');
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [gridSize, setGridSize] = useState<number>(1);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    enabled: false,
    translateSnap: 1,
    rotateSnap: 15
  });

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
    selectedObjects,
    selectedObjectIds,
    toggleObjectSelection,
    clearSelection,
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
    undo,
    redo,
    canUndo,
    canRedo,
    groupSelectedObjects,
    ungroupObject,
    alignToOrigin,
    dropToGround,
    centerInScene
  } = useCreationProject();

  useEffect(() => {
    document.title = "Creation — Arlo";
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Other shortcuts
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
          } else if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            saveProject();
          }
          break;
        case 'delete':
        case 'backspace':
          deleteSelectedObjects();
          break;
        case 'd':
          if ((e.ctrlKey || e.metaKey) && selectedObjectIds.length === 1) {
            e.preventDefault();
            duplicateObject(selectedObjectIds[0]);
          }
          break;
        case 'escape':
          clearSelection();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectIds, deleteSelectedObjects, duplicateObject, undo, redo, saveProject, clearSelection]);

  const getAssetFilePath = useCallback((assetId: string): string | null => {
    const asset = assets.find((a: CreationAsset) => a.id === assetId);
    return asset?.file_path || null;
  }, [assets]);

  const handleTransformEnd = (id: string, position: any, rotation: any, scale: any) => {
    updateObjectTransform(id, 'position', position);
    updateObjectTransform(id, 'rotation', rotation);
    updateObjectTransform(id, 'scale', scale);
    commitTransform(id);
  };

  const handleSelectObject = (id: string | null, addToSelection: boolean = false) => {
    if (id === null) {
      clearSelection();
    } else {
      toggleObjectSelection(id, addToSelection);
    }
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
          hasSelection={selectedObjectIds.length > 0}
          hasTwoSelected={selectedObjectIds.length === 2}
          canUndo={canUndo}
          canRedo={canRedo}
          showGrid={showGrid}
          showAxes={showAxes}
          snapSettings={snapSettings}
          onAddPrimitive={addPrimitive}
          onImportSTL={importSTL}
          onTransformModeChange={setTransformMode}
          onViewModeChange={setViewMode}
          onSave={saveProject}
          onNewProject={() => createProject()}
          onExport={() => setExportDialogOpen(true)}
          onUndo={undo}
          onRedo={redo}
          onToggleGrid={() => setShowGrid(!showGrid)}
          onToggleAxes={() => setShowAxes(!showAxes)}
          onSnapSettingsChange={setSnapSettings}
          onAlignToOrigin={alignToOrigin}
          onDropToGround={dropToGround}
          onCenterInScene={centerInScene}
          onGroup={groupSelectedObjects}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Object List */}
        <div className="w-64 border-r border-border bg-card/50">
          <ObjectListPanel
            objects={sceneState.objects}
            selectedObjectIds={selectedObjectIds}
            onSelectObject={(id, addToSelection) => handleSelectObject(id, addToSelection)}
            onToggleVisibility={toggleObjectVisibility}
            onToggleLock={toggleObjectLock}
            onDuplicate={duplicateObject}
            onDelete={deleteObject}
            onRename={renameObject}
            onUngroup={ungroupObject}
          />
        </div>

        {/* Center - 3D Viewport */}
        <div className="flex-1">
          <CreationViewport
            objects={sceneState.objects}
            selectedObjectIds={selectedObjectIds}
            transformMode={transformMode}
            viewMode={viewMode}
            showGrid={showGrid}
            showAxes={showAxes}
            gridSize={gridSize}
            snapSettings={snapSettings}
            onSelectObject={handleSelectObject}
            onTransformEnd={handleTransformEnd}
            getAssetFilePath={getAssetFilePath}
          />
        </div>

        {/* Right Panel - Properties */}
        <div className="w-72 border-l border-border bg-card/50">
          <PropertiesPanel
            selectedObject={selectedObject}
            selectedCount={selectedObjectIds.length}
            onUpdatePosition={(v) => selectedObjectIds.length === 1 && updateObjectTransform(selectedObjectIds[0], 'position', v)}
            onUpdateRotation={(v) => selectedObjectIds.length === 1 && updateObjectTransform(selectedObjectIds[0], 'rotation', v)}
            onUpdateScale={(v) => selectedObjectIds.length === 1 && updateObjectTransform(selectedObjectIds[0], 'scale', v)}
            onUpdateColor={(c) => selectedObjectIds.length === 1 && updateObject(selectedObjectIds[0], { color: c })}
            onCommitTransform={() => selectedObjectIds.length === 1 && commitTransform(selectedObjectIds[0])}
          />
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        objects={sceneState.objects}
        selectedObjects={selectedObjects}
        projectName={currentProject?.name || 'export'}
      />
    </div>
  );
}
