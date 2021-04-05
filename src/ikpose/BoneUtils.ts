import * as THREE from "three";

let logging: boolean = false;
const orders: Array<string> = ["XYZ", "XZY", "YXZ", "YZX", "ZXY", "ZYX"];
const d180: number = THREE.MathUtils.degToRad(180);
const d160: number = THREE.MathUtils.degToRad(160);

export function isD180(r: number) {
    return r == d180 || r == -d180;
}

/*
 * i'm not sure
 */
export function convertToIkSafeRoatation(rotation: THREE.Euler) {
    if (rotation.x == d180 && rotation.z == d180) {
        var before = rotation.clone();
        var r = THREE.MathUtils.radToDeg(rotation.y);
        if (r > 0) {
            r = 180 - r;
        } else {
            r = -180 - r;
        }
        rotation.set(0, THREE.MathUtils.degToRad(r), 0);
        //AppUtils.printDeg(before,"from");
        //AppUtils.printDeg(rotation,"converted a");
    } else if (rotation.z > d160) {
        var before = rotation.clone();
        var x = rotation.x > 0 ? -d180 + rotation.x : d180 + rotation.x;
        var y = rotation.y > 0 ? d180 - rotation.y : -d180 - rotation.y;
        var z = rotation.z - d180;
        rotation.set(x, y, z);
        //AppUtils.printDeg(before,"from");
        //AppUtils.printDeg(rotation,"converted b");
    } else if (rotation.z < -d160) {
        var before = rotation.clone();
        var x = rotation.x > 0 ? rotation.x - d180 : rotation.x + d180;
        var y = rotation.y > 0 ? d180 - rotation.y : -d180 - rotation.y;
        var z = rotation.z + d180;
        rotation.set(x, y, z);
        //AppUtils.printDeg(before,"from");
        //AppUtils.printDeg(rotation,"converted c");
    }
}

export class Bone {
    public pos: [number, number, number] = [0, 0, 0];
    public scl: [number, number, number] = [1, 1, 1];
    public rotq: [number, number, number, number] = [0, 0, 0, 1];

    constructor(readonly parent: number, readonly name: string) {
    }
}

export function createBonesFromPoints(positions, slices) {
    var separator = "-";
    var bones = [];
    var root = new Bone(-1, "root");
    bones.push(root);

    var horizontalVertexCount = slices + 1;
    var verticalVertexCount = positions.length / horizontalVertexCount;

    //set average
    var rootPos = new THREE.Vector3();
    for (var i = 0; i < horizontalVertexCount; i++) {
        rootPos.add(positions[i]);
    }
    rootPos.divideScalar(horizontalVertexCount);
    root.pos = rootPos.toArray();

    var boneIndex = 1;//index 0 added above
    for (var i = 0; i < horizontalVertexCount; i++) {
        var parent = 0;
        var parentPos = rootPos.clone();

        for (var j = 0; j < verticalVertexCount; j++) {

            var ind = (horizontalVertexCount) * j + i;

            var position = positions[ind];

            var childBone = new Bone(parent, i + separator + (j));

            childBone.pos = position.clone().sub(parentPos).toArray();
            bones.push(childBone);

            parent = boneIndex;
            boneIndex++;
            parentPos = position;
        }
    }

    return bones;
}

export function initializeIndicesAndWeights(geometry, index) {
    if (!geometry) {
        console.error("initializeIndicesAndWeights:geometry undefined or null");
        return;
    }
    if (!geometry.isGeometry) {
        console.error("initializeIndicesAndWeights:geometry only support Normal Geometry");
        return;
    }
    index = index !== undefined ? index : 0;
    geometry.skinIndices = [];
    geometry.skinWeights = [];
    for (var j = 0; j < geometry.vertices.length; j++) {
        geometry.skinIndices.push(new THREE.Vector4(index, 0, 0, 0));
        geometry.skinWeights.push(new THREE.Vector4(1.0, 0, 0, 0));
    }
}

