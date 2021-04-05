import * as THREE from "three";
import * as BoneUtils from "./BoneUtils"
import * as AppUtils from "./AppUtils"

import { IIKSettings } from "./IIKSettings";
import { VRM } from "@pixiv/three-vrm/types/VRM";
import { VRMHumanBone, VRMSchema } from "@pixiv/three-vrm";
import { BoneAttachController } from "./BoneAttachController";
import { IKController } from "./IKController";
import { IKData } from "./IKData";

export class HumanoidIK implements IIKSettings {
    public endSites: Array<any> = [];
    public ikTargets: any = {};
    public objects: Array<THREE.Object3D> = [];

    private bodyHumanBoneNames: Array<string> = ["hips", "spine", "chest", "upperChest", "neck", "head"];
    private humanBoneMap: Map<VRMHumanBone, string>;
    private boneList: THREE.Bone[];

    private headBoneNames: Array<string>;
    private leftArmBoneNames: Array<string>;
    private rightArmBoneNames: Array<string>;
    private leftLegBoneNames: Array<string>;
    private rightLegBoneNames: Array<string>;
    private hipBoneNames: Array<string>;

    constructor(private readonly ikController: IKController, private readonly boneAttachController: BoneAttachController, vrm: VRM) {
        var scope = this;

        var humanBones = vrm.humanoid.humanBones;

        var humanBoneMap = new Map<VRMHumanBone, string>();
        for (let name in humanBones) {
            let bones = humanBones[name as VRMSchema.HumanoidBoneName];
            bones.forEach((bone, i) => humanBoneMap[name] = name)
        }
        this.humanBoneMap = humanBoneMap;

        this.boneList = BoneUtils.getBoneList(vrm.scene as unknown as THREE.SkinnedMesh);

        var headIkHumanBoneNames = ["spine", "chest", "upperChest", "neck", "head"];

        var headBoneNames = [];
        headIkHumanBoneNames.forEach(function(name) {
            var boneName = humanBoneMap[name];
            if (boneName) {
                headBoneNames.push(boneName);
            } else {
                throw new Error("Bone " + boneName + "not found")
            }
        });
        this.headBoneNames = headBoneNames;
        this.registIk(this.ikTargets, "Head", headBoneNames);

        function resolveMapBoneName(humanBoneNames: string[]) {
            var result = [];
            humanBoneNames.forEach(function(name: string) {
                var boneName = humanBoneMap[name];
                if (boneName) {

                    var bone = BoneUtils.findBoneByEndsName(scope.boneList, boneName);
                    if (bone != null) {
                        result.push(boneName);
                    } else {
                        console.log("humanBoneMap:found on map not in bonelist", boneName);
                    }

                } else {
                    //possible not exist
                    console.log("humanBoneMap:not map found", name);
                }
            });
            return result;
        }

        this.leftArmBoneNames = resolveMapBoneName(["l_shoulder", "l_upperArm", "l_lowerArm", "l_hand"]);
        this.registIk(this.ikTargets, "LeftArm", this.leftArmBoneNames);

        this.rightArmBoneNames = resolveMapBoneName(["rightShoulder", "rightUpperArm", "rightLowerArm", "rightHand"]);
        this.registIk(this.ikTargets, "rightArm", this.rightArmBoneNames);

        this.leftLegBoneNames = resolveMapBoneName(["leftUpperLeg", "leftLowerLeg", "leftFoot"]);
        this.registIk(this.ikTargets, "LeftLeg", this.leftLegBoneNames);

        this.rightLegBoneNames = resolveMapBoneName(["rightUpperLeg", "rightLowerLeg", "rightFoot"]);
        this.registIk(this.ikTargets, "rightLeg", this.rightLegBoneNames);


        this.hipBoneNames = resolveMapBoneName(["hips", "spine"]);
        if (this.hipBoneNames.length > 1) {
            this.registIk(this.ikTargets, "hip", this.hipBoneNames);
        }


        /*//this.registIk(this.ikTargets,"Hip",["root","spine01"]);//
          this.registIk(this.ikTargets,"Hip",["pelvis","spine01"]);//
          this.registIk(this.ikTargets,"Head",["spine01","spine02","spine03","neck","head"]);
          //this.registIk(this.ikTargets,"LeftArm",["clavicle_L","upperarm_L","lowerarm_L","hand_L","middle00_L"]);
          //this.registIk(this.ikTargets,"RightArm",["clavicle_R","upperarm_R","lowerarm_R","hand_R","middle00_R"]);
          this.registIk(this.ikTargets,"LeftArm",["clavicle_L","upperarm_L","lowerarm_L","hand_L"]);
          this.registIk(this.ikTargets,"RightArm",["clavicle_R","upperarm_R","lowerarm_R","hand_R"]);
          this.registIk(this.ikTargets,"LeftLeg",["thigh_L","calf_L","foot_L"]);
          this.registIk(this.ikTargets,"hip",["thigh_R","calf_R","foot_R"]);*/

        this.initlimitBone();

    }

