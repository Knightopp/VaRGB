import React, { useRef, useEffect } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

import './LiquidChrome.css';

export interface LiquidChromeProps extends React.HTMLAttributes<HTMLDivElement> {
  baseColor?: [number, number, number];
  speed?: number;
  amplitude?: number;
  frequencyX?: number;
  frequencyY?: number;
  interactive?: boolean;
}

export const LiquidChrome: React.FC<LiquidChromeProps> = ({
  baseColor = [0.1, 0.1, 0.1],
  speed = 0.2,
  amplitude = 0.3,
  frequencyX = 3,
  frequencyY = 3,
  interactive = true,
  className = '',
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const programRef = useRef<Program | null>(null);
  const propsRef = useRef({ baseColor, speed, amplitude, frequencyX, frequencyY, interactive });
  propsRef.current = { baseColor, speed, amplitude, frequencyX, frequencyY, interactive };

  // Update uniforms when props change without destroying WebGL context
  useEffect(() => {
    if (!programRef.current) return;
    const program = programRef.current;
    if (program.uniforms.uBaseColor) {
      (program.uniforms.uBaseColor.value as Float32Array).set(baseColor);
    }
    if (program.uniforms.uAmplitude) {
      program.uniforms.uAmplitude.value = amplitude;
    }
    if (program.uniforms.uFrequencyX) {
      program.uniforms.uFrequencyX.value = frequencyX;
    }
    if (program.uniforms.uFrequencyY) {
      program.uniforms.uFrequencyY.value = frequencyY;
    }
  }, [baseColor[0], baseColor[1], baseColor[2], amplitude, frequencyX, frequencyY]);

  // Initialize WebGL ONLY ONCE on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      antialias: true,
      powerPreference: 'high-performance',
    });
    const gl = renderer.gl;
    gl.clearColor(0.03, 0.03, 0.03, 1);

    const vertexShader = `
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec3 uResolution;
      uniform vec3 uBaseColor;
      uniform float uAmplitude;
      uniform float uFrequencyX;
      uniform float uFrequencyY;
      uniform vec2 uMouse;
      varying vec2 vUv;

      vec4 renderImage(vec2 uvCoord) {
          vec2 fragCoord = uvCoord * uResolution.xy;
          vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);

          for (float i = 1.0; i < 10.0; i++){
              uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
              uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
          }

          vec2 diff = (uvCoord - uMouse);
          float dist = length(diff);
          float falloff = exp(-dist * 20.0);
          float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
          uv += (diff / (dist + 0.0001)) * ripple * falloff;

          vec3 color = uBaseColor / max(abs(sin(uTime - uv.y - uv.x)), 0.04);
          return vec4(clamp(color, 0.0, 1.0), 1.0);
      }

      void main() {
          gl_FragColor = renderImage(vUv);
      }
    `;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Float32Array([gl.canvas.width, gl.canvas.height, gl.canvas.width / (gl.canvas.height || 1)])
        },
        uBaseColor: { value: new Float32Array(propsRef.current.baseColor) },
        uAmplitude: { value: propsRef.current.amplitude },
        uFrequencyX: { value: propsRef.current.frequencyX },
        uFrequencyY: { value: propsRef.current.frequencyY },
        uMouse: { value: new Float32Array([0, 0]) }
      }
    });
    programRef.current = program;
    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!container) return;
      const width = container.offsetWidth || window.innerWidth;
      const height = container.offsetHeight || window.innerHeight;
      renderer.setSize(width, height);
      const resUniform = program.uniforms.uResolution.value as Float32Array;
      resUniform[0] = gl.canvas.width;
      resUniform[1] = gl.canvas.height;
      resUniform[2] = gl.canvas.width / (gl.canvas.height || 1);
    }
    window.addEventListener('resize', resize);
    resize();

    function handleMouseMove(event: MouseEvent) {
      if (!container || !propsRef.current.interactive) return;
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / (rect.width || 1);
      const y = 1 - (event.clientY - rect.top) / (rect.height || 1);
      const mouseUniform = program.uniforms.uMouse.value as Float32Array;
      mouseUniform[0] = x;
      mouseUniform[1] = y;
    }

    if (interactive) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    let animationId: number;
    function update(t: number) {
      animationId = requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 0.001 * propsRef.current.speed;
      renderer.render({ scene: mesh });
    }
    animationId = requestAnimationFrame(update);

    container.appendChild(gl.canvas);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (interactive) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      programRef.current = null;
      if (gl.canvas.parentElement) {
        gl.canvas.parentElement.removeChild(gl.canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []); // Run ONLY once on mount; NEVER re-create WebGL context on animation ticks

  return <div ref={containerRef} className={`liquidChrome-container ${className}`} {...props} />;
};

export default LiquidChrome;
