import { VRMHumanBone, VRMHumanBones } from "@pixiv/three-vrm/types/humanoid";
import { VRM } from "@pixiv/three-vrm/types/VRM";
import * as THREE from "three";
import * as BoneUtils from "./BoneUtils"

let logging: boolean = false;
let blendShapeNames = ["A", "I", "U", "E", "O", "Blink", "Blink_L", "Blink_R", "Angry", "Fun", "Joy", "Sorrow", "Surprised"];

export function getHasMorphTargets(mesh: THREE.SkinnedMesh) {
    var hasMorphTargets = [];
    mesh.traverse(function(obj) {
        if (obj instanceof THREE.SkinnedMesh) {
            if (obj.morphTargetInfluences) {
                hasMorphTargets.push(obj);
            }
        }
    });
    return hasMorphTargets;
}

export function getBlendShapeByName(blendShapes, name) {
    for (var i = 0; i < blendShapes.length; i++) {
        var bs = blendShapes[i];
        if (bs.name == name) {
            return bs;
        }
    }
    return null;
}

export function applyBlendShape(rootMesh, blendShape, intensity) {
    function set(target, bind, intensity) {
        intensity = intensity == undefined ? 1 : intensity;
        if (target.morphTargetInfluences) {

            target.morphTargetInfluences[bind.index] = bind.weight / 100 * intensity;
        }

    }
    blendShape.binds.forEach(function(bind) {

        var target = rootMesh.getObjectByName(bind.name);
        if (!target) {
            console.error("bind not resolved", bind.name, rootMesh, bind);
        } else {
            //TODO cache
            target.traverse(function(model) {
                if (model.morphTargetInfluences) {
                    set(model, bind, intensity);
                }
            });


        }


    });
}

export function clearMorphs(meshs) {
    meshs.forEach(function(mesh) {
        if (mesh.morphTargetInfluences) {
            for (var i = 0; i < mesh.morphTargetInfluences.length; i++) {
                mesh.morphTargetInfluences[i] = 0;
            }
        }
    });
}

export function getNodes(vrm) {
    return vrm.parser.json.nodes;
}

export function getNodeName(vrm, index) {
    var nodes = vrm.parser.json.nodes;
    var node = nodes[index];
    if (!node) {
        return null;
    }
    return node.name;
}

export function getHumanoid(vrm) {
    return vrm.userData.gltfExtensions.VRM.humanoid;
}

export function getSkinnedMeshes(parent) {
    var models = [];
    parent.traverse(function(model) {
        if (model.isSkinnedMesh) {
            models.push(model);
        }
    });
    return models;
}

export function getHumanoidOppositeLRName(humanoidBoneName) {

    if (humanoidBoneName.indexOf("left") != -1) {
        return humanoidBoneName.replace("left", "right");
    }
    if (humanoidBoneName.indexOf("right") != -1) {
        return humanoidBoneName.replace("right", "left");
    }
    return null;
}

export function getGeneralOppositeLRName(humanBoneMap,
    generalBoneMap, generalBoneName) {
    var humanBoneName = generalBoneMap[generalBoneName];

    if (humanBoneName) {
        var humanOpposite = this.getHumanoidOppositeLRName(humanBoneName);

        if (humanOpposite) {
            var opposite = humanBoneMap[humanOpposite];
            if (opposite) {
                return opposite;
            } else {
                return null;
            }
        }
    }
    return null;
}

