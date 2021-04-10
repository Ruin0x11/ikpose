import { SimpleEventDispatcher } from "strongly-typed-events";
import * as THREE from "three";
import * as BoneUtils from "./BoneUtils";

export class BoneAttachController {
    private boneList: THREE.Bone[];

    private parentIndexs: any = {};
    private containerList: Array<THREE.Mesh> = [];
    private updateAll: boolean = true;
    public object3d: THREE.Group;
    private defaultBoneMatrixs: Array<any> = [];

    private visible: boolean = true;

    private _boneMatrix: THREE.Matrix4;
    private _matrixWorldInv: THREE.Matrix4;
    private _quaternion: THREE.Quaternion;
    private boundingBox: THREE.Box3;

    private boxMaterial: THREE.Material;
    private translateBoxMaterial: THREE.Material;
    private boxGeometry: THREE.BufferGeometry;
    private translateBoxGeometry: THREE.BufferGeometry;

    constructor(private readonly root: THREE.Group, color: number = 0x008800, boxSize: number = .05, visible: boolean = false) {
        var material = { color: color, depthTest: false, transparent: true, opacity: .25 };

        this.boxMaterial = new THREE.MeshPhongMaterial(material)

        var translateMaterial = { color: 0x880088, depthTest: false, transparent: true, opacity: .25 };
        this.translateBoxMaterial = new THREE.MeshPhongMaterial(translateMaterial)

        this.boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize)
        this.translateBoxGeometry = new THREE.BoxGeometry(boxSize * 2, boxSize * 2, boxSize * 2)

        this.root = root;
        root.updateMatrixWorld(true);
        this.boneList = BoneUtils.getBoneList(root);

        this.object3d = new THREE.Group();

        this.defaultBoneMatrixs = [];

        var scope = this;
        this.boneList.forEach(function(bone: THREE.Bone) {
            var name = bone.name;
            var list = [];
            while (bone && bone instanceof THREE.Bone) {
                list.push(bone);
                bone = bone.parent as THREE.Bone;
            }
            scope.parentIndexs[name] = list;
            var container = new THREE.Mesh(scope.boxGeometry, scope.boxMaterial);
            container.name = "bac-" + name;
            container.renderOrder = 1;
            container.visible = false;
            container.userData.transformSelectionType = "Joint";
            container.userData.bone = list[0];
            container.userData.isTargetable = false;
            container.userData.canTranslate = false;
            container.userData.ikPosition = new THREE.Vector3();
            container.userData.parentId = scope.object3d.id
            scope.containerList.push(container);
            // scope.object3d.add(container);
            list[0].add(container)
            // container.matrixAutoUpdate = true;
            container.updateMatrixWorld(true)
        });

        //default hide all
        this.setVisible(this.visible);

        this._boneMatrix = new THREE.Matrix4();
        this._matrixWorldInv = new THREE.Matrix4();
        this._quaternion = new THREE.Quaternion();

        this.update();

