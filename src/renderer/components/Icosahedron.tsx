import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Session } from '../store';
import { Html } from '@react-three/drei';

interface IcosahedronProps {
  sessions: Session[];
  selectedFace: number | null;
  onFaceClick: (faceIndex: number) => void;
  showPreviews?: boolean;
}

const STATUS_COLORS = {
  empty: '#333333',
  active: '#00ff88',
  attached: '#00ffff',
};

const GLOW_COLORS = {
  empty: new THREE.Color('#222222'),
  active: new THREE.Color('#00ff88'),
  attached: new THREE.Color('#00ffff'),
};

// Activity level affects pulse speed and intensity
const ACTIVITY_PULSE_SPEED = {
  idle: 1,
  low: 2,
  medium: 4,
  high: 8,
};

const ACTIVITY_GLOW_INTENSITY = {
  idle: 0.3,
  low: 0.5,
  medium: 0.7,
  high: 1.0,
};

// Attention indicator - slow pulsating effect
const ATTENTION_PULSE_SPEED = 1.5; // Slow, noticeable pulse
const ATTENTION_COLOR = '#ff4444'; // Red/orange for attention needed

export const Icosahedron: React.FC<IcosahedronProps> = ({
  sessions,
  selectedFace,
  onFaceClick,
  showPreviews = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const glowRingsRef = useRef<THREE.Group>(null);
  const attentionRingsRef = useRef<THREE.Group>(null);
  const [hoveredFace, setHoveredFace] = useState<number | null>(null);

  // Track mouse down position to distinguish click from drag
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  // Create icosahedron geometry
  const { geometry, faceData } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2, 0);
    const positions = geo.attributes.position;
    const faceCount = positions.count / 3;

    const faces: Array<{
      index: number;
      centroid: THREE.Vector3;
      normal: THREE.Vector3;
      color: string;
    }> = [];

    for (let i = 0; i < faceCount; i++) {
      const session = sessions[i];
      const color = STATUS_COLORS[session?.status || 'empty'];

      // Calculate centroid and normal for each face
      const v1 = new THREE.Vector3().fromBufferAttribute(positions, i * 3);
      const v2 = new THREE.Vector3().fromBufferAttribute(positions, i * 3 + 1);
      const v3 = new THREE.Vector3().fromBufferAttribute(positions, i * 3 + 2);

      const centroid = new THREE.Vector3()
        .add(v1).add(v2).add(v3)
        .divideScalar(3);

      const normal = centroid.clone().normalize();

      const extendedCentroid = normal.clone().multiplyScalar(2.15);

      faces.push({ index: i, centroid: extendedCentroid, normal, color });
    }

    return { geometry: geo, faceData: faces };
  }, [sessions]);

  // Create vertex colors with animation support
  const colors = useMemo(() => {
    const colorArray = new Float32Array(geometry.attributes.position.count * 3);

    for (let i = 0; i < faceData.length; i++) {
      const isSelected = selectedFace === i;
      const isHovered = hoveredFace === i;
      const baseColor = new THREE.Color(faceData[i].color);

      if (isSelected) {
        baseColor.multiplyScalar(1.8);
      } else if (isHovered) {
        baseColor.multiplyScalar(1.4);
      }

      const baseIndex = i * 9;
      for (let j = 0; j < 3; j++) {
        const offset = baseIndex + j * 3;
        colorArray[offset] = baseColor.r;
        colorArray[offset + 1] = baseColor.g;
        colorArray[offset + 2] = baseColor.b;
      }
    }

    return colorArray;
  }, [faceData, selectedFace, hoveredFace, geometry]);

  // Update geometry colors
  React.useEffect(() => {
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.attributes.color.needsUpdate = true;
  }, [colors, geometry]);

  // Animation frame for pulsing effects
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Sync edges rotation with mesh
    if (edgesRef.current && meshRef.current) {
      edgesRef.current.rotation.copy(meshRef.current.rotation);
    }

    // Sync glow rings
    if (glowRingsRef.current && meshRef.current) {
      glowRingsRef.current.rotation.copy(meshRef.current.rotation);
    }

    // Animate glow rings with activity-based speed
    if (glowRingsRef.current) {
      glowRingsRef.current.children.forEach((child, index) => {
        const session = sessions[index];
        if (session?.status !== 'empty') {
          // Get activity level for pulse speed
          const activityLevel = session.activityLevel || 'idle';
          const pulseSpeed = ACTIVITY_PULSE_SPEED[activityLevel];
          const glowIntensity = ACTIVITY_GLOW_INTENSITY[activityLevel];

          // Pulsing scale effect - faster for higher activity
          const pulse = 1 + Math.sin(time * pulseSpeed + index * 0.5) * 0.15 * glowIntensity;
          child.scale.setScalar(pulse);

          // Pulsing opacity - brighter for higher activity
          const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (material) {
            const baseOpacity = 0.2 + glowIntensity * 0.3;
            material.opacity = baseOpacity + Math.sin(time * pulseSpeed * 0.7 + index * 0.3) * 0.2;
          }
        }
      });
    }

    // Sync attention rings rotation
    if (attentionRingsRef.current && meshRef.current) {
      attentionRingsRef.current.rotation.copy(meshRef.current.rotation);
    }

    // Animate attention rings - slow, dramatic pulsing for sessions needing attention
    if (attentionRingsRef.current) {
      attentionRingsRef.current.children.forEach((child, index) => {
        const session = sessions[index];
        if (session?.needsAttention) {
          // Slow, dramatic pulse
          const pulse = 1 + Math.sin(time * ATTENTION_PULSE_SPEED) * 0.3;
          child.scale.setScalar(pulse);

          // Pulsing opacity - dramatic fade in/out
          const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (material) {
            material.opacity = 0.4 + Math.sin(time * ATTENTION_PULSE_SPEED * 0.8) * 0.3;
          }
        }
      });
    }
  });

  // Track pointer down for click vs drag detection
  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    mouseDownPos.current = { x: event.clientX, y: event.clientY };
  }, []);

  // Handle click with raycasting - only if it wasn't a drag
  const handlePointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!mouseDownPos.current) return;

    // Check if this was a drag (moved more than 5 pixels)
    const dx = Math.abs(event.clientX - mouseDownPos.current.x);
    const dy = Math.abs(event.clientY - mouseDownPos.current.y);
    const wasDrag = dx > 5 || dy > 5;

    mouseDownPos.current = null;

    if (wasDrag) return; // Don't fire click on drag

    // Get the face that was clicked
    const intersect = event.intersections?.[0];
    if (!intersect || intersect.faceIndex === undefined) return;

    const faceIndex = Math.floor(intersect.faceIndex);
    console.log('[Icosahedron] Face clicked:', faceIndex);
    onFaceClick(faceIndex);
  }, [onFaceClick]);

  // Handle hover
  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    const intersect = event.intersections?.[0];
    if (intersect && intersect.faceIndex !== undefined) {
      setHoveredFace(Math.floor(intersect.faceIndex));
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredFace(null);
  }, []);

  return (
    <group>
      {/* Main icosahedron */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.85}
          emissive="#111"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe edges with glow */}
      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color="#00ffff" linewidth={2} transparent opacity={0.7} />
      </lineSegments>

      {/* Pulsing glow rings for active sessions */}
      <group ref={glowRingsRef}>
        {faceData.map((face, index) => {
          const session = sessions[index];
          const isActive = session?.status !== 'empty';
          const isSelected = selectedFace === index;
          const isAttached = session?.status === 'attached';
          const hasRecentActivity = session?.hasRecentActivity;
          const activityLevel = session?.activityLevel || 'idle';

          if (!isActive) return null;

          // Color based on activity level
          const ringColor = isAttached ? '#00ffff' :
                           hasRecentActivity ? '#ffcc00' :
                           '#00ff88';

          // Ring size based on activity level
          const outerRadius = activityLevel === 'high' ? 0.3 :
                             activityLevel === 'medium' ? 0.27 :
                             activityLevel === 'low' ? 0.25 : 0.22;

          return (
            <group key={`glow-${index}`} position={face.centroid}>
              {/* Main ring */}
              <mesh>
                <ringGeometry args={[0.15, outerRadius, 32]} />
                <meshBasicMaterial
                  color={ringColor}
                  transparent
                  opacity={0.4}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Inner activity spark for high activity */}
              {(activityLevel === 'high' || activityLevel === 'medium') && (
                <mesh>
                  <circleGeometry args={[0.08, 16]} />
                  <meshBasicMaterial
                    color={hasRecentActivity ? '#ffcc00' : '#00ff88'}
                    transparent
                    opacity={0.6}
                  />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {/* Attention indicator rings - dramatic red pulsing for sessions needing attention */}
      <group ref={attentionRingsRef}>
        {faceData.map((face, index) => {
          const session = sessions[index];
          const needsAttention = session?.needsAttention;

          if (!needsAttention) return null;

          return (
            <group key={`attention-${index}`} position={face.centroid}>
              {/* Outer attention ring */}
              <mesh>
                <ringGeometry args={[0.35, 0.45, 32]} />
                <meshBasicMaterial
                  color={ATTENTION_COLOR}
                  transparent
                  opacity={0.5}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Inner attention ring */}
              <mesh>
                <ringGeometry args={[0.2, 0.3, 32]} />
                <meshBasicMaterial
                  color="#ff6644"
                  transparent
                  opacity={0.4}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Center attention dot */}
              <mesh>
                <circleGeometry args={[0.1, 16]} />
                <meshBasicMaterial
                  color="#ffaa00"
                  transparent
                  opacity={0.7}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Glow indicators for active/selected faces */}
      {faceData.map((face) => {
        const session = sessions[face.index];
        const isActive = session?.status !== 'empty';
        const isSelected = selectedFace === face.index;
        const isHovered = hoveredFace === face.index;

        if (!isActive && !isSelected && !isHovered) return null;

        return (
          <group key={face.index}>
            {/* Core indicator */}
            <mesh position={face.centroid}>
              <sphereGeometry args={[isSelected ? 0.15 : 0.1, 16, 16]} />
              <meshBasicMaterial
                color={isSelected ? '#ffffff' : face.color}
                transparent
                opacity={isSelected ? 0.95 : 0.7}
              />
            </mesh>

            {/* Outer glow for selected */}
            {isSelected && (
              <mesh position={face.centroid}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial
                  color="#00ffff"
                  transparent
                  opacity={0.2}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Session preview tooltips on hover */}
      {showPreviews && hoveredFace !== null && (
        <Html
          position={faceData[hoveredFace]?.centroid.clone().multiplyScalar(1.3)}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <SessionPreview session={sessions[hoveredFace]} faceIndex={hoveredFace} />
        </Html>
      )}
    </group>
  );
};

// Session preview tooltip component
interface SessionPreviewProps {
  session: Session;
  faceIndex: number;
}

const SessionPreview: React.FC<SessionPreviewProps> = ({ session, faceIndex }) => {
  const isActive = session?.status !== 'empty';

  return (
    <div
      style={{
        background: 'rgba(10, 10, 15, 0.95)',
        border: `1px solid ${isActive ? '#00ffff' : '#333'}`,
        borderRadius: 8,
        padding: '12px 16px',
        minWidth: 180,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{
          color: '#fff',
          fontWeight: 600,
          fontSize: 13,
        }}>
          Face #{String(faceIndex + 1).padStart(2, '0')}
        </span>
        <span style={{
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          background: isActive
            ? session.status === 'attached' ? 'rgba(0, 255, 255, 0.2)' : 'rgba(0, 255, 136, 0.2)'
            : 'rgba(100, 100, 100, 0.2)',
          color: isActive
            ? session.status === 'attached' ? '#00ffff' : '#00ff88'
            : '#666',
        }}>
          {session?.status || 'empty'}
        </span>
      </div>

      {isActive ? (
        <>
          <div style={{ color: '#ccc', fontSize: 12, marginBottom: 4 }}>
            {session.name}
          </div>
          <div style={{ color: '#666', fontSize: 11, fontFamily: 'monospace' }}>
            {session.workingDir}
          </div>

          {/* Attention indicator - needs human input */}
          {session.needsAttention && (
            <div style={{
              marginTop: 8,
              padding: '6px 8px',
              background: 'rgba(255, 68, 68, 0.15)',
              border: '1px solid #ff4444',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ff4444',
                animation: 'pulse 1s infinite',
                boxShadow: '0 0 8px #ff4444',
              }} />
              <span style={{
                fontSize: 10,
                color: '#ff6644',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>
                {session.attentionReason || 'Needs Attention'}
              </span>
            </div>
          )}

          {/* Activity indicator */}
          {session.activityLevel && session.activityLevel !== 'idle' && !session.needsAttention && (
            <div style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: session.activityLevel === 'high' ? '#ff4444' :
                           session.activityLevel === 'medium' ? '#ffcc00' : '#00ff88',
                animation: session.activityLevel === 'high' ? 'pulse 0.5s infinite' : 'none',
              }} />
              <span style={{
                fontSize: 10,
                color: session.activityLevel === 'high' ? '#ff4444' :
                       session.activityLevel === 'medium' ? '#ffcc00' : '#888',
                textTransform: 'uppercase',
              }}>
                {session.activityLevel} activity
              </span>
            </div>
          )}

          {session.estimatedCost > 0 && (
            <div style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
            }}>
              <span style={{ color: '#888' }}>Cost:</span>
              <span style={{ color: '#ffcc00', fontFamily: 'monospace' }}>
                ${session.estimatedCost.toFixed(4)}
              </span>
            </div>
          )}
        </>
      ) : (
        <div style={{ color: '#666', fontSize: 12 }}>
          Click to create session
        </div>
      )}
    </div>
  );
};
