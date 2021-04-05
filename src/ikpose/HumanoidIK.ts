import * as THREE from "three";
import * as BoneUtils from "./BoneUtils"
import * as AppUtils from "./AppUtils"

import { IIKSettings } from "./IIKSettings";
import { VRM } from "@pixiv/three-vrm/types/VRM";
import { VRMHumanBone, VRMSchema } from "@pixiv/three-vrm";
import { BoneAttachController } from "./BoneAttachController";
import { IKController } from "./IKController";
import { IKData } from "./IKData";

import BoneName = VRMSchema.HumanoidBoneName;

export class HumanoidIK implements IIKSettings {
    public endSites: Array<any> = [];
    public ikTargets: any = {};
    public objects: Array<THREE.Object3D> = [];

    private bodyHumanBoneNames: Array<string> = [BoneName.Hips, BoneName.Spine, BoneName.Chest, BoneName.UpperChest, BoneName.Neck, BoneName.Head];
    private humanBoneMap: Map<BoneName, string>;
    private boneIkMap: Map<string, string>;
    private boneList: THREE.Bone[];

    private headBoneNames: Array<string>;
    private leftArmBoneNames: Array<string>;
    private rightArmBoneNames: Array<string>;
    private leftLegBoneNames: Array<string>;
    private rightLegBoneNames: Array<string>;
    private hipBoneNames: Array<string>;

    constructor(private readonly ikController: IKController, private readonly boneAttachController: BoneAttachController, vrm: VRM) {
        var humanBones = vrm.humanoid.humanBones;

        var humanBoneMap = new Map<BoneName, string>();
        for (let name in humanBones) {
            let bones = humanBones[name];
            // bones.forEach((bone, i) => humanBoneMap[name] = bone.node.name)
            if (bones[0]) {
                humanBoneMap[name] = bones[0].node.name
            }
        }
        this.humanBoneMap = humanBoneMap;

        this.boneIkMap = new Map();

        this.boneList = BoneUtils.getBoneList(vrm.scene as unknown as THREE.SkinnedMesh);

        function resolveMapBoneName(humanBoneNames: BoneName[]) {
            var result = [];
            humanBoneNames.forEach(function(name: BoneName) {
                var bones = humanBones[name];
                if (bones) {
                    var bone = bones[0];
                    if (bone != null) {
                        result.push(bone.node.name);
                    } else {
                        console.log("humanBoneMap:found on map not in bonelist", name);
                    }

                } else {
                    //possible not exist
                    console.log("humanBoneMap:not map found", name);
                }
            });
            return result;
        }

        this.headBoneNames = resolveMapBoneName([BoneName.Spine, BoneName.Chest, BoneName.UpperChest, BoneName.Neck, BoneName.Head]);
        this.registIk(this.ikTargets, "Head", this.headBoneNames);

        this.leftArmBoneNames = resolveMapBoneName([BoneName.LeftShoulder, BoneName.LeftUpperArm, BoneName.LeftLowerArm, BoneName.LeftHand]);
        this.registIk(this.ikTargets, "LeftArm", this.leftArmBoneNames);

        this.rightArmBoneNames = resolveMapBoneName([BoneName.RightShoulder, BoneName.RightUpperArm, BoneName.RightLowerArm, BoneName.RightHand]);
        this.registIk(this.ikTargets, "RightArm", this.rightArmBoneNames);

        this.leftLegBoneNames = resolveMapBoneName([BoneName.LeftUpperLeg, BoneName.LeftLowerLeg, BoneName.LeftFoot]);
        this.registIk(this.ikTargets, "LeftLeg", this.leftLegBoneNames);

        this.rightLegBoneNames = resolveMapBoneName([BoneName.RightUpperLeg, BoneName.RightLowerLeg, BoneName.RightFoot]);
        this.registIk(this.ikTargets, "RightLeg", this.rightLegBoneNames);

        this.hipBoneNames = resolveMapBoneName([BoneName.Hips, BoneName.Spine]);
        if (this.hipBoneNames.length > 1) {
            this.registIk(this.ikTargets, "Hip", this.hipBoneNames);
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
            scope.boneIkMap[name] = ikName;
        });

        //add endsite
        var list = this.boneAttachController.getContainerList();
        /*
          var diff=list[indices[indices.length-1]].position.clone().sub(list[indices[indices.length-2]].position);
          diff.setLength(10);*/
        //diff.add(list[indices[indices.length-1]].position);

