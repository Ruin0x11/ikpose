import * as THREE from "three";

export function printDeg(xyz: THREE.Euler, text: string) {
    text = text !== undefined ? text : "";
    console.log(THREE.MathUtils.radToDeg(xyz.x), THREE.MathUtils.radToDeg(xyz.y), THREE.MathUtils.radToDeg(xyz.z), text)
}

export function removeAllFromArray<T>(array: Array<T>, removes: Array<T>): Array<T> {
    removes.forEach(function(remove: T) {
        var index = array.indexOf(remove);
        if (index == -1) {
            //TODO logging
            //console.log("removeAllFromArray:not contain",remove);
        } else {
            array.splice(index, 1);
        }

    });
    return array;
}

export function lineTo(mesh1: THREE.Mesh, mesh2: THREE.Mesh) {
    const points = []
    points.push(new THREE.Vector3());
    points.push(mesh2.position.clone());

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    var material = new THREE.LineBasicMaterial({ color: 0xaaaacc });

    var joint = new THREE.Line(geo, material);
    mesh1.add(joint);
    return joint;
}

export function enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
    return Object.keys(obj) as K[];
}

export function stringMapToObject(strMap) {
    let obj = Object.create(null);
    for (let [k, v] of strMap) {
        // We don’t escape the key '__proto__'
        // which can cause problems on older engines
        obj[k] = v;
    }
    return obj;
}
