import React, { useMemo } from 'react';
import * as THREE from 'three';

export const ShellMeshBase: React.FC<{ geometry: THREE.BufferGeometry }> = ({ geometry }) => {
    const hasValidGeometry = useMemo(() => {
        return geometry.getAttribute('position') !== undefined && geometry.getAttribute('position').count > 0;
    }, [geometry]);

    return (
        <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial
                color="#5a5560"
                metalness={0.4}
                roughness={0.6}
                side={THREE.DoubleSide}
                envMapIntensity={1.0}
            />
            {hasValidGeometry && (
                <lineSegments>
                    <edgesGeometry args={[geometry, 15]} />
                    <lineBasicMaterial color="#b8a3d6" linewidth={1} />
                </lineSegments>
            )}
        </mesh>
    );
};
