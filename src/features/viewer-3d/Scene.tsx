
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ShellMesh } from './ShellMesh';

export const Scene: React.FC = () => {
    return (
        <Canvas
            camera={{ position: [4000, 3000, 4000], fov: 45, far: 30000 }}
            className="srm-w-full srm-h-full srm-bg-[#141218]" // Consistent background
            gl={{ antialias: true, alpha: true }}
        >
            <ambientLight intensity={0.6} />
            <directionalLight position={[2000, 3000, 3000]} intensity={0.8} />
            <directionalLight position={[-2000, 1000, -2000]} intensity={0.4} />

            <gridHelper args={[5000, 50, 0x333333, 0x2222_22]} />

            <ShellMesh />

            <OrbitControls makeDefault enableDamping maxDistance={20000} />
        </Canvas>
    );
};
