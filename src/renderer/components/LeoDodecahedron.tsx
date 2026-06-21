import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { LeoFlowrider } from '../store';

interface LeoDodecahedronProps {
  flowriders: LeoFlowrider[];
  selectedFlowrider: string | null;
  onFlowriderClick: (id: string) => void;
}

/**
 * LeoDodecahedron - 3D visualization of the LEO network
 *
 * A dodecahedron (12 faces) + 8 vertices = 20 points for 20 flowriders.
 * This represents the meta-level orchestration of multiple Flowrider instances.
 *
 * While each Flowrider uses an icosahedron (20 faces) for its 20 sessions,
 * LEO uses a dodecahedron-inspired layout for its 20 flowriders.
 */
export const LeoDodecahedron: React.FC<LeoDodecahedronProps> = ({
  flowriders,
  selectedFlowrider,
  onFlowriderClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  // Generate 20 evenly distributed points on a sphere
  // Using the Fibonacci sphere algorithm for even distribution
  const nodePositions = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const n = 20;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < n; i++) {
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / n);
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(phi);
      positions.push(new THREE.Vector3(x * 2, y * 2, z * 2));
    }

    return positions;
  }, []);

  // Animate the core
  useFrame((state) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.005;
      coreRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  // Get status color for a flowrider
  const getStatusColor = (status: LeoFlowrider['status']) => {
    switch (status) {
      case 'active':
        return '#00ff88';
      case 'busy':
        return '#ffcc00';
      case 'error':
        return '#ff4444';
      default:
        return '#666666';
    }
  };

  // Create connection lines between active flowriders
  const connections = useMemo(() => {
    const lines: { start: THREE.Vector3; end: THREE.Vector3; color: string }[] = [];
    const activeIndices = flowriders
      .map((fr, idx) => ({ fr, idx }))
      .filter(({ fr }) => fr.status === 'active' || fr.status === 'busy');

    // Connect each active flowrider to the center
    activeIndices.forEach(({ idx }) => {
      if (idx < nodePositions.length) {
        lines.push({
          start: new THREE.Vector3(0, 0, 0),
          end: nodePositions[idx],
          color: 'rgba(0, 255, 255, 0.3)',
        });
      }
    });

    return lines;
  }, [flowriders, nodePositions]);

  return (
    <group ref={groupRef}>
      {/* Central LEO Core */}
      <mesh ref={coreRef}>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color="#ff00ff"
          emissive="#ff00ff"
          emissiveIntensity={0.3}
          wireframe
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.1} />
      </mesh>

      {/* Connection lines */}
      {connections.map((conn, idx) => (
        <line key={`conn-${idx}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                conn.start.x, conn.start.y, conn.start.z,
                conn.end.x, conn.end.y, conn.end.z,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00ffff" transparent opacity={0.4} />
        </line>
      ))}

      {/* Flowrider nodes */}
      {nodePositions.map((pos, idx) => {
        const flowrider = flowriders[idx];
        const isSelected = flowrider?.id === selectedFlowrider;
        const statusColor = flowrider ? getStatusColor(flowrider.status) : '#333';
        const isActive = flowrider && flowrider.status !== 'idle';

        return (
          <group key={idx} position={pos}>
            {/* Node sphere */}
            <mesh
              onClick={() => flowrider && onFlowriderClick(flowrider.id)}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[isSelected ? 0.2 : 0.15, 16, 16]} />
              <meshStandardMaterial
                color={statusColor}
                emissive={statusColor}
                emissiveIntensity={isActive ? 0.5 : 0.1}
              />
            </mesh>

            {/* Selection ring */}
            {isSelected && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.25, 0.3, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
              </mesh>
            )}

            {/* Glow ring for active nodes */}
            {isActive && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.18, 0.22, 32]} />
                <meshBasicMaterial color={statusColor} transparent opacity={0.3} />
              </mesh>
            )}

            {/* Node number label */}
            <Html
              center
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              position={[0, 0.35, 0]}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: flowrider ? statusColor : '#444',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  textShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}
              >
                {flowrider ? (idx + 1) : ''}
              </div>
            </Html>

            {/* Session count for active nodes */}
            {flowrider && isActive && (
              <Html
                center
                style={{
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
                position={[0, -0.35, 0]}
              >
                <div
                  style={{
                    fontSize: '8px',
                    color: '#888',
                    fontFamily: 'monospace',
                    textShadow: '0 0 4px rgba(0,0,0,0.8)',
                  }}
                >
                  {flowrider.activeSessions}/{flowrider.totalSessions}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 2.55, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
      </mesh>
    </group>
  );
};

export default LeoDodecahedron;
