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

import { vec3, quat } from '../../vmath';

let Physics3DBase = require("./physics3d-base");
let CollisionFlag = Physics3DBase.CollisionFlag;
let ActivationState = Physics3DBase.ActivationState;
let btRigidBodyFlags = Physics3DBase.btRigidBodyFlags;

let ammo = require("./lib/ammo");

let _tempCCVec3 = cc.v3(0, 0, 0);
let _tempCCQuat = new cc.quat();
let _tempCCQuat_2 = new cc.quat();
let _tempCCQuat_3 = new cc.quat();
let _localInertia = new ammo.btVector3(0, 0, 0);
let _tempBTVec3 = new ammo.btVector3();
let _tempBTVec3_2 = new ammo.btVector3();
let _tempBTQuat = new ammo.btQuaternion();

let trsToAmmoVec3 = function (ammoVec3, trs) {
    ammoVec3.setX(trs[0]);
    ammoVec3.setY(trs[1]);
    ammoVec3.setZ(trs[2]);
}

let trsToAmmoQuat = function (ammoQuat, trs) {
    ammoQuat.setX(trs[3]);
    ammoQuat.setY(trs[4]);
    ammoQuat.setZ(trs[5]);
    ammoQuat.setW(trs[6]);
}

let RigidBody3D = cc.Class({
    name: 'cc.RigidBody3D',
    extends: Physics3DBase,

    editor: CC_EDITOR && {
        executeInEditMode: true,
        disallowMultiple: true
    },

    properties: {
        _isKinematic: false,
        _mass: 1.0,
        _angularDamping: 0.0,
        _linearDamping: 0.0,

        _overrideGravity: false,
        _detectCollisions: true,

        _gravity: vec3.create(0, -10, 0),
        _linearVelocity: vec3.create(0, 0, 0),
        _angularVelocity: vec3.create(0, 0, 0),
        _linearFactor: vec3.create(1, 1, 1),
        _angularFactor: vec3.create(1, 1, 1),

        /**
         * !#en Angular damping
         * !#zh 角阻力
         * @property {Number} angularDamping
         * @default 0.0
         */
        angularDamping: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.angularDamping',
            get () {
                return this._angularDamping;
            },
            set (value) {
                this._angularDamping = value;
                this._colliderObject.setDamping(this._linearDamping, value);
            }
        },

        /**
        * !#en Mass
        * !#zh 质量
        * @property {Number} mass
        * @default 1.0
        */
        mass: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.mass',
            get () {
                return this._mass;
            },
            set (value) {
                value = Math.max(value, 0);
                this._mass = value;
                (this._isKinematic) || (this._updateMass(value));
            }
        },

        /**
        * !#en Linear damping
        * !#zh 线阻力
        * @property {Number} linearDamping
        * @default 0.0
        */
        linearDamping: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.linearDamping',
            get () {
                return this._linearDamping;
            },
            set (value) {
                this._linearDamping=value;
                this._colliderObject.setDamping(value, this._angularDamping);
            }
        },

        /**
        * !#en Is kinematic
        * !#zh 是否动力学物体
        * @property {Boolean} isKinematic
        * @default false
        */
        isKinematic: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.isKinematic',
            get () {
                return this._isKinematic;
            },
            set (value) {
                this._isKinematic = value;
                this._enabled && this._removeFromWorld();
                let colliderObject = this._colliderObject;
                let flags = colliderObject.getCollisionFlags();
                if (value) {
                    flags = flags | CollisionFlag.KINEMATIC_OBJECT;
                    colliderObject.setCollisionFlags(flags);
                    colliderObject.forceActivationState(ActivationState.DISABLE_DEACTIVATION);
                    this._needHandleCollisions = false;
                    this._updateMass(0);
                } else {
                    if (flags & CollisionFlag.KINEMATIC_OBJECT)
                        flags = flags & ~ CollisionFlag.KINEMATIC_OBJECT;
                    colliderObject.setCollisionFlags(flags);
                    colliderObject.setActivationState(ActivationState.ACTIVE_TAG);
                    this._needHandleCollisions = true;
                    this._updateMass(this._mass);
                };
                _tempBTVec3.setValue(0, 0, 0);
                colliderObject.setInterpolationLinearVelocity(_tempBTVec3);
                colliderObject.setLinearVelocity(_tempBTVec3);
                colliderObject.setInterpolationAngularVelocity(_tempBTVec3);
                colliderObject.setAngularVelocity(_tempBTVec3);
                this._enabled && this._addToWorld();
            }
        },

        /**
        * !#en gravity
        * !#zh 重力
        * @property {Vec3} gravity
        * @default cc.v3(0, -10, 0)
        */
        gravity: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.gravity',
            type: cc.Vec3,
            get () {
                return this._gravity;
            },
            set (value) {
                this._gravity.set(value);
                _tempBTVec3.setValue(value.x, value.y, value.z);
                this._colliderObject.setGravity(_tempBTVec3);
            }
        },

        /**
        * !#en Override gravity
        * !#zh 是否重载重力
        * @property {Boolean} overrideGravity
        * @default false
        */
        overrideGravity: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.overrideGravity',
            get () {
                return this._overrideGravity;
            },
            set (value) {
                this._overrideGravity = value;
                let colliderObject = this._colliderObject;
                let flag = colliderObject.getFlags();
                if (value) {
                    if ((flag & btRigidBodyFlags.DISABLE_WORLD_GRAVITY) === 0) {
                        colliderObject.setFlags(flag | btRigidBodyFlags.DISABLE_WORLD_GRAVITY);
                    }
                } else {
                    if ((flag & btRigidBodyFlags.DISABLE_WORLD_GRAVITY) > 0) {
                        colliderObject.setFlags(flag & ~ btRigidBodyFlags.DISABLE_WORLD_GRAVITY);
                    }
                }
            }
        },

        /**
        * !#en total force
        * !#zh 总力
        * @property {Vec3} totalForce
        */
        totalForce: {
            get () {
                return this._colliderObject.getTotalForce();
            }
        },

        /**
        * !#en linear velocity
        * !#zh 线速度
        * @property {Vec3} linearVelocity
        * @default cc.v3(0, -10, 0)
        */
        linearVelocity: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.linearVelocity',
            type: cc.Vec3,
            get () {
                return this._linearVelocity;
            },
            set (value) {
                this._linearVelocity.set(value);
                _tempBTVec3.setValue(value.x, value.y, value.z);
                this.isSleeping && this.wakeUp();
                this._colliderObject.setLinearVelocity(_tempBTVec3);
            }
        },

        /**
        * !#en Is needed to detect collisions
        * !#zh 是否进行碰撞检测
        * @property {Boolean} detectCollisions
        * @default true
        */
        detectCollisions: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.detectCollisions',
            get () {
                return this._detectCollisions;
            },
            set (value) {
                if (this._detectCollisions !== value) {
                    this._detectCollisions = value;
                    if (this._enabled) {
                        this._removeFromWorld();
                        this._addToWorld();
                    }
                }
            }
        },

        /**
        * !#en Linear factor
        * !#zh 线性因子
        * @property {Vec3} linearFactor
        * @default cc.v3(1, 1, 1)
        */
        linearFactor: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.linearFactor',
            type: cc.Vec3,
            get () {
                return this._linearFactor;
            },
            set (value) {
                this._linearFactor.set(value);
                _tempBTVec3.setValue(value.x, value.y, value.z);
                this._colliderObject.setLinearFactor(_tempBTVec3);
            }
        },

        /**
        * !#en Angular factor
        * !#zh 角因子
        * @property {Vec3} angularFactor
        * @default cc.v3(1, 1, 1)
        */
        angularFactor: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.angularFactor',
            type: cc.Vec3,
            get () {
                return this._angularFactor;
            },
            set (value) {
                this._angularFactor.set(value);
                _tempBTVec3.setValue(value.x, value.y, value.z);
                this._colliderObject.setAngularFactor(_tempBTVec3);
            }
        },

        /**
        * !#en Angular velocity
        * !#zh 角速度
        * @property {Vec3} angularVelocity
        * @default cc.v3(0, 0, 0)
        */
        angularVelocity: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.angularVelocity',
            type: cc.Vec3,
            get () {
                return this._angularVelocity;
            },
            set (value) {
                this._angularVelocity.set(value);
                _tempBTVec3.setValue(value.x, value.y, value.z);
                this.isSleeping && this.wakeUp();
                this._colliderObject.setAngularVelocity(_tempBTVec3);
            }
        },

        /**
        * !#en Total torque
        * !#zh 刚体所有扭力
        * @property {Vec3} totalTorque
        */
        totalTorque: {
            get () {
                let value = this._colliderObject.getTotalTorque();
                var out = this._totalTorque;
                out.x = value.x;
                out.y = value.y;
                out.z = value.z;
                return out;
            }
        },

        /**
        * !#en Is sleeping
        * !#zh 是否处于睡眠状态
        * @property {Boolean} isSleeping
        */
        isSleeping: {
            get () {
                return this._colliderObject.getActivationState() === ActivationState.ISLAND_SLEEPING;
            }
        },

        /**
        * !#en Sleep linear velocity
        * !#zh 刚体睡眠的线速度阈值
        * @property {Number} sleepLinearVelocity
        */
        sleepLinearVelocity: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.sleepLinearVelocity',
            get () {
                return this._colliderObject.getLinearSleepingThreshold();
            },
            set (value) {
                let colliderObject = this._colliderObject;
                colliderObject.setSleepingThresholds(value, colliderObject.getAngularSleepingThreshold());
            }
        },

        /**
        * !#en Sleep angular velocity
        * !#zh 刚体睡眠的角速度阈值
        * @property {Number} sleepAngularVelocity
        */
        sleepAngularVelocity: {
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.rigidbody.sleepAngularVelocity',
            get () {
                return this._colliderObject.getAngularSleepingThreshold();
            },
            set (value) {
                let colliderObject = this._colliderObject;
                colliderObject.setSleepingThresholds(colliderObject.getLinearSleepingThreshold(), value);
            }
        },
    },

    ctor () {
        this._needHandleCollisions = true;
        this._motionState = null;
        this._totalTorque = vec3.create(0, 0, 0);
    },

    onDestroy () {
        this._super();

        if (this._motionState) {
            ammo.destroy(this._motionState);
            this._motionState = null;
        }

        if (this._colliderObject) {
            this._removeFromWorld();
            ammo.destroy(this._colliderObject);
            this._colliderObject = null;
        }
    },

    /**
     * !#en Apply force to rigid body
     * !#zh 对刚体施加作用力
     * @method applyForce
     * @param {Vec3} force
     * @param {Vec3} localOffset
     */
    applyForce (force, localOffset) {
        _tempBTVec3.setValue(force.x, force.y, force.z);
        if (localOffset) {
            _tempBTVec3_2.setValue(localOffset.x, localOffset.y, localOffset.z);
            this._colliderObject.applyForce(_tempBTVec3, _tempBTVec3_2);
        } else {
            this._colliderObject.applyCentralForce(_tempBTVec3);
        }
    },

    /**
     * !#en Apply torque to rigid body
     * !#zh 对刚体施加扭转力
     * @param {Vec3} torque
     */
    applyTorque (torque) {
        _tempBTVec3.setValue(torque.x, torque.y, torque.z);
        this._colliderObject.applyTorque(_tempBTVec3);
    },

    /**
     * !#en Apply impulse to rigid body
     * !#zh 对刚体施加冲量
     * @param {Vec3} impulse
     * @param {localOffset} localOffset
     */
    applyImpulse (impulse, localOffset) {
		_tempBTVec3.setValue(impulse.x, impulse.y, impulse.z);
		if (localOffset) {
			_tempBTVec3_2.setValue(localOffset.x, localOffset.y, localOffset.z);
			this._colliderObject.applyImpulse(_tempBTVec3, _tempBTVec3_2);
		} else {
			this._colliderObject.applyCentralImpulse(_tempBTVec3);
		}
	},

    /**
     * !#en Apply torque impulse to rigid body
     * !#zh 对刚体施加扭转冲量
     * @param {Vec3} torqueImpulse
     */
	applyTorqueImpulse (torqueImpulse) {
		_tempBTVec3.setValue(torqueImpulse.x, torqueImpulse.y, torqueImpulse.z);
		this._colliderObject.applyTorqueImpulse(_tempBTVec3);
	},

    /**
     * !#en Clear all forces of rigid body
     * !#zh 清空刚体的所有力
     */
    clearForces () {
		let colliderObject = this._colliderObject;
		colliderObject.clearForces();
        _tempBTVec3.setValue(0, 0, 0);
		colliderObject.setInterpolationAngularVelocity(_tempBTVec3);
		colliderObject.setLinearVelocity(_tempBTVec3);
		colliderObject.setInterpolationAngularVelocity(_tempBTVec3);
		colliderObject.setAngularVelocity(_tempBTVec3);
    },

    /**
     * !#en Wake up rigid body
     * !#zh 唤醒刚体
     */
	wakeUp () {
		this._colliderObject.activate(false);
	},

    /// private interface

    _removeFromWorld () {
        this._super();
        this._physics3DManger._removeRigidBody(this._colliderObject);
    },

    _addToWorld () {
        this._super();
        this._physics3DManger._addRigidBody(this._colliderObject, this._collisionFilterGroup, this._collisionFilterMask);
    },

    _buildCollider () {
        let node = this._node;
        let trs = node._trs;

        let motionState = this._motionState = new ammo.btDefaultMotionState();
        motionState.getWorldTransform = function (btTransformPointer) {
            let btTransform = ammo.wrapPointer(btTransformPointer, ammo.btTransform);
            btTransform.setIdentity();
            trsToAmmoVec3(_tempBTVec3, trs);
            btTransform.setOrigin(_tempBTVec3);
            trsToAmmoQuat(_tempBTQuat, trs);
            btTransform.setRotation(_tempBTQuat);
        };

        motionState.setWorldTransform = function (btTransformPointer) {
            let colliderShape = this._colliderShape;
            let offset = colliderShape.offset;
            let rotation = colliderShape.rotation;

            this.node.getRotation(_tempCCQuat);
            this.node.getPosition(_tempCCVec3);

            let btTransform = ammo.wrapPointer(btTransformPointer, ammo.btTransform);
            let physicsOrigin = btTransform.getOrigin();
            let x = physicsOrigin.x();
            let y = physicsOrigin.y();
            let z = physicsOrigin.z();

            let physicsRotation = btTransform.getRotation();
            let rotX = physicsRotation.x();
            let rotY = physicsRotation.y();
            let rotZ = physicsRotation.z();
            let rotW = physicsRotation.w();

            if (offset.x !== 0 || offset.y !== 0 || offset.z !== 0) {
                vec3.transformQuat(_tempCCVec3, offset, rotX, rotY,rotZ, rotW);
                node.setPosition(x - _tempCCVec3.x, y - _tempCCVec3.y, z - _tempCCVec3.z);
            } else {
                node.setPosition(x, y, z);
            }
            
            let rotation = colliderShape.rotation;
			if (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0) {
                _tempCCQuat.fromEuler(rotation);
                quat.invert(_tempCCQuat_2, _tempCCQuat);
                _tempCCQuat.x = rotX;
                _tempCCQuat.y = rotY;
                _tempCCQuat.z = rotZ;
                _tempCCQuat.w = rotW;
                quat.multiply(_tempCCQuat_3, _tempCCQuat, _tempCCQuat_2);
                node.setRotation(_tempCCQuat_3.x, _tempCCQuat_3.y, _tempCCQuat_3.z, _tempCCQuat_3.w);
            } else {
                node.setRotation(rotX, rotY, rotZ, rotW);
            }
        }.bind(this);

        const rigidBodyConstructionInfo = new ammo.btRigidBodyConstructionInfo(this._mass, motionState, this._compoundShape, _localInertia);
        let colliderObject = this._colliderObject = new ammo.btRigidBody(rigidBodyConstructionInfo);
        colliderObject.setUserIndex(this._id);

        this.isKinematic = this._isKinematic;
        this.mass = this._mass;
        this.angularDamping = this._angularDamping,
        this.linearDamping = this._linearDamping;

        this.overrideGravity = this._overrideGravity;
        this.detectCollisions = this._detectCollisions;

        this.gravity = this._gravity;
        this.linearVelocity = this._linearVelocity;
        this.angularVelocity = this._angularVelocity;
        this.linearFactor = this._linearFactor;
        this.angularFactor = this._angularFactor;

        ammo.destroy(rigidBodyConstructionInfo);
    },

    _updateScale (scale) {
        this._super(scale);
        this._updateMass(this._isKinematic ? 0 : this._mass);
    },

    _updateMass (value) {
        this._removeFromWorld();
        
        if (this._colliderShape) {
            this._colliderShape.calculateLocalInertia(value, _localInertia);
        }
        this._colliderObject.setMassProps(value, _localInertia);
        this._colliderObject.updateInertiaTensor();

        this._addToWorld();
    },
});

module.exports = RigidBody3D;