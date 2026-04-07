
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ShellMesh } from './ShellMesh';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ViewCube } from './ViewCube';

// Camera controller that handles auto-fit and view changes
const CameraController: React.FC<{
    onCameraUpdate: (quaternion: THREE.Quaternion) => void;
    viewPosition: [number, number, number] | null;
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
}> = ({ onCameraUpdate, viewPosition, controlsRef }) => {
    const { camera, scene } = useThree();
    const targetRef = useRef(new THREE.Vector3(0, 0, 0));
    const distanceRef = useRef(5000);
    const initialFitDone = useRef(false);

    // Auto-fit camera on mount and when geometry changes
    useEffect(() => {
        const fitCamera = () => {
            // Find ShellMesh in scene
            let shellBox: THREE.Box3 | null = null;
            scene.traverse((obj) => {
                if (obj.type === 'Mesh' && obj.geometry && obj.geometry.attributes.position) {
                    const box = new THREE.Box3().setFromObject(obj);
                    if (!shellBox) {
                        shellBox = box;
                    } else {
                        shellBox.union(box);
                    }
                }
            });

            if (shellBox && !shellBox.isEmpty()) {
                const size = shellBox.getSize(new THREE.Vector3());
                const center = shellBox.getCenter(new THREE.Vector3());
                
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
                    let distance = Math.abs(maxDim / Math.tan(fov / 2));
                    distance *= 2.0; // Padding

                    targetRef.current.copy(center);
                    distanceRef.current = distance;

                    if (!initialFitDone.current) {
                        // Initial camera position
                        camera.position.set(
                            center.x + distance * 0.6,
                            center.y + distance * 0.5,
                            center.z + distance * 0.6
                        );
                        camera.lookAt(center);

                        if (controlsRef.current) {
                            controlsRef.current.target.copy(center);
                            controlsRef.current.update();
                        }
                        initialFitDone.current = true;
                    }
                }
            }
        };

        fitCamera();
        const interval = setInterval(fitCamera, 1000);
        return () => clearInterval(interval);
    }, [camera, scene, controlsRef]);

    // Handle view position changes from ViewCube
    useEffect(() => {
        if (viewPosition && controlsRef.current) {
            const [x, y, z] = viewPosition;
            const distance = distanceRef.current;
            const target = targetRef.current;

            // Normalize and scale the direction
            const dir = new THREE.Vector3(x, y, z).normalize();
            const newPos = new THREE.Vector3(
                target.x + dir.x * distance,
                target.y + dir.y * distance,
                target.z + dir.z * distance
            );

            // Animate camera to new position
            camera.position.copy(newPos);
            camera.lookAt(target);
            controlsRef.current.target.copy(target);
            controlsRef.current.update();
        }
    }, [viewPosition, camera, controlsRef]);

    // Update camera quaternion for ViewCube sync
    useFrame(() => {
        onCameraUpdate(camera.quaternion.clone());
    });

    return null;
};

export const Scene: React.FC = () => {
    const [cameraQuaternion, setCameraQuaternion] = useState(() => new THREE.Quaternion());
    const [viewPosition, setViewPosition] = useState<[number, number, number] | null>(null);
    const controlsRef = useRef<OrbitControlsImpl | null>(null);

    const handleCameraUpdate = useCallback((quaternion: THREE.Quaternion) => {
        setCameraQuaternion(quaternion);
    }, []);

    const handleViewChange = useCallback((position: [number, number, number]) => {
        setViewPosition(position);
        // Reset after animation trigger
        setTimeout(() => setViewPosition(null), 100);
    }, []);

    return (
        <div className="absolute inset-0 w-full h-full">
            {/* Main 3D Canvas */}
            <Canvas
                camera={{ position: [4000, 3000, 4000], fov: 45, far: 100000, near: 0.1 }}
                className="w-full h-full bg-[#141218]"
                gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true }}
            >
                {/* Professional CAD Lighting Setup */}
                <directionalLight position={[5000, 8000, 5000]} intensity={1.2} />
                <directionalLight position={[-5000, 2000, -5000]} intensity={0.8} />
                <directionalLight position={[0, 5000, -8000]} intensity={0.6} />
                <directionalLight position={[0, -3000, 0]} intensity={0.3} />
                <ambientLight intensity={0.5} />

                {/* Grid for reference */}
                <gridHelper args={[10000, 100, 0x444444, 0x333333]} />

                {/* Main Geometry */}
                <ShellMesh />

                {/* Controls */}
                <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    enableDamping
                    dampingFactor={0.05}
                    maxDistance={100000}
                    minDistance={10}
                />

                {/* Camera Controller */}
                <CameraController
                    onCameraUpdate={handleCameraUpdate}
                    viewPosition={viewPosition}
                    controlsRef={controlsRef}
                />
            </Canvas>

            {/* ViewCube Overlay - Bottom Right Corner */}
            <ViewCube
                onViewChange={handleViewChange}
                cameraQuaternion={cameraQuaternion}
            />
        </div>
    );
};