export function copyIndicesAndWeights(fromGeo, toGeo) {
    if (!fromGeo) {
        console.error("copyIndicesAndWeights:fromGeo undefined or null");
    }
    if (!toGeo) {
        console.error("copyIndicesAndWeights:toGeo undefined or null");
    }
    if (!toGeo.isGeometry) {
        console.error("copyIndicesAndWeights:toGeo only support Normal Geometry");
    }

    toGeo.skinIndices = [];
    toGeo.skinWeights = [];

    if (fromGeo.isGeometry) {
        for (var j = 0; j < fromGeo.skinIndices.length; j++) {
            toGeo.skinIndices.push(fromGeo.skinIndices[i].clone());
            toGeo.skinWeights.push(fromGeo.skinWeights[i].clone());
        }
    } else if (fromGeo.isBufferGeometry) {
        var attributes = fromGeo.attributes;
        var indices = attributes.skinIndex.array;
        var weights = attributes.skinWeight.array;
        for (var i = 0; i < indices.length; i += 4) {
            toGeo.skinIndices.push(new THREE.Vector4(indices[i], indices[i + 1], indices[i + 2], indices[i + 3]));
            toGeo.skinWeights.push(new THREE.Vector4(weights[i], weights[i + 1], weights[i + 2], weights[i + 3]));
        }

    } else {
        console.error("copyIndicesAndWeights:toGeo is not Geometry nor BufferGeometry");
    }


}

// export function copyMorphTargets(fromGeo: THREE.BufferGeometry, toGeo: THREE.BufferGeometry) {
//     try {
//         var morphAttributes = fromGeo.morphAttributes;
//         if (morphAttributes.position == undefined) {
//             return;
//         }
//         var poses = morphAttributes.position;

//         toGeo.morphTargets = [];

//         poses.forEach(function(attribute) {
//             var name = attribute.name;
//             var count = attribute.count;
//             var array = attribute.array;

//             var target = { name: name, vertices: [] };
//             toGeo.morphTargets.push(target);

//             for (var i = 0; i < count; i++) {
//                 var vec = new THREE.Vector3(array[i * 3], array[i * 3 + 1], array[i * 3 + 2]);
//                 target.vertices.push(vec);
//             }

//         });
//     } catch (e) {
//         console.log(e);
//     }
// }


//copy from SkeletonHelper.js
export function getBoneList(obj: THREE.Object3D): THREE.Bone[] {
    var boneList: THREE.Bone[] = [];

    if (obj && obj instanceof THREE.Bone) {
        boneList.push(obj);
    }

    for (var i = 0; i < obj.children.length; i++) {
        const child = obj.children[i];
        boneList.push.apply(boneList, getBoneList(child));
    }

    return boneList;
}

export function makeBoneList(parent) {
    var bones = {};
    parent.traverse(function(obj) {
        if (obj.isBone) {
            bones[obj.uuid] = obj;
        }
    });

    return Object.values(bones);
}

//for Select id is key
export function getBoneIdOptions(object) {

    var boneList = getBoneList(object);
    var options = {};
    boneList.forEach(function(bone) {
        options[bone.id] = bone.name;
    });

    return options;

}

export function getBoneNameOptions(mesh: THREE.SkinnedMesh): Map<string, string> {

    var boneList = getBoneList(mesh);
    var options = new Map<string, string>();

    for (var i = 0; i < boneList.length; i++) {
        var bone = boneList[i];
        options[bone.name] = String(i);

    }

    return options;

}
//reverse for select1
export function boneListToOptions(boneList, reverse) {
    reverse = reverse == undefined ? false : reverse;

    var options = {};
    if (reverse) {
        for (var i = 0; i < boneList.length; i++) {
            var bone = boneList[i];
            options[String(i)] = bone.name;

        }
    } else {
        for (var i = 0; i < boneList.length; i++) {
            var bone = boneList[i];
            options[bone.name] = String(i);

        }
    }


    return options;

}

