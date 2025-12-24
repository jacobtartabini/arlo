import { useRef, useMemo, Suspense, useEffect, useState } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { 
  OrbitControls, 
  TransformControls, 
  Grid, 
  GizmoHelper, 
  GizmoViewport,
  Environment
} from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import type { SceneObject, TransformMode, ViewMode, Vector3 } from '@/types/creation';
import { supabase } from '@/integrations/supabase/client';

interface PrimitiveProps {
  object: SceneObject;
  isSelected: boolean;
  onClick: () => void;
  wireframe: boolean;
}

function Primitive({ object, isSelected, onClick, wireframe }: PrimitiveProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    switch (object.primitiveType) {
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
  }, [object.primitiveType]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[object.position.x, object.position.y, object.position.z]}
      rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
      scale={[object.scale.x, object.scale.y, object.scale.z]}
      visible={object.visible}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <meshStandardMaterial 
        color={object.color} 
        wireframe={wireframe}
        emissive={isSelected ? object.color : '#000000'}
        emissiveIntensity={isSelected ? 0.2 : 0}
      />
    </mesh>
  );
}

interface ImportedSTLProps {
  object: SceneObject;
  assetFilePath: string | null;
  isSelected: boolean;
  onClick: () => void;
  wireframe: boolean;
}

function ImportedSTL({ object, assetFilePath, isSelected, onClick, wireframe }: ImportedSTLProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!assetFilePath) return;

    const loadSTL = async () => {
      try {
        const { data } = supabase.storage
          .from('creation-assets')
          .getPublicUrl(assetFilePath);

        const loader = new STLLoader();
        loader.load(data.publicUrl, (geo) => {
          geo.center();
          geo.computeVertexNormals();
          setGeometry(geo);
        });
      } catch (error) {
        console.error('Failed to load STL:', error);
      }
    };

    loadSTL();
  }, [assetFilePath]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh
      geometry={geometry}
      position={[object.position.x, object.position.y, object.position.z]}
      rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
      scale={[object.scale.x, object.scale.y, object.scale.z]}
      visible={object.visible}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <meshStandardMaterial 
        color={object.color} 
        wireframe={wireframe}
        emissive={isSelected ? object.color : '#000000'}
        emissiveIntensity={isSelected ? 0.2 : 0}
      />
    </mesh>
  );
}

interface TransformableObjectProps {
  object: SceneObject;
  isSelected: boolean;
  transformMode: TransformMode;
  wireframe: boolean;
  onSelect: () => void;
  onTransformEnd: (position: Vector3, rotation: Vector3, scale: Vector3) => void;
  getAssetFilePath: (assetId: string) => string | null;
}

function TransformableObject({ 
  object, 
  isSelected, 
  transformMode, 
  wireframe,
  onSelect, 
  onTransformEnd,
  getAssetFilePath
}: TransformableObjectProps) {
  const meshRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    if (object.type === 'imported') return null;
    
    switch (object.primitiveType) {
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

  const actualGeometry = object.type === 'imported' ? stlGeometry : geometry;

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
      {isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={transformMode}
          onObjectChange={() => {
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
  selectedObjectId: string | null;
  transformMode: TransformMode;
  viewMode: ViewMode;
  onSelectObject: (id: string | null) => void;
  onTransformEnd: (id: string, position: Vector3, rotation: Vector3, scale: Vector3) => void;
  getAssetFilePath: (assetId: string) => string | null;
}

function Scene({ 
  objects, 
  selectedObjectId, 
  transformMode,
  viewMode,
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
      
      <Grid 
        args={[20, 20]} 
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />

      {objects.map(obj => (
        <TransformableObject
          key={obj.id}
          object={obj}
          isSelected={obj.id === selectedObjectId}
          transformMode={transformMode}
          wireframe={wireframe}
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
  selectedObjectId: string | null;
  transformMode: TransformMode;
  viewMode: ViewMode;
  onSelectObject: (id: string | null) => void;
  onTransformEnd: (id: string, position: Vector3, rotation: Vector3, scale: Vector3) => void;
  getAssetFilePath: (assetId: string) => string | null;
}

export function CreationViewport({
  objects,
  selectedObjectId,
  transformMode,
  viewMode,
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
            selectedObjectId={selectedObjectId}
            transformMode={transformMode}
            viewMode={viewMode}
            onSelectObject={onSelectObject}
            onTransformEnd={onTransformEnd}
            getAssetFilePath={getAssetFilePath}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
