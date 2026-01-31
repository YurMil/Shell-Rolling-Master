import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface ViewCubeProps {
    onViewChange: (position: [number, number, number]) => void;
    mainCameraQuaternion: THREE.Quaternion;
}

// View positions relative to target (distance multiplier)
const VIEWS = {
    // Faces
    front: { position: [0, 0, 1] as [number, number, number] },
    back: { position: [0, 0, -1] as [number, number, number] },
    top: { position: [0, 1, 0] as [number, number, number] },
    bottom: { position: [0, -1, 0] as [number, number, number] },
    right: { position: [1, 0, 0] as [number, number, number] },
    left: { position: [-1, 0, 0] as [number, number, number] },
    // Edges (between faces)
    topFront: { position: [0, 1, 1] as [number, number, number] },
    topBack: { position: [0, 1, -1] as [number, number, number] },
    topRight: { position: [1, 1, 0] as [number, number, number] },
    topLeft: { position: [-1, 1, 0] as [number, number, number] },
    bottomFront: { position: [0, -1, 1] as [number, number, number] },
    bottomBack: { position: [0, -1, -1] as [number, number, number] },
    bottomRight: { position: [1, -1, 0] as [number, number, number] },
    bottomLeft: { position: [-1, -1, 0] as [number, number, number] },
    rightFront: { position: [1, 0, 1] as [number, number, number] },
    rightBack: { position: [1, 0, -1] as [number, number, number] },
    leftFront: { position: [-1, 0, 1] as [number, number, number] },
    leftBack: { position: [-1, 0, -1] as [number, number, number] },
    // Corners (isometric views)
    frontTopRight: { position: [1, 1, 1] as [number, number, number] },
    frontTopLeft: { position: [-1, 1, 1] as [number, number, number] },
    frontBottomRight: { position: [1, -1, 1] as [number, number, number] },
    frontBottomLeft: { position: [-1, -1, 1] as [number, number, number] },
    backTopRight: { position: [1, 1, -1] as [number, number, number] },
    backTopLeft: { position: [-1, 1, -1] as [number, number, number] },
    backBottomRight: { position: [1, -1, -1] as [number, number, number] },
    backBottomLeft: { position: [-1, -1, -1] as [number, number, number] },
};

// Face component for the cube
const CubeFace: React.FC<{
    position: [number, number, number];
    rotation: [number, number, number];
    color: string;
    hoverColor: string;
    onClick: () => void;
}> = ({ position, rotation, color, hoverColor, onClick }) => {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Mesh>(null);

    return (
        <mesh
            ref={meshRef}
            position={position}
            rotation={rotation}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
        >
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial 
                color={hovered ? hoverColor : color} 
                side={THREE.DoubleSide}
                transparent
                opacity={0.9}
            />
        </mesh>
    );
};

// Clickable edge between two faces
const EdgeIndicator: React.FC<{
    position: [number, number, number];
    rotation: [number, number, number];
    onClick: () => void;
}> = ({ position, rotation, onClick }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <mesh
            position={position}
            rotation={rotation}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
        >
            <boxGeometry args={[0.15, 1.05, 0.15]} />
            <meshBasicMaterial 
                color={hovered ? '#8a8aaa' : '#4a4a5a'} 
                transparent
                opacity={hovered ? 0.8 : 0.3}
            />
        </mesh>
    );
};

// Clickable corner for isometric views
const CornerIndicator: React.FC<{
    position: [number, number, number];
    onClick: () => void;
}> = ({ position, onClick }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <mesh
            position={position}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
        >
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial 
                color={hovered ? '#aaaacc' : '#5a5a6a'} 
                transparent
                opacity={hovered ? 0.9 : 0.4}
            />
        </mesh>
    );
};

