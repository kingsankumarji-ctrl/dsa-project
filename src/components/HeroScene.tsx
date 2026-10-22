import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroScene() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, element.clientWidth / element.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 8);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(element.clientWidth, element.clientHeight);
    element.appendChild(renderer.domElement);

    const nucleus = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.15, 0.012, 240, 10, 2, 5),
      new THREE.MeshBasicMaterial({ color: 0x56e8ff, transparent: true, opacity: 0.9 }),
    );
    scene.add(nucleus);
    const ringMaterials = [0x9c6cff, 0xff60db, 0x55cfff].map(color =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, wireframe: true }),
    );
    const rings = [1.9, 2.2, 2.55].map((radius, index) => {
      const ring = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 16), ringMaterials[index]);
      ring.rotation.set(index * 0.7, index * 0.45, index * 0.9);
      scene.add(ring);
      return ring;
    });
    const positions = new Float32Array(900 * 3);
    for (let index = 0; index < positions.length; index += 3) {
      positions[index] = (Math.random() - 0.5) * 14;
      positions[index + 1] = (Math.random() - 0.5) * 10;
      positions[index + 2] = (Math.random() - 0.5) * 7;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0x85aaff, size: 0.018, transparent: true, opacity: 0.68 }));
    scene.add(particles);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 0.25;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 0.2;
    };
    const onResize = () => {
      if (!element.clientWidth || !element.clientHeight) return;
      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(element.clientWidth, element.clientHeight);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('resize', onResize);
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const time = clock.getElapsedTime();
      if (!reducedMotion) {
        nucleus.rotation.x = time * 0.12;
        nucleus.rotation.y = time * 0.19;
        rings.forEach((ring, index) => { ring.rotation.z += 0.0008 * (index + 1); });
        particles.rotation.y = time * 0.012;
      }
      camera.position.x += (pointerX - camera.position.x) * 0.025;
      camera.position.y += (-pointerY - camera.position.y) * 0.025;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    });
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      renderer.dispose();
      element.removeChild(renderer.domElement);
    };
  }, []);
  return <div className="hero-scene" ref={host} aria-hidden="true" />;
}