        var endsite = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x008800, depthTest: false, transparent: true, opacity: .5 }));
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
        joint.renderOrder = 2;
        material.visible = false;
        endsite.userData.joint = joint;

        scope.endSites.push(endsite);

        var ikBox = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0x880000, depthTest: false, transparent: true, opacity: .5 }));
        ikBox.name = "ik-c-" + ikName;
        ikBox.renderOrder = 1;
        var index = indices.length - 1;
        //ikBox.position.copy(ap.ikControler.boneAttachControler.containerList[indices[indices.length-1]].position);
        ikBox.userData.ikName = ikName;//TODO move userData
        ikBox.userData.transformSelectionType = "BoneIk";
        this.objects.push(ikBox);//TODO do at init for switch
        this.ikController.iks[ikName].target = ikBox;
    }

    limitBone(boneList: THREE.Bone[], humanoidBoneName: BoneName, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number) {
        var threeBoneName = this.humanBoneMap[humanoidBoneName]
        if (!threeBoneName) {
            throw new Error("Not found: " + humanoidBoneName)
        }

        var name = threeBoneName;

        this.ikController.ikLimitMin[threeBoneName] = new THREE.Vector3(minX, minY, minZ);
        this.ikController.ikLimitMax[threeBoneName] = new THREE.Vector3(maxX, maxY, maxZ);
    }

    initlimitBone() {
        var boneList = this.boneList;

        //body
        // this.limitBone(boneList, BoneName.Root, -180, -180, -180, 180, 180, 180);
        this.limitBone(boneList, BoneName.Hips, -180, -180, -180, 180, 180, 180);
        this.limitBone(boneList, BoneName.Spine, -15, -30, -20, 15, 30, 20);
        this.limitBone(boneList, BoneName.Chest, -45, -30, -20, 45, 30, 20);
        this.limitBone(boneList, BoneName.UpperChest, -45, -30, -20, 45, 30, 20);
        this.limitBone(boneList, BoneName.Neck, -45, -45, -10, 45, 45, 10);
        this.limitBone(boneList, BoneName.Head, -15, -30, -20, 15, 30, 20);

        this.limitBone(boneList, BoneName.LeftShoulder, 0, 0, -45, 0, 15, 0);
        this.limitBone(boneList, BoneName.LeftUpperArm, -45, -75, -45, 45, 45, 85);
        this.limitBone(boneList, BoneName.LeftLowerArm, -0, -150, 0, 0, 0, 0);
        this.limitBone(boneList, BoneName.LeftHand, 0, 0, -45, 0, 45, 65);

        this.limitBone(boneList, BoneName.RightShoulder, 0, -15, 0, 0, 0, 45);
        this.limitBone(boneList, BoneName.RightUpperArm, -45, -45, -85, 45, 75, 45);
        this.limitBone(boneList, BoneName.RightLowerArm, 0, 0, 0, 0, 150, 0);
        this.limitBone(boneList, BoneName.RightHand, 0, -45, -65, 0, 0, 45);

        this.limitBone(boneList, BoneName.LeftUpperLeg, -60, 0, -75, 120, 0, 75);
        this.limitBone(boneList, BoneName.LeftLowerLeg, -160, 0, 0, 0, 0, 0);
        this.limitBone(boneList, BoneName.LeftFoot, -15, -5, -5, 15, 5, 5);

        this.limitBone(boneList, BoneName.RightUpperLeg, -60, 0, -75, 120, 0, 75);
        this.limitBone(boneList, BoneName.RightLowerLeg, -160, 0, 0, 0, 0, 0);
        this.limitBone(boneList, BoneName.RightFoot, -15, -5, -5, 15, 5, 5);

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
        var scope = this;
        Object.keys(this.ikController.iks).forEach(function(key) {
            scope.ikController.ikDefaultLimitMin[key] = new THREE.Vector3(scope.ikController.iks[key].limitMin)
            scope.ikController.ikDefaultLimitMax[key] = new THREE.Vector3(scope.ikController.iks[key].limitMax)
        });

        //send ref
        // if (ap.signals.boneLimitLoaded) {
        //     ap.signals.boneLimitLoaded.dispatch(this.ikController.ikLimitMin, ap.ikControler.ikLimitMax);
        // } else {
        //     console.log("No ap.signals.boneLimitLoaded,Skipped Dispatch");
        // }
    }
}