export function sceneToSkinnedMeshOptions(scene, isVroid) {
    var keys = {};
    var maxFace = 0;
    var maxFaceModel = null;
    var maxBody = 0;
    var maxBodyModel = null;



    scene.traverse(function(model) {
        if (model.isSkinnedMesh) {
            var name = model.name
            var count = model.geometry.index ? model.geometry.index.count : 0;
            if (count > 0) {
                name = name + "(" + count + ")";
            }
            keys[model.id] = name;
            if (isVroid) {
                if (name.startsWith("Face")) {

                    //console.log(model.name,value);
                    if (maxFace < count) {

                        maxFace = count
                        maxFaceModel = model;
                    }

                }
                else if (name.startsWith("Body")) {

                    if (maxBody < count) {

                        maxBody = count
                        maxBodyModel = model;
                    }

                }
            }

        }
    });

    function countedName(model) {
        var name = model.name;
        var count = model.geometry.index ? model.geometry.index.count : 0;
        if (count > 0) {
            name = name + "(" + count + ")";
        }
        return name;
    }
    if (isVroid) {//indicate large one
        if (maxFaceModel) {
            keys[maxFaceModel.id] = countedName(maxFaceModel) + "*";
        }
        if (maxBodyModel)
            keys[maxBodyModel.id] = countedName(maxBodyModel) + "*";
    }

    return keys;
}

export function createHumanBoneNameToGeneralBoneNameMap(vrm: VRM): VRMHumanBones {
    var humanBones = vrm.humanoid.humanBones;

    return humanBones;
}

export type GeneralMap = Map<VRMHumanBone, string>;
export function createGeneralBoneNameToHumanBoneNameMap(vrm: VRM): GeneralMap {
    var generalBoneMap = new Map<VRMHumanBone, string>();
    var humanBoneMap = this.createHumanBoneNameToGeneralBoneNameMap(vrm);
    Object.keys(humanBoneMap).forEach(function(key) {
        generalBoneMap[humanBoneMap[key]] = key;
    })
    return generalBoneMap;
}

let humanoidFingerBoneNames = [];

var lrs = ["left", "right"];
var parts = ["Thumb", "Index", "Middle", "Ring", "Little"];
var levels = ["Proximal", "Intermediate", "Distal"];
lrs.forEach(function(lr) {
    parts.forEach(function(part) {
        levels.forEach(function(level) {
            humanoidFingerBoneNames.push(lr + part + level);
        });
    });
});
export function getHumanoidFingerBoneNames(): Array<string> {
    return humanoidFingerBoneNames;
}

export function isFingerBoneNameByHumanBoneName(humanBoneName: string): boolean {
    if (this.getHumanoidFingerBoneNames().indexOf(humanBoneName) != -1) {
        return true;
    }

    return false;
}

export function isFingerBoneNameByGeneralBoneName(name: string, generalMap: GeneralMap): boolean {
    var humanBoneName = generalMap[name];
    return this.isFingerBoneNameByHumanBoneName(humanBoneName);
}

export function changeBoneEulerOrders(vrm: VRM, skinnedMesh: THREE.SkinnedMesh) {
    var bones = BoneUtils.getBoneList(skinnedMesh);
    var arms = ["Shoulder", "UpperArm", "LowerArm", "Hand"];

    var generalBoneMap = this.createGeneralBoneNameToHumanBoneNameMap(vrm);
    //TODO
    for (var i = 0; i < bones.length; i++) {
        var name = bones[i].name;
        if (this.isFingerBoneNameByGeneralBoneName(name, generalBoneMap)) {

            bones[i].rotation.order = "ZYX";
        } else {
            bones[i].rotation.order = "XZY";
        }
    }
    var humanBoneMap = this.createHumanBoneNameToGeneralBoneNameMap(vrm);

    arms.forEach(function(name) {
        var lrs = ["left", "right"];
        lrs.forEach(function(lr) {
            var humanBoneName = lr + name;
            var boneName = humanBoneMap[humanBoneName];

            var index = BoneUtils.findBoneIndexByEndsName(bones, boneName);
            if (index != -1) {

                bones[index].rotation.order = "ZYX";//better arm close body
                //bones[index].rotation.order="YZX";//zyx is littlebit better.
            } else {
                console.log("changeBoneEulerOrders not found", humanBoneName, boneName);
            }
        });
    });
}
