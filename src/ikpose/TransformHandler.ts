import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { IKPose } from "./IKPose";
import { Signals } from "./Signals";

export class TransformHandler {
    public target: THREE.Object3D;
    public control: TransformControls;

    private lastSelection: THREE.Object3D = null;
    private visibleJoint: THREE.Object3D = null;

    private onDownPosition = new THREE.Vector2();
    private onUpPosition = new THREE.Vector2();
    private onMovePosition = new THREE.Vector2();
    private onDoubleClickPosition = new THREE.Vector2();
    private dragging: boolean = false;

    private _onpu: (PointerEvent) => void = null;

    private _boneMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private _matrixWorldInv: THREE.Matrix4 = new THREE.Matrix4();
    private _quaternion: THREE.Quaternion = new THREE.Quaternion();

    constructor(private signals: Signals, private ikpose: IKPose) {
        var scope = this;

        //transform
        this.control = new TransformControls(ikpose.camera, ikpose.renderer.domElement);
        this.control.setSpace("local")
        this.control.addEventListener('dragging-changed', function(event) {
            scope.ikpose.controls.enabled = !event.value;
            scope.dragging = event.value;
        });
        this.control.addEventListener('change', function() {
            //called attached or moved
            if (scope.dragging) {
                scope.signals._onTransformChanged.dispatch([scope.control, scope.target]);
            }
            scope.ikpose.render();
        });

        this.control.detach();
        ikpose.scene.add(this.control);//should here

        //handle event

        this.signals.onTransformSelectionChanged.subscribe(function(target: THREE.Object3D) {
            if (scope.target && scope.target.userData.transformSelectionType == "Joint") {
                scope.target.visible = false
            }
            scope.target = target;
            if (target == null) {
                scope.control.detach();
            }
        }); //, undefined, 100);//do first


        this.signals.onLoadingModelFinished.subscribe(function(mesh) {
            scope.control.detach();
        });

        // events

        this._onpu = (event) => this.onPointerUp(event);
        window.addEventListener('pointerdown', (event) => this.onPointerDown(event), false);
        window.addEventListener('pointerup', this._onpu, false);
        window.addEventListener('pointermove', (event) => this.onPointerMove(event), false);
    }

    public setTarget(target: THREE.Object3D) {
        this.control.setMode("translate");
        this.control.attach(target);
    }

    private getIntersects(point: THREE.Vector2, objects: THREE.Object3D[]) {
        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();

        mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);

        raycaster.setFromCamera(mouse, this.ikpose.camera);

        return raycaster.intersectObjects(objects);
    }

    private getMousePosition(dom: HTMLElement, x: number, y: number) {
        var rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }

    private onPointerUp(event: PointerEvent) {
        var array = this.getMousePosition(this.ikpose.renderer.domElement, event.clientX, event.clientY);
        this.onUpPosition.fromArray(array);

        this.handleClick();

        this.signals._onTransformFinished.dispatch(this.target);
    }

    private onPointerDown(event: PointerEvent) {
        // event.preventDefault();

        var array = this.getMousePosition(this.ikpose.renderer.domElement, event.clientX, event.clientY);
        this.onDownPosition.fromArray(array);

        this.signals._onTransformStarted.dispatch(this.target);
    }

    private onPointerMove(event: PointerEvent) {
        var array = this.getMousePosition(this.ikpose.renderer.domElement, event.clientX, event.clientY);
        this.onMovePosition.fromArray(array);

        var intersects = this.getIntersects(this.onMovePosition, this.ikpose.getJointTargets());

        let found = null;
        if (intersects.length > 0) {
            for (var i = 0; i < intersects.length; i++) {
                let obj = intersects[i].object;
                if (obj.userData.transformSelectionType == "Joint" && obj.userData.isTargetable) {
                    found = obj
                    break
                }
            }
        }

        let changed = false
        if (found && found != this.visibleJoint) {
            if (this.visibleJoint) {
                this.visibleJoint.visible = false
                this.visibleJoint = null
            }
            this.visibleJoint = found
            this.visibleJoint.visible = true;
            changed = true
        }
        else if (!found && this.visibleJoint) {
            this.visibleJoint.visible = false
            this.visibleJoint = null
            changed = true
        }
        if (this.target) {
            this.target.visible = true;
        }
        if (changed) {
            this.ikpose.render();
        }
    }

    private handleClick() {
        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
            var targets: THREE.Object3D[] = this.ikpose.getIkTargets();
            if (this.visibleJoint) {
                targets.push(this.visibleJoint)
            }
            var intersects = this.getIntersects(this.onUpPosition, targets);

            if (intersects.length > 0) {
                var index = -1;
                var visibles = [];
                for (var i = 0; i < intersects.length; i++) {
                    if (intersects[i].object.visible) {
                        visibles.push(intersects[i]);
                    }
                }

                if (visibles.length == 0) {
                    this.signals._onTransformSelectionChanged.dispatch(null);
                    return;
                }

                var index = 0;
                if (visibles.length == 0) {
                    this.lastSelection = null;
                } else {
                    if (visibles[0].object == this.lastSelection && visibles.length > 1) {
                        index = 1;
                        this.lastSelection = visibles[1].object;
                    } else {
                        this.lastSelection = visibles[0].object;
                    }

                }

                var object = visibles[index].object;

                this.signals._onTransformSelectionChanged.dispatch(object);

            } else {
                this.signals._onTransformSelectionChanged.dispatch(null);
            }
        }
    }
}
