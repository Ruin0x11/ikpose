import { VRMSchema } from "@pixiv/three-vrm"

export type BoneRotation = { rotation: Array<Number> }
export type Pose = Map<VRMSchema.HumanoidBoneName, BoneRotation>
