import { IKPose } from "./ikpose/IKPose";
import { Vector3 } from "three";

const ikpose = new IKPose();
ikpose.loadModel("/assets/models/three-vrm-girl.vrm", new Vector3(-0.5, 0, 0))
ikpose.loadModel("/assets/models/AliciaSolid.vrm", new Vector3(0.5, 0, 0))
