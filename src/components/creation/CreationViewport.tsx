import { useRef, useMemo, Suspense, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  TransformControls, 
  Grid, 
  GizmoHelper, 
  GizmoViewport,
  PerspectiveCamera
} from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import type { SceneObject, TransformMode, ViewMode, Vector3, SnapSettings, CameraPreset } from '@/types/creation';
import { supabase } from '@/integrations/supabase/client';
import { createPrimitiveGeometry } from '@/utils/stl-exporter';

interface TransformableObjectProps {
  object: SceneObject;
  isSelected: boolean;
  transformMode: TransformMode;
  wireframe: boolean;
  snapSettings: SnapSettings;
  onSelect: () => void;
  onTransformEnd: (position: Vector3, rotation: Vector3, scale: Vector3) => void;
  getAssetFilePath: (assetId: string) => string | null;
}

function TransformableObject({ 
  object, 
  isSelected, 
  transformMode, 
  wireframe,
  snapSettings,
  onSelect, 
  onTransformEnd,
  getAssetFilePath
}: TransformableObjectProps) {
  const meshRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);

  const geometry = useMemo(() => {
    if (object.type === 'imported' || object.type === 'group') return null;
    return createPrimitiveGeometry(object.primitiveType!);
  }, [object.primitiveType, object.type]);

  const [stlGeometry, setStlGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (object.type !== 'imported' || !object.assetId) return;

    const filePath = getAssetFilePath(object.assetId);
    if (!filePath) return;

    const { data } = supabase.storage
      .from('creation-assets')
      .getPublicUrl(filePath);

    const loader = new STLLoader();
    loader.load(data.publicUrl, (geo) => {
      geo.center();
      geo.computeVertexNormals();
      setStlGeometry(geo);
    });
  }, [object.type, object.assetId, getAssetFilePath]);

  // Set up snapping
  useEffect(() => {
    if (controlsRef.current && snapSettings.enabled) {
      if (transformMode === 'translate') {
        controlsRef.current.setTranslationSnap(snapSettings.translateSnap / 1000);
      } else if (transformMode === 'rotate') {
        controlsRef.current.setRotationSnap(THREE.MathUtils.degToRad(snapSettings.rotateSnap));
      } else {
        controlsRef.current.setScaleSnap(0.1);
      }
    } else if (controlsRef.current) {
      controlsRef.current.setTranslationSnap(null);
      controlsRef.current.setRotationSnap(null);
      controlsRef.current.setScaleSnap(null);
    }
  }, [snapSettings, transformMode]);

  const actualGeometry = object.type === 'imported' ? stlGeometry : geometry;

  // For groups, render nothing but still allow selection
  if (object.type === 'group') {
    return null;
  }

  if (!actualGeometry) return null;

  return (
    <>
      <group
        ref={meshRef}
        position={[object.position.x, object.position.y, object.position.z]}
        rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
        scale={[object.scale.x, object.scale.y, object.scale.z]}
        visible={object.visible}
      >
        <mesh
          geometry={actualGeometry}
          onClick={(e) => {
            if (object.locked) return;
            e.stopPropagation();
            onSelect();
          }}
        >
          <meshStandardMaterial 
            color={object.color} 
            wireframe={wireframe}
            emissive={isSelected ? object.color : '#000000'}
            emissiveIntensity={isSelected ? 0.2 : 0}
          />
        </mesh>
      </group>
      {isSelected && meshRef.current && !object.locked && (
        <TransformControls
          ref={controlsRef}
          object={meshRef.current}
          mode={transformMode}
          onMouseUp={() => {
            if (meshRef.current) {
              const pos = meshRef.current.position;
              const rot = meshRef.current.rotation;
              const scl = meshRef.current.scale;
              onTransformEnd(
                { x: pos.x, y: pos.y, z: pos.z },
                { x: rot.x, y: rot.y, z: rot.z },
                { x: scl.x, y: scl.y, z: scl.z }
              );
            }
          }}
        />
      )}
    </>
  );
}

interface SceneProps {
  objects: SceneObject[];
  selectedObjectIds: string[];
  transformMode: TransformMode;
  viewMode: ViewMode;
  showGrid: boolean;
  showAxes: boolean;
  gridSize: number;
  snapSettings: SnapSettings;
  onSelectObject: (id: string | null, addToSelection?: boolean) => void;
  onTransformEnd: (id: string, position: Vector3, rotation: Vector3, scale: Vector3) => void;
  getAssetFilePath: (assetId: string) => string | null;
}

function Scene({ 
  objects, 
  selectedObjectIds, 
  transformMode,
  viewMode,
  showGrid,
  showAxes,
  gridSize,
  snapSettings,
  onSelectObject, 
  onTransformEnd,
  getAssetFilePath
}: SceneProps) {
  const wireframe = viewMode === 'wireframe';

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      
      {showGrid && (
        <Grid 
          args={[20, 20]} 
          cellSize={gridSize}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={gridSize * 5}
          sectionThickness={1}
          sectionColor="#9ca3af"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
      )}

      {showAxes && (
        <axesHelper args={[5]} />
      )}

      {objects.map(obj => (
        <TransformableObject
          key={obj.id}
          object={obj}
          isSelected={selectedObjectIds.includes(obj.id)}
          transformMode={transformMode}
          wireframe={wireframe}
          snapSettings={snapSettings}
          onSelect={() => onSelectObject(obj.id)}
          onTransformEnd={(pos, rot, scl) => onTransformEnd(obj.id, pos, rot, scl)}
          getAssetFilePath={getAssetFilePath}
        />
      ))}

      <OrbitControls makeDefault />
      
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#f43f5e', '#22c55e', '#3b82f6']} labelColor="white" />
      </GizmoHelper>
    </>
  );
}

interface CreationViewportProps {
  objects: SceneObject[];
  selectedObjectIds: string[];
  transformMode: TransformMode;
  viewMode: ViewMode;
  showGrid: boolean;
  showAxes: boolean;
  gridSize: number;
  snapSettings: SnapSettings;
  onSelectObject: (id: string | null, addToSelection?: boolean) => void;
  onTransformEnd: (id: string, position: Vector3, rotation: Vector3, scale: Vector3) => void;
  getAssetFilePath: (assetId: string) => string | null;
}

export function CreationViewport({
  objects,
  selectedObjectIds,
  transformMode,
  viewMode,
  showGrid,
  showAxes,
  gridSize,
  snapSettings,
  onSelectObject,
  onTransformEnd,
  getAssetFilePath
}: CreationViewportProps) {
  return (
    <div className="w-full h-full bg-background/50 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        onPointerMissed={() => onSelectObject(null)}
      >
        <Suspense fallback={null}>
          <Scene
            objects={objects}
            selectedObjectIds={selectedObjectIds}
            transformMode={transformMode}
            viewMode={viewMode}
            showGrid={showGrid}
            showAxes={showAxes}
            gridSize={gridSize}
            snapSettings={snapSettings}
            onSelectObject={onSelectObject}
            onTransformEnd={onTransformEnd}
            getAssetFilePath={getAssetFilePath}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
