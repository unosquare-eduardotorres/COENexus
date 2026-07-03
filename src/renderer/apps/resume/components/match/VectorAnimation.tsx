import { useRef, useEffect, useCallback } from 'react';

interface VectorAnimationProps {
  isActive: boolean;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  phase: number;
}

const NODE_COUNT = 80;
const CONNECTION_DISTANCE = 220;
const ROTATION_SPEED = 0.0003;

export default function VectorAnimation({ isActive }: VectorAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>(0);
  const angleRef = useRef(0);
  const timeRef = useRef(0);

  const initNodes = useCallback((width: number, height: number) => {
    const nodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        baseRadius: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    nodesRef.current = nodes;
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (nodesRef.current.length === 0) {
        initNodes(canvas.width, canvas.height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      timeRef.current += 0.016;
      angleRef.current += ROTATION_SPEED;
      const time = timeRef.current;
      const angle = angleRef.current;

      const cx = width / 2;
      const cy = height / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const nodes = nodesRef.current;
      const transformed: { x: number; y: number }[] = [];

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        node.x = Math.max(0, Math.min(width, node.x));
        node.y = Math.max(0, Math.min(height, node.y));

        const dx = node.x - cx;
        const dy = node.y - cy;
        transformed.push({
          x: cx + dx * cosA - dy * sinA,
          y: cy + dx * sinA + dy * cosA,
        });
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = transformed[i].x - transformed[j].x;
          const dy = transformed[i].y - transformed[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DISTANCE) {
            const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.5;
            const gradient = ctx.createLinearGradient(
              transformed[i].x, transformed[i].y,
              transformed[j].x, transformed[j].y
            );
            gradient.addColorStop(0, `rgba(16, 185, 129, ${opacity})`);
            gradient.addColorStop(1, `rgba(99, 102, 241, ${opacity})`);

            ctx.beginPath();
            ctx.moveTo(transformed[i].x, transformed[i].y);
            ctx.lineTo(transformed[j].x, transformed[j].y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const t = transformed[i];
        const pulse = 1 + 0.3 * Math.sin(time * 2 + node.phase);
        const radius = node.baseRadius * pulse;

        const grd = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, radius * 3);
        grd.addColorStop(0, i % 2 === 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(99, 102, 241, 0.8)');
        grd.addColorStop(0.5, i % 2 === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)');
        grd.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(t.x, t.y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(99, 102, 241, 0.9)';
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, initNodes]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}
