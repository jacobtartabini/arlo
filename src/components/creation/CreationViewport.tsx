import { useRef, useMemo, Suspense, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  TransformControls, 
  Grid, 
  GizmoHelper, 
  GizmoViewport,
  Line
} from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import type { SceneObject, TransformMode, ViewMode, Vector3, SnapSettings, MeasureTool } from '@/types/creation';
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

  if (object.type === 'group') return null;
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
  measureTool: MeasureTool;
  onSelectObject: (id: string | null, addToSelection?: boolean) => void;
  onTransformEnd: (id: string, position: Vector3, rotation: Vector3, scale: Vector3) => void;
  getAssetFilePath: (assetId: string) => string | null;
  onMeasurePoint: (point: Vector3) => void;
  onFitToSelectionRef: React.MutableRefObject<() => void>;
  onFitToSceneRef: React.MutableRefObject<() => void>;
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
  measureTool,
  onSelectObject, 
  onTransformEnd,
  getAssetFilePath,
  onMeasurePoint,
  onFitToSelectionRef,
  onFitToSceneRef
}: SceneProps) {
  const wireframe = viewMode === 'wireframe';
  const { camera } = useThree();
  const orbitControlsRef = useRef<any>(null);

  const fitCameraToObjects = useCallback((targetObjects: SceneObject[]) => {
    if (targetObjects.length === 0) return;

    const box = new THREE.Box3();
    
    targetObjects.forEach(obj => {
      if (obj.type === 'group') return;
      const tempBox = new THREE.Box3();
      const pos = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z);
      const size = new THREE.Vector3(obj.scale.x * 2, obj.scale.y * 2, obj.scale.z * 2);
      tempBox.setFromCenterAndSize(pos, size);
      box.union(tempBox);
    });

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

    camera.position.set(center.x + cameraZ * 0.5, center.y + cameraZ * 0.5, center.z + cameraZ);
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.copy(center);
      orbitControlsRef.current.update();
    }
  }, [camera]);

  useEffect(() => {
    onFitToSelectionRef.current = () => {
      const selected = objects.filter(o => selectedObjectIds.includes(o.id));
      fitCameraToObjects(selected);
    };
    onFitToSceneRef.current = () => {
      fitCameraToObjects(objects);
    };
  }, [objects, selectedObjectIds, fitCameraToObjects, onFitToSelectionRef, onFitToSceneRef]);

  const handleMeasureClick = (e: any) => {
    if (!measureTool.active) return;
    e.stopPropagation();
    const point = e.point as THREE.Vector3;
    onMeasurePoint({ x: point.x, y: point.y, z: point.z });
  };

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

      {showAxes && <axesHelper args={[5]} />}

      {measureTool.active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onClick={handleMeasureClick}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}

      {measureTool.point1 && (
        <mesh position={[measureTool.point1.x, measureTool.point1.y, measureTool.point1.z]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#f43f5e" />
        </mesh>
      )}
      
      {measureTool.point2 && measureTool.point1 && (
        <>
          <mesh position={[measureTool.point2.x, measureTool.point2.y, measureTool.point2.z]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#f43f5e" />
          </mesh>
          <Line
            points={[
              [measureTool.point1.x, measureTool.point1.y, measureTool.point1.z],
              [measureTool.point2.x, measureTool.point2.y, measureTool.point2.z]
            ]}
            color="#f43f5e"
            lineWidth={2}
          />
        </>
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

      <OrbitControls ref={orbitControlsRef} makeDefault />
      
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
  measureTool: MeasureTool;
  onSelectObject: (id: string | null, addToSelection?: boolean) => void;
  onTransformEnd: (id: string, position: Vector3, rotation: Vector3, scale: Vector3) => void;
  getAssetFilePath: (assetId: string) => string | null;
  onMeasurePoint: (point: Vector3) => void;
  onFitToSelectionRef: React.MutableRefObject<() => void>;
  onFitToSceneRef: React.MutableRefObject<() => void>;
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
  measureTool,
  onSelectObject,
  onTransformEnd,
  getAssetFilePath,
  onMeasurePoint,
  onFitToSelectionRef,
  onFitToSceneRef
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
            measureTool={measureTool}
            onSelectObject={onSelectObject}
            onTransformEnd={onTransformEnd}
            getAssetFilePath={getAssetFilePath}
            onMeasurePoint={onMeasurePoint}
            onFitToSelectionRef={onFitToSelectionRef}
            onFitToSceneRef={onFitToSceneRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