export function makeQuaternionFromXYZDegree(x: number, y: number, z: number, defaultEuler: THREE.Euler | null, order: string | null) {
    return makeQuaternionFromXYZRadian(THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z), defaultEuler, order);
}

export function makeQuaternionFromXYZRadian(x: number, y: number, z: number, defaultEuler: THREE.Euler | null, order: string | null) {
    defaultEuler = defaultEuler !== undefined ? defaultEuler : new THREE.Euler();
    order = order !== undefined ? order : "XYZ";

    var q = new THREE.Quaternion();

    var euler = new THREE.Euler(x + defaultEuler.x, y + defaultEuler.y, z + defaultEuler.z, order);

    q.setFromEuler(euler);

    return q;
}

export class BoneMatrix {
    constructor(public translate: THREE.Vector3, public scale: THREE.Vector3, public rotation: THREE.Euler) {
    }
}

export class BoneMatrixMap extends Map<string, BoneMatrix> {
    print() {
        Object.keys(this).forEach(function(key) {
            var rotation = this[key].rotation;
            if (rotation != undefined) {
                var x = THREE.MathUtils.radToDeg(rotation.x).toFixed(2);
                var y = THREE.MathUtils.radToDeg(rotation.y).toFixed(2);
                var z = THREE.MathUtils.radToDeg(rotation.z).toFixed(2);

                console.log(key, x, y, z);
            }
        });
    }
}

//use BoneUtils.getBoneList(mesh)
export function storeDefaultBoneMatrix(boneList: THREE.Bone[]): BoneMatrixMap {
    var defaultBoneMatrix = new BoneMatrixMap();
    boneList.forEach(function(bone) {
        var m = bone.matrix;
        var name = bone.name;

        let translate = new THREE.Vector3();
        translate.setFromMatrixPosition(m);

        let scale = new THREE.Vector3();
        scale.setFromMatrixScale(m);

        let rotation = new THREE.Euler();
        rotation.setFromRotationMatrix(m);
        defaultBoneMatrix[name] = new BoneMatrix(translate, scale, rotation);
    });

    return defaultBoneMatrix;
}

export function makeEmptyBoneMatrix(boneList: THREE.Bone[]): BoneMatrixMap {
    var defaultBoneMatrix = new BoneMatrixMap();
    var translate = new THREE.Vector3();
    var scale = new THREE.Vector3(1, 1, 1);
    var euler = new THREE.Euler();
    boneList.forEach(function(bone) {
        var name = bone.name;
        defaultBoneMatrix[name] = new BoneMatrix(translate.clone(), scale.clone(), euler.clone());
    });
    return defaultBoneMatrix;
}

export function findBoneIndexByBoneName(boneList: THREE.Bone[], name: string): number {
    return this.findBoneIndexByEndsName(boneList, name);
}

export function findBoneIndexByEndsName(boneList: THREE.Bone[], name: string): number {
    var index = -1;
    for (var i = 0; i < boneList.length; i++) {
        console.log(boneList[i].name.toLowerCase(), name.toLowerCase())
        if (boneList[i].name.toLowerCase().endsWith(name.toLowerCase())) {
            return i;
        }
    }

    return index;
}

export function findBoneByBoneName(boneList: THREE.Bone[], name: string): THREE.Bone {
    return this.findBoneByEndsName(boneList, name);
}

export function findBoneByEndsName(boneList: THREE.Bone[], name: string): THREE.Bone {
    for (var i = 0; i < boneList.length; i++) {
        console.log(boneList[i].name.toLowerCase(), name.toLowerCase())
        if (boneList[i].name.toLowerCase().endsWith(name.toLowerCase())) {
            return boneList[i];
        }
    }

    return null;
}

/*
 * not test scale yet.
 */
