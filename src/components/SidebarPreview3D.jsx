import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { create3DVehicle } from '../utils/vehicleModels';

const SidebarPreview3D = ({ vehicle }) => {
    const mountRef = useRef(null);

    useEffect(() => {
        const width = 100;
        const height = 80;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8f9fa);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(8, 6, 8);
        camera.lookAt(0, 2, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        mountRef.current.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 5);
        scene.add(dirLight);

        // Vehicle
        let model = create3DVehicle(vehicle);
        scene.add(model);

        const animate = () => {
            requestAnimationFrame(animate);
            model.rotation.y += 0.015;
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [vehicle]);

    return (
        <div 
            ref={mountRef} 
            className="border rounded shadow-sm overflow-hidden" 
            style={{ width: '100px', height: '80px', backgroundColor: '#f8f9fa' }}
        />
    );
};

export default SidebarPreview3D;