    registIk(ikTargets: any, ikName: string, jointNames: Array<string>) {
        if (jointNames.length == 0) {
            throw new Error("No joint names")
        }

        var indices = [];
        var ik = this.ikController.iks[ikName];
        if (ik) {
            ik.dispose();
        }
        this.ikController.iks[ikName] = new IKData(indices, ikName);

        var scope = this;

        jointNames.forEach(function(name: string) {
            var index = BoneUtils.findBoneIndexByEndsName(scope.boneList, name);

            if (index == -1) {
                console.error("registIk:bone not contain," + name);
            }
            indices.push(index);
        });

        //add endsite
        var list = this.boneAttachController.getContainerList();
        /*
          var diff=list[indices[indices.length-1]].position.clone().sub(list[indices[indices.length-2]].position);
          diff.setLength(10);*/
        //diff.add(list[indices[indices.length-1]].position);

        var endsite = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0x008800, depthTest: false, transparent: true, opacity: .5 }));
        endsite.renderOrder = 2;
        list[indices[indices.length - 1]].add(endsite);
        list[indices[indices.length - 1]].userData.endsite = endsite;
        //endsite.position.copy(diff);
        (endsite.material as THREE.Material).visible = false;
        endsite.userData.endSiteIndex = indices[indices.length - 1];//TODO switch to name
        endsite.userData.endSiteParentIndex = indices[indices.length - 2];//TODO switch to name

        var joint = AppUtils.lineTo(list[indices[indices.length - 1]], endsite);
        const material = (joint.material as THREE.Material);
        material.depthTest = false;
        material.transparent = true;
        material.opacity = 0.25;
        // material.renderOrder = 2;
        material.visible = false;
        endsite.userData.joint = joint;

        scope.endSites.push(endsite);

        var ikBox = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshBasicMaterial({ color: 0x880000, depthTest: false, transparent: true, opacity: .5 }));
        ikBox.name = "ik-c-" + ikName;
        ikBox.renderOrder = 1;
        var index = indices.length - 1;
        //ikBox.position.copy(ap.ikControler.boneAttachControler.containerList[indices[indices.length-1]].position);
        ikBox.userData.ikName = ikName;//TODO move userData
        ikBox.userData.transformSelectionType = "BoneIk";
        this.objects.push(ikBox);//TODO do at init for switch
        this.ikController.iks[ikName].target = ikBox;
    }

    limitBone(boneList: THREE.Bone[], humanoidBoneName: string, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
        var endName = this.humanBoneMap[humanoidBoneName];
        if (!endName) {
            endName = humanoidBoneName;//maybe root
            console.log("humanoidBoneName not exist map.Use directly name ", humanoidBoneName);
        }

        var name = endName;

        this.ikController.iks[name].limitMin = new THREE.Vector3(minX, minY, minZ);
        this.ikController.iks[name].limitMax = new THREE.Vector3(maxX, maxY, maxZ);
    }

    initlimitBone() {
        var boneList = this.boneList;

        //body
        this.limitBone(boneList, "root", -180, -180, -180, 180, 180, 180);
        this.limitBone(boneList, "hips", -180, -180, -180, 180, 180, 180);
        this.limitBone(boneList, "spine", -15, -30, -20, 15, 30, 20);
        this.limitBone(boneList, "chest", -45, -30, -20, 45, 30, 20);
        this.limitBone(boneList, "upperChest", -45, -30, -20, 45, 30, 20);
        this.limitBone(boneList, "neck", -45, -45, -10, 45, 45, 10);
        this.limitBone(boneList, "head", -15, -30, -20, 15, 30, 20);

        this.limitBone(boneList, "leftShoulder", 0, 0, -45, 0, 15, 0);
        this.limitBone(boneList, "leftUpperArm", -45, -75, -45, 45, 45, 85);
        this.limitBone(boneList, "leftLowerArm", -0, -150, 0, 0, 0, 0);
        this.limitBone(boneList, "leftHand", 0, 0, -45, 0, 45, 65);

        this.limitBone(boneList, "rightShoulder", 0, -15, 0, 0, 0, 45);
        this.limitBone(boneList, "rightUpperArm", -45, -45, -85, 45, 75, 45);
        this.limitBone(boneList, "rightLowerArm", 0, 0, 0, 0, 150, 0);
        this.limitBone(boneList, "rightHand", 0, -45, -65, 0, 0, 45);

        this.limitBone(boneList, "leftUpperLeg", -60, 0, -75, 120, 0, 75);
        this.limitBone(boneList, "leftLowerLeg", -160, 0, 0, 0, 0, 0);
        this.limitBone(boneList, "leftFoot", -15, -5, -5, 15, 5, 5);

        this.limitBone(boneList, "rightUpperLeg", -60, 0, -75, 120, 0, 75);
        this.limitBone(boneList, "rightLowerLeg", -160, 0, 0, 0, 0, 0);
        this.limitBone(boneList, "rightFoot", -15, -5, -5, 15, 5, 5);

        /*boneList.forEach(function(bone){
          limitBone(boneList,bone.name,-180,-180,-180,180,180,180);
          });*/

        /*
          this.limitBone(boneList,"thigh_R",-120,0,-70,60,0,75);
          this.limitBone(boneList,"calf_R",0,0,0,160,0,0);
          this.limitBone(boneList,"foot_R",-15,-5,-5,15,5,5);

          this.limitBone(boneList,"hand_R",0,-45,-45,0,0,65);
          this.limitBone(boneList,"lowerarm_R",0,0,0,0,150,0);
          this.limitBone(boneList,"upperarm_R",-45,-45,-45,45,75,85);
          this.limitBone(boneList,"clavicle_R",0,-15,-45,0,0,0);


          this.limitBone(boneList,"thigh_L",-120,0,-70,60,0,75);
          this.limitBone(boneList,"calf_L",0,0,0,160,0,0);
          this.limitBone(boneList,"foot_L",-15,-5,-5,15,5,5);

          this.limitBone(boneList,"hand_L",0,0,-65,0,45,45);
          this.limitBone(boneList,"lowerarm_L",-0,-150,0,0,0,0);
          this.limitBone(boneList,"upperarm_L",-45,-75,-85,45,45,45);
          this.limitBone(boneList,"clavicle_L",0,0,0,0,15,45);


          this.limitBone(boneList,"root",-180,-180,-180,180,180,180);
          this.limitBone(boneList,"pelvis",-180,-180,-180,180,180,180);
          this.limitBone(boneList,"spine01",-15,-45,-30,15,45,30);
          this.limitBone(boneList,"spine02",-45,-45,-30,45,45,30);
          this.limitBone(boneList,"spine03",-45,-45,-30,45,45,30);
          this.limitBone(boneList,"neck",-45,-45,-10,45,45,10);
          this.limitBone(boneList,"head",-15,-15,-20,15,15,20);*/

        //copy to default
        Object.keys(this.ikController.iks).forEach(function(key) {
            this.ikController.ikDefaultLimitMin[key] = new THREE.Vector3(this.ikController.iks[key].limitMin)
            this.ikController.ikDefaultLimitMax[key] = new THREE.Vector3(this.ikController.iks[key].limitMax)
        });

        //send ref
        // if (ap.signals.boneLimitLoaded) {
        //     ap.signals.boneLimitLoaded.dispatch(this.ikController.ikLimitMin, ap.ikControler.ikLimitMax);
        // } else {
        //     console.log("No ap.signals.boneLimitLoaded,Skipped Dispatch");
        // }
    }
}