export function convertToZeroRotatedBoneMesh(mesh: THREE.SkinnedMesh) {
    mesh.updateMatrixWorld(true);
    var originBoneList = getBoneList(mesh);

    if (logging) {
        console.log("convertToZeroRotatedBoneMesh:origin bone pos,rot(fixed2)");
    }

    var bonePosition = [];
    originBoneList.forEach(function(bone) {
        var pos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);//Need Rotation Applied position
        bonePosition.push(pos);
        if (logging) {
            var p = bone.position;
            console.log(bone.name + "-raw-pos", p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2));
            console.log(bone.name + "-pos", pos.x.toFixed(2), pos.y.toFixed(2), pos.z.toFixed(2));
            var rot = bone.rotation;
            console.log(bone.name + "-rot", THREE.MathUtils.radToDeg(rot.x).toFixed(2), THREE.MathUtils.radToDeg(rot.y).toFixed(2), THREE.MathUtils.radToDeg(rot.z).toFixed(2))
        }
    });
    if (logging) {
        console.log("convertToZeroRotatedBoneMesh:converted relative position");
    }
    var rawbones = [];
    for (var i = 0; i < originBoneList.length; i++) {
        var bone = originBoneList[i];
        var parent = originBoneList.indexOf(bone.parent as THREE.Bone);
        var parentPos = parent == -1 ? new THREE.Vector3() : bonePosition[parent].clone();
        var newPos = bonePosition[i].clone().sub(parentPos);
        if (logging) {
            console.log(bone.name + "-pos", newPos.x.toFixed(2), newPos.y.toFixed(2), newPos.z.toFixed(2));
        }
        var rawbone = new Bone(parent, bone.name);
        rawbone.pos = newPos.toArray();
        rawbones.push(rawbone);
        if (logging) {
            console.log(rawbone);
        }
    }

    /*var geo=new THREE.Geometry().fromBufferGeometry(mesh.geometry);
      BoneUtils.copyIndicesAndWeights(mesh.geometry,geo);
      BoneUtils.copyMorphTargets(mesh.geometry,geo);*/

    var geo = new THREE.BufferGeometry().copy(mesh.geometry);

    var skeleton = new THREE.Skeleton(rawbones);
    var skinnedMesh = new THREE.SkinnedMesh(geo);
    skinnedMesh.add(skeleton.bones[0]);
    skinnedMesh.bind(skeleton)

    return skinnedMesh;
}

export function resetBone(mesh: THREE.SkinnedMesh, boneSelectedIndex: number) {
    var boneList = getBoneList(mesh);
    var bone = boneList[boneSelectedIndex];
    bone.matrixWorld.getInverse(mesh.skeleton.boneInverses[boneSelectedIndex]);
    if (bone.parent && bone.parent instanceof THREE.Bone) {
        var parentIndex = boneList.indexOf(bone.parent);
        var parentMatrix = mesh.skeleton.boneInverses[parentIndex];

        bone.matrix.copy(parentMatrix);
        bone.matrix.multiply(bone.matrixWorld);

    } else {
        bone.matrix.copy(bone.matrixWorld);

    }
    bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);
    bone.updateMatrixWorld(true);
}

export function getOppositeLRName(name: string) {
    //TODO support more
    if (name.endsWith("_L")) {
        return name.substring(0, name.length - 2) + "_R";
    }
    if (name.endsWith("_R")) {
        return name.substring(0, name.length - 2) + "_L";
    }
    return null;
}

export function flipHorizontalRotation(rotation: THREE.Euler, target: THREE.Euler | null) {
    if (!rotation.isEuler) {
        console.error("flipHorizontalRotation rotation must be Euler");
    }
    target = target == null ? new THREE.Euler() : target;
    target.set(rotation.x, rotation.y * -1, rotation.z * -1, rotation.order);
    return target;
}

export function swapHorizontalBone(bone1: THREE.Bone, bone2: THREE.Bone) {
    var rot1 = flipHorizontalRotation(bone1.rotation, null);
    var rot2 = flipHorizontalRotation(bone2.rotation, null);

    bone1.rotation.copy(rot2);
    bone2.rotation.copy(rot1);
}
