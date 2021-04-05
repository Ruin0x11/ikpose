import * as THREE from "three";

export class IKData {
    public limitMin: THREE.Vector3 = new THREE.Vector3();
    public limitMax: THREE.Vector3 = new THREE.Vector3();
    public target: THREE.Mesh;
    public boneRatio: number = 1;

    constructor(public indices: Array<number>, public name: string) {

    }

    public addToScene(scene: THREE.Scene) {
        if (this.target) {
            scene.add(this.target)
        } else {
            throw new Error("Target not ready!")
        }
    }

    public dispose() {
        if (this.target) {
            this.target.parent.remove(this.target);
        }
    }
}
