/****************************************************************************
 Copyright (c) 2019 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
let ammo = require("./lib/ammo");
import { vec3, quat } from '../../vmath';
const Node = cc.Node;
const NodeEvent = Node.EventType;
const DirtyFlag = Node._LocalDirtyFlag;
let _tempBTVec3 = new ammo.btVector3();
let _tempBTQuaternion = new ammo.btQuaternion(0, 0, 0, 1);
let _tempCCVec3 = cc.v3(0, 0, 0);
let _tempCCVec3_2 = cc.v3(0, 0, 0);
let _tempCCQuat = new cc.quat();
let _tempCCQuat_2 = new cc.quat();
let _tempCCQuat_3 = new cc.quat();

// collision flag
let CollisionFlag = cc.Enum({
    STATIC_OBJECT : 1,
    KINEMATIC_OBJECT : 2,
    NO_CONTACT_RESPONSE : 4,
    CUSTOM_MATERIAL_CALLBACK : 8, //this allows per-triangle material (friction/restitution)
    CHARACTER_OBJECT : 16,
    DISABLE_VISUALIZE_OBJECT : 32, //disable debug drawing
    DISABLE_SPU_COLLISION_PROCESSING : 64 //disable parallel/SPU processing
});

// activation state
let ActivationState = cc.Enum({
    ACTIVE_TAG : 1,
    ISLAND_SLEEPING : 2,
    WANTS_DEACTIVATION : 3,
    DISABLE_DEACTIVATION : 4,
    DISABLE_SIMULATION : 5
});

// btRigidBodyFlags
let btRigidBodyFlags = cc.Enum({
    DISABLE_WORLD_GRAVITY : 1,
    ENABLE_GYROPSCOPIC_FORCE : 2,
});

let Physics3DBase = cc.Class({
    name: 'cc.Physics3DBase',
    extends: cc.Component,

    statics: {
        CollisionFlag: CollisionFlag,
        ActivationState: ActivationState,
        btRigidBodyFlags: btRigidBodyFlags
    },

    properties: {
        _isTrigger: false,
        _restitution: 0.0,
        _friction: 0.5,
        _rollingFriction: 0.0,
        _ccdMotionThreshold: 0.0,
        _ccdSweptSphereRadius: 0.0,

        /**
         * !#en restitution
         * !#zh 弹力
         * @property {Number} restitution
         * @default 0.0
         */
        restitution: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.restitution',
            get () {
                return this._restitution;
            },
            set (value) {
                this._restitution = value;
                this._colliderObject.setRestitution(value);
            }
        },

        /**
         * !#en friction
         * !#zh 摩擦力
         * @property {Number} friction
         * @default 0.5
         */
        friction: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.friction',
            get () {
                return this._friction;
            },
            set (value) {
                this._friction = value;
                this._colliderObject.setFriction(value);
            }
        },

        /**
         * !#en rolling friction
         * !#zh 滚动摩擦力
         * @property {Number} rollingFriction
         * @default 0.0
         */
        rollingFriction: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rollingFriction',
            get () {
                return this._rollingFriction;
            },
            set (value) {
                this._rollingFriction = value;
                this._colliderObject.setRollingFriction(value);
            },
        },

        /**
         * !#en CCD motion threshold
         * !#zh 连续碰撞检测(CCD)的速度阈值
         * @property {Number} ccdMotionThreshold
         * @default 0.0
         */
        ccdMotionThreshold: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.ccdMotionThreshold',
            get () {
                return this._ccdMotionThreshold;
            },
            set (value) {
                this._ccdMotionThreshold = value;
                this._colliderObject.setCcdMotionThreshold(value);
            },
        },

        /**
         * !#en CCD sphere radius
         * !#zh 连续碰撞检测(CCD)范围的球半径
         * @property {Number} ccdSweptSphereRadius
         * @default 0.0
         */
        ccdSweptSphereRadius: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.ccdSweptSphereRadius',
            get () {
                return this._ccdSweptSphereRadius;
            },
            set (value) {
                this._ccdSweptSphereRadius = value;
                this._colliderObject.setCcdSweptSphereRadius(value);
            }
        },

        /**
         * !#en Enabled trigger
         * !#zh 是否为触发器
         * @property {Boolean} isTrigger
         * @default false
         */
        isTrigger: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.isTrigger',
            get () {
                return this._isTrigger;
            },
            set (value) {
                this._isTrigger = value;
                this._updateTrigger(value);
            }
        },
    },

    ctor () {
        this._colliderObject = null;
        this._colliderShape = new cc.CompoundShape();

        this._collisionFilterGroup = 1 << 0;
        this._collisionFilterMask = 1 << 0;

        this._inTransformList = false;
        this._transformFlag = DirtyFlag.POSITION | DirtyFlag.ROTATION | DirtyFlag.SCALE;

        this._physics3DManger = cc.director.getPhysics3DManager();
        this._physics3DManger._registerPhysics3D(this);
    },

    onDestroy () {
        this._super();
        this._physics3DManger._unregisterPhysics3D(this);
        if (this._colliderShape) {
            this._colliderShape.destroy();
            this._colliderShape = null;
        }
    },

    onEnable () {
        this._super();
        this._updatePhysicsTransform(true);
        this._registerNodeEvents();
        this._addToWorld();
    },

    onDisable () {
        this._super();
        this._physics3DManger._removeFromTransformList(this);
        this._unregisterNodeEvents();
        this._removeFromWorld();
    },

    setGroup (v) {
        this._collisionFilterGroup = v;
        this._updateGroupOrMask();
    },

    addMask (v) {
        this._collisionFilterMask |= v;
        this._updateGroupOrMask();
    },

    removeMask (v) {
        this._collisionFilterMask &= ~v;
        this._updateGroupOrMask();
    },

    addSubShape (shapeComponent) {
        this._colliderShape._addSubShape(shapeComponent);
    },

    removeSubShape (shapeComponent) {
        this._colliderShape._removeSubShape(shapeComponent);
    },

    /// private interface

    __preload () {
        // init group and mask
        let node = this.node;
        this._collisionFilterGroup = (1 << node.groupIndex);
        let maskBits = 0;
        let bits = cc.game.collisionMatrix[node.groupIndex];
        for (let i = 0; i < bits.length; i++) {
            if (!bits[i]) continue;
            maskBits |= (1 << i);
        }
        this._collisionFilterMask = maskBits;

        this._buildCollider();
        let colliderShapeObject = this._colliderShape._getColliderShape();
        this._colliderObject.setCollisionShape(colliderShapeObject);

        this.restitution = this._restitution;
        this.friction = this._friction;
        this.rollingFriction = this._rollingFriction;
        this.ccdMotionThreshold = this._ccdMotionThreshold;
        this.ccdSweptSphereRadius = this._ccdSweptSphereRadius;
        this.isTrigger = this._isTrigger;
    },

    _updateGroupOrMask () {
        this._removeFromWorld();
        this._addToWorld();
    },

    // implement by subclass
    _buildCollider () {
    },

    // implement by subclass
    _removeFromWorld () {
    },

    // implement by subclass
    _addToWorld () {
    },

    _registerNodeEvents () {
        var node = this.node;
        node.on(NodeEvent.POSITION_CHANGED, this._onPosChange, this);
        node.on(NodeEvent.ROTATION_CHANGED, this._onRotChange, this);
        node.on(NodeEvent.SCALE_CHANGED, this._onScaleChange, this);
    },

    _unregisterNodeEvents () {
        var node = this.node;
        node.off(NodeEvent.POSITION_CHANGED, this._onPosChange, this);
        node.off(NodeEvent.ROTATION_CHANGED, this._onRotChange, this);
        node.off(NodeEvent.SCALE_CHANGED, this._onScaleChange, this);
    },

    _onPosChange () {
        this._transformFlag |= DirtyFlag.POSITION;
        this._physics3DManger._addToTransformList(this);
    },

    _onRotChange () {
        this._transformFlag |= DirtyFlag.ROTATION;
        this._physics3DManger._addToTransformList(this);
    },

    _onScaleChange () {
        this._transformFlag |= DirtyFlag.SCALE;
        this._physics3DManger._addToTransformList(this);
    },

    // update physics position by renderer position
    _updatePhysicsTransform (force) {
        let flag = this._transformFlag;
        let colliderShape = this._colliderShape;
        this.node.getRotation(_tempCCQuat);
        let colliderTransform = this._colliderObject.getWorldTransform();

        if (force || flag & DirtyFlag.POSITION) {
            let offset = colliderShape.offset;
            this.node.getPosition(_tempCCVec3);
            // If shape's offset isn't zero, must consider shape's offset.
			if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
                vec3.transformQuat(_tempCCVec3_2, offset, _tempCCQuat.x, _tempCCQuat.y, _tempCCQuat.z, _tempCCQuat.w);
				vec3.add(_tempCCVec3_2, _tempCCVec3_2, _tempCCQuat);
				_tempBTVec3.setValue(_tempCCVec3_2.x, _tempCCVec3_2.y, _tempCCVec3_2.z);
			} else {
				_tempBTVec3.setValue(_tempCCVec3.x, _tempCCVec3.y, _tempCCVec3.z);
			}
			colliderTransform.setOrigin(_tempBTVec3);
            this._transformFlag &= ~DirtyFlag.POSITION;
        }

        if (force || flag & DirtyFlag.ROTATION) {
            let rotation = colliderShape.rotation;
            // If shape's rotation isn't zero, must consider shape's rotation.
			if (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0) {
                _tempCCQuat_3.fromEuler(rotation);
                quat.multiply(_tempCCQuat_2, _tempCCQuat, _tempCCQuat_3);
				_tempBTQuaternion.setValue(_tempCCQuat_2.x, _tempCCQuat_2.y, _tempCCQuat_2.z, _tempCCQuat_2.w);
			} else {
				_tempBTQuaternion.setValue(_tempCCQuat.x, _tempCCQuat.y, _tempCCQuat.z,  _tempCCQuat.w);
			}
			colliderTransform.setRotation(_tempBTQuaternion);
            this._transformFlag &= ~DirtyFlag.ROTATION;
        }

        if (force || flag & DirtyFlag.SCALE) {
            this.node.getScale(_tempCCVec3);
            this._updateScale(_tempCCVec3);
            this._transformFlag &= ~DirtyFlag.SCALE;
        }
    },

    _updateScale (scale) {
        this._colliderShape._updateScale(scale);
    },

    _updateTrigger (value) {
        let colliderObject = this._colliderObject;
        let flags = colliderObject.getCollisionFlags();
        if (value) {
            if ((flags & CollisionFlag.NO_CONTACT_RESPONSE) === 0)
                colliderObject.setCollisionFlags(flags | CollisionFlag.NO_CONTACT_RESPONSE);
        } else {
            if ((flags & CollisionFlag.NO_CONTACT_RESPONSE) !== 0)
                colliderObject.setCollisionFlags(flags & ~ CollisionFlag.NO_CONTACT_RESPONSE);
        }
    }
});

module.exports = cc.Physics3DBase = Physics3DBase;