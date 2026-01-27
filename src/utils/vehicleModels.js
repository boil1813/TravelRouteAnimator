import * as THREE from 'three';

export const create3DVehicle = (type) => {
    const group = new THREE.Group();
    
    // Materials
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const glassMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x81d4fa, 
        transparent: true, 
        opacity: 0.6, 
        metalness: 0.9, 
        roughness: 0.1 
    });
    
    const createWheels = (xOffset, zOffset, yPos = 0.5) => {
        const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 16);
        wheelGeo.rotateX(Math.PI / 2);
        
        const w1 = new THREE.Mesh(wheelGeo, wheelMaterial);
        w1.position.set(xOffset, yPos, zOffset);
        
        const w2 = new THREE.Mesh(wheelGeo, wheelMaterial);
        w2.position.set(xOffset, yPos, -zOffset);
        
        return [w1, w2];
    };

    if (type === 'plane') {
        const bodyColor = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); 
        const wingColor = new THREE.MeshStandardMaterial({ color: 0x2196f3, roughness: 0.5 });

        // Fuselage
        const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 4, 4, 8), bodyColor);
        fuselage.rotation.z = Math.PI / 2;
        fuselage.position.y = 8; 
        group.add(fuselage);

        // Wings
        const wings = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 10), wingColor);
        wings.position.set(0, 8, 0);
        group.add(wings);

        // Tail
        const tail = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 3), wingColor);
        tail.position.set(-2, 8.5, 0);
        group.add(tail);
        
        // Propeller
        const prop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.2), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        prop.position.set(2.2, 8, 0);
        group.add(prop);
        
        // Shadow Mesh (Invisible circle on ground)
        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(3, 16),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.1;
        group.add(shadow);
        
        group.userData.isPlane = true;

    } else if (type === 'bus') {
        const busColor = new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.4 }); 

        const body = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 2.4), busColor);
        body.position.y = 2.0; 
        group.add(body);
        
        const windows = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1, 2.5), glassMaterial);
        windows.position.y = 2.5;
        group.add(windows);

        createWheels(1.8, 1.2, 0.6).forEach(w => group.add(w));
        createWheels(-1.8, 1.2, 0.6).forEach(w => group.add(w));

    } else {
        let carColorHex = 0xd32f2f;
        if (type === 'car-blue') carColorHex = 0x1976d2;
        const carMat = new THREE.MeshStandardMaterial({ color: carColorHex, roughness: 0.4, metalness: 0.3 });

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 1.8), carMat);
        chassis.position.y = 1.0;
        group.add(chassis);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.6), glassMaterial);
        cabin.position.set(-0.2, 2.1, 0);
        group.add(cabin);
        
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1.6), carMat);
        roof.position.set(-0.2, 2.65, 0);
        group.add(roof);

        createWheels(1.0, 1.0, 0.6).forEach(w => group.add(w));
        createWheels(-1.0, 1.0, 0.6).forEach(w => group.add(w));
        
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffeb3b, emissiveIntensity: 1 });
        const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.4), lightMat);
        hl1.position.set(1.75, 1.2, 0.5);
        group.add(hl1);
        const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.4), lightMat);
        hl2.position.set(1.75, 1.2, -0.5);
        group.add(hl2);
    }
    
    return group;
};