        this.boneList.forEach(function(bone) {
            scope.defaultBoneMatrixs.push(bone.matrixWorld.clone());
        });
    };

    setParentObject(parent: THREE.Object3D) {
        parent.add(this.object3d);
    }

    dispose() {
        var object3d = this.object3d;
        if (object3d.parent != null) {
            object3d.parent.remove(object3d);
        }
    }

    setCanTranslate(boneName: string, enabled: boolean) {
        let index = this.getBoneIndexByBoneName(boneName);
        let mesh = this.containerList[index]
        mesh.userData.canTranslate = enabled

        if (enabled) {
            mesh.geometry = this.translateBoxGeometry
            mesh.material = this.translateBoxMaterial
        } else {
            mesh.geometry = this.boxGeometry
            mesh.material = this.boxMaterial
        }
    }

    targetBones(boneNames: Set<string>, target: boolean) {
        for (let mesh of this.containerList) {
            if (boneNames.has(mesh.userData.bone.name)) {
                if (target) {
                    mesh.userData.isTargetable = true;
                } else {
                    mesh.userData.isTargetable = false;
                    mesh.visible = false
                }
            }
        }
    }

    getBoneList() {
        return this.boneList;
    }
    clonePositionAt(index: number) {
        return this.containerList[index].position.clone();
    }
    getContainerList(): Array<THREE.Mesh> {
        return this.containerList;
    }
    getDefaultBonePosition(index: number) {
        var matrix = this.defaultBoneMatrixs[index];
        var position = new THREE.Vector3();

        this._matrixWorldInv.copy(this.object3d.matrixWorld).invert();
        this._boneMatrix.multiplyMatrices(this._matrixWorldInv, matrix);
        position.setFromMatrixPosition(this._boneMatrix);

        return position;
    }
    getBoneIndexByBoneName(name: string) {
        var index = -1;
        for (var i = 0; i < this.boneList.length; i++) {
            if (this.boneList[i].name == name) {
                index = i;
                break;
            }
        }
        return index;
    }
    getContainerByBoneIndex(index: number) {
        if (index < 0) {
            console.log("BoneAttachControler.getContainerByBoneIndex:index must be 0 or greater," + index);
            return null;
        }
        return this.containerList[index];
    }

    getContainerByBoneName(name: string) {
        var index = this.getBoneIndexByBoneName(name);
        if (index == -1) {
            console.log("BoneAttachControler.getContainerByBoneName:not containe," + name);
            return null;
        }
        return this.containerList[index];
    }

    getContainerByBoneEndName(name: string) {
        var index = BoneUtils.findBoneIndexByEndsName(this.boneList, name);
        if (index == -1) {
            console.log("BoneAttachControler.getContainerByBoneName:not containe," + name);
            return null;
        }
        return this.containerList[index];
    }

    updateOne(i: number) {
        let cube = this.containerList[i];
        let bone = this.boneList[i];
        if (!this.updateAll && cube.children.length == 0) {
            return
        }

        bone.updateMatrixWorld(true);//without update, deley few frame position

        this._boneMatrix.multiplyMatrices(this._matrixWorldInv, bone.matrixWorld);
        cube.userData.ikPosition.setFromMatrixPosition(this._boneMatrix);

        // //Only This one OK!
        // bone.getWorldQuaternion(cube.quaternion);
        // cube.quaternion.multiply(this._quaternion);
        // cube.updateMatrixWorld(true);//for attach
    }

    updateMatrix() {
        this._matrixWorldInv.copy(this.object3d.matrixWorld).invert();
        this.object3d.getWorldQuaternion(this._quaternion);
    }

    //if delay frame call ap.skinnedMesh.updateMatrixWorld(true);
    update(forceUpdateMatrixWorld: boolean = false) {
        if (forceUpdateMatrixWorld) {
            this.root.updateMatrixWorld(true);
        }

        this.updateMatrix();

        for (var i = 0; i < this.boneList.length; i++) {
            this.updateOne(i);
        }
    }

    setVisible(visible: boolean) {
        this.containerList.forEach(function(container) {
            (container.material as THREE.Material).visible = visible;
        });
    }
    setVisibleAll(visible) {
        this.containerList.forEach(function(container) {
            container.traverse(function(obj) {
                if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
                    obj.material.visible = visible;
                }
            });

        });
    }

    computeBoundingBox() {
        if (this.containerList.length < 2) {
            console.log("computeBoundingBox need at least 2 bone");
            return;
        }

        var startIndex = 1;
        if (this.containerList[1].name == "bac-Global") {
            startIndex = 2;
        }
        if (this.containerList.length > 2 && this.containerList[2].name == "bac-Position")
            startIndex = 3;

        //ignore root
        var pos = this.containerList[3].position;
        var minX = pos.x;
        var minY = pos.y;
        var minZ = pos.z;
        var maxX = pos.x;
        var maxY = pos.y;
        var maxZ = pos.z;
        for (var i = startIndex + 1; i < this.containerList.length; i++) {
            pos = this.containerList[i].position;
            if (pos.x < minX) minX = pos.x;
            if (pos.y < minY) { minY = pos.y; }
            if (pos.z < minZ) minZ = pos.z;
            if (pos.x > maxX) maxX = pos.x;
            if (pos.y > maxY) maxY = pos.y;
            if (pos.z > maxZ) maxZ = pos.z;
        }
        var minBox = new THREE.Vector3(minX, minY, minZ);
        var maxBox = new THREE.Vector3(maxX, maxY, maxZ);
        this.boundingBox = new THREE.Box3(minBox, maxBox);
    }

    setAllScale(scale) {
        this.containerList.forEach(function(container) {
            container.scale.setScalar(scale);
        });

    }
}