// Axis lines for the ViewCube with text labels
const AxisLines: React.FC = () => {
    const axisLength = 1.1;
    
    return (
        <group>
            {/* X Axis - Red */}
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array([0, 0, 0, axisLength, 0, 0]), 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#ff4444" linewidth={2} />
            </line>
            <mesh position={[axisLength + 0.08, 0, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#ff4444" />
            </mesh>
            <Text
                position={[axisLength + 0.25, 0, 0]}
                fontSize={0.25}
                color="#ff6666"
                anchorX="center"
                anchorY="middle"
            >
                X
            </Text>

            {/* Y Axis - Green */}
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array([0, 0, 0, 0, axisLength, 0]), 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#44ff44" linewidth={2} />
            </line>
            <mesh position={[0, axisLength + 0.08, 0]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#44ff44" />
            </mesh>
            <Text
                position={[0, axisLength + 0.25, 0]}
                fontSize={0.25}
                color="#66ff66"
                anchorX="center"
                anchorY="middle"
            >
                Y
            </Text>

            {/* Z Axis - Blue */}
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array([0, 0, 0, 0, 0, axisLength]), 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#4444ff" linewidth={2} />
            </line>
            <mesh position={[0, 0, axisLength + 0.08]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#4444ff" />
            </mesh>
            <Text
                position={[0, 0, axisLength + 0.25]}
                fontSize={0.25}
                color="#6666ff"
                anchorX="center"
                anchorY="middle"
            >
                Z
            </Text>
        </group>
    );
};

// The actual rotating cube that syncs with main camera
const ViewCubeInner: React.FC<ViewCubeProps> = ({ onViewChange, mainCameraQuaternion }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { camera } = useThree();

    useFrame(() => {
        if (groupRef.current) {
            // Invert the main camera's quaternion to show orientation
            const invQuat = mainCameraQuaternion.clone().invert();
            groupRef.current.quaternion.copy(invQuat);
        }
    });

    // Set up the mini camera
    useEffect(() => {
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);
    }, [camera]);

    const faceColor = '#3a3a4a';
    const hoverColor = '#6a6a8a';
    const edgeColor = '#5a5a6a';

    return (
        <group ref={groupRef}>
            {/* Cube faces */}
            <CubeFace
                position={[0, 0, 0.5]}
                rotation={[0, 0, 0]}
                color={faceColor}
                hoverColor={hoverColor}
                onClick={() => onViewChange(VIEWS.front.position)}
            />
            <CubeFace
                position={[0, 0, -0.5]}
                rotation={[0, Math.PI, 0]}
                color={faceColor}
                hoverColor={hoverColor}
                onClick={() => onViewChange(VIEWS.back.position)}
            />
            <CubeFace
                position={[0, 0.5, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                color={faceColor}
                hoverColor={hoverColor}
                onClick={() => onViewChange(VIEWS.top.position)}
            />
            <CubeFace
                position={[0, -0.5, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                color={faceColor}
                hoverColor={hoverColor}
                onClick={() => onViewChange(VIEWS.bottom.position)}
            />
            <CubeFace
                position={[0.5, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                color={faceColor}
                hoverColor={hoverColor}
                onClick={() => onViewChange(VIEWS.right.position)}
            />
            <CubeFace
                position={[-0.5, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                color={faceColor}
                hoverColor={hoverColor}
                onClick={() => onViewChange(VIEWS.left.position)}
            />

            {/* Cube wireframe edges */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
                <lineBasicMaterial color={edgeColor} />
            </lineSegments>

            {/* Edge indicators - 12 edges of the cube */}
            {/* Vertical edges */}
            <EdgeIndicator position={[0.5, 0, 0.5]} rotation={[0, 0, 0]} onClick={() => onViewChange(VIEWS.rightFront.position)} />
            <EdgeIndicator position={[-0.5, 0, 0.5]} rotation={[0, 0, 0]} onClick={() => onViewChange(VIEWS.leftFront.position)} />
            <EdgeIndicator position={[0.5, 0, -0.5]} rotation={[0, 0, 0]} onClick={() => onViewChange(VIEWS.rightBack.position)} />
            <EdgeIndicator position={[-0.5, 0, -0.5]} rotation={[0, 0, 0]} onClick={() => onViewChange(VIEWS.leftBack.position)} />
            
            {/* Horizontal edges (top)  */}
            <EdgeIndicator position={[0, 0.5, 0.5]} rotation={[0, 0, Math.PI / 2]} onClick={() => onViewChange(VIEWS.topFront.position)} />
            <EdgeIndicator position={[0, 0.5, -0.5]} rotation={[0, 0, Math.PI / 2]} onClick={() => onViewChange(VIEWS.topBack.position)} />
            <EdgeIndicator position={[0.5, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={() => onViewChange(VIEWS.topRight.position)} />
            <EdgeIndicator position={[-0.5, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={() => onViewChange(VIEWS.topLeft.position)} />
            
            {/* Horizontal edges (bottom) */}
            <EdgeIndicator position={[0, -0.5, 0.5]} rotation={[0, 0, Math.PI / 2]} onClick={() => onViewChange(VIEWS.bottomFront.position)} />
            <EdgeIndicator position={[0, -0.5, -0.5]} rotation={[0, 0, Math.PI / 2]} onClick={() => onViewChange(VIEWS.bottomBack.position)} />
            <EdgeIndicator position={[0.5, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={() => onViewChange(VIEWS.bottomRight.position)} />
            <EdgeIndicator position={[-0.5, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={() => onViewChange(VIEWS.bottomLeft.position)} />

            {/* Corner indicators - 8 corners for isometric views */}
            <CornerIndicator position={[0.5, 0.5, 0.5]} onClick={() => onViewChange(VIEWS.frontTopRight.position)} />
            <CornerIndicator position={[-0.5, 0.5, 0.5]} onClick={() => onViewChange(VIEWS.frontTopLeft.position)} />
            <CornerIndicator position={[0.5, -0.5, 0.5]} onClick={() => onViewChange(VIEWS.frontBottomRight.position)} />
            <CornerIndicator position={[-0.5, -0.5, 0.5]} onClick={() => onViewChange(VIEWS.frontBottomLeft.position)} />
            <CornerIndicator position={[0.5, 0.5, -0.5]} onClick={() => onViewChange(VIEWS.backTopRight.position)} />
            <CornerIndicator position={[-0.5, 0.5, -0.5]} onClick={() => onViewChange(VIEWS.backTopLeft.position)} />
            <CornerIndicator position={[0.5, -0.5, -0.5]} onClick={() => onViewChange(VIEWS.backBottomRight.position)} />
            <CornerIndicator position={[-0.5, -0.5, -0.5]} onClick={() => onViewChange(VIEWS.backBottomLeft.position)} />

            {/* Axis lines */}
            <AxisLines />
        </group>
    );
};

// Main ViewCube component with its own canvas
export const ViewCube: React.FC<{
    onViewChange: (position: [number, number, number]) => void;
    cameraQuaternion: THREE.Quaternion;
}> = ({ onViewChange, cameraQuaternion }) => {
    return (
        <div className="absolute bottom-4 right-4 w-32 h-32 z-10 pointer-events-auto">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 40 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 5, 5]} intensity={0.5} />
                <ViewCubeInner 
                    onViewChange={onViewChange} 
                    mainCameraQuaternion={cameraQuaternion}
                />
            </Canvas>
            {/* Labels overlay */}
            <div className="absolute bottom-0 left-0 right-0 text-center text-[10px] text-gray-400 pointer-events-none">
                LMB: Rotate | RMB: Pan | Scroll: Zoom
            </div>
        </div>
    );
};
