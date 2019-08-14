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

import { vec3 } from '../../vmath';
const js = require('../platform/js');
let Physics3D = require("./physics3d");
let ammo = require("./lib/ammo");

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

let RigidBody3D = function (node) {
    this._motionState = null;

    this._enableProcessCollisions = true;
    this._isKinematic = false;
    this._mass = 1.0;
    this._angularDamping = 0.0;
    this._linearDamping = 0.0;

    this._overrideGravity = false;
    this._detectCollisions = true;

    this._gravity = vec3.create(0, -10, 0);
    this._totalTorque = vec3.create(0, 0, 0);
    this._linearVelocity = vec3.create(0, 0, 0);
    this._angularVelocity = vec3.create(0, 0, 0);
    this._linearFactor = vec3.create(1, 1, 1);
    this._angularFactor = vec3.create(1, 1, 1);

    Physics3D.call(this, node);
};

let proto = RigidBody3D.prototype;
js.extend(proto, Physics3D);

js.mixin(proto, {

    _removeFromWorld () {
        Physics3D.prototype._removeFromWorld.call(this);
        this._physics3DManger._removeRigidBody(this._colliderObject);
    },

    _addToWorld () {
        Physics3D.prototype._addToWorld.call(this);
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
            let btTransform = ammo.wrapPointer(btTransformPointer, ammo.btTransform);
            let physicsOrigin = btTransform.getOrigin();
            let x = physicsOrigin.x();
            let y = physicsOrigin.y();
            let z = physicsOrigin.z();
            node.setPosition(x, y, z);
            let physicsRotation = btTransform.getRotation();
            let rotX = physicsRotation.x();
            let rotY = physicsRotation.y();
            let rotZ = physicsRotation.z();
            let rotW = physicsRotation.w();
            node.setRotation(rotX, rotY, rotZ, rotW);
        };

        const rigidBodyConstructionInfo = new ammo.btRigidBodyConstructionInfo(this._mass, motionState, this._compoundShape, _localInertia);
        let colliderObject = this._colliderObject = new ammo.btRigidBody(rigidBodyConstructionInfo);
        colliderObject.setUserIndex(this._id);

        ammo.destroy(rigidBodyConstructionInfo);
    },

    /**
     * !#en destroy all WebAssembly object
     * !#zh 释放所有 WebAssembly 对象
     */
    destroy () {
        Physics3D.prototype.destroy.call(this);

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

    isRigidBody () {
        return true;
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

/**
 * !#en Angular damping
 * !#zh 角阻力
 */
js.getset(proto, 'angularDamping', 
    function () {
        return this._angularDamping;
    },
    function (value) {
        this._angularDamping = value;
        if (this._colliderObject) {
            this._colliderObject.setDamping(this._linearDamping, value);
        }
    }
);

/**
 * !#en Mass
 * !#zh 质量
 */
js.getset(proto, 'mass', 
    function () {
        return this._mass;
    },
    function (value) {
        value = Math.max(value, 0);
        this._mass = value;
        (this._isKinematic) || (this._updateMass(value));
    }
);

/**
 * !#en Linear damping
 * !#zh 线阻力
 */
js.getset(proto, 'linearDamping',
    function () {
        return this._linearDamping;
    },
    function (value) {
        this._linearDamping=value;
        if (this._colliderObject) {
            this._colliderObject.setDamping(value, this._angularDamping);
        }
    }
);

/**
 * !#en Is kinematic
 * !#zh 是否动力学物体
 */
js.getset(proto, 'isKinematic', 
    function () {
        return this._isKinematic;
    },
    function (value) {
        this._isKinematic = value;
        this._enableCount > 0 && this._removeFromWorld();
        let colliderObject = this._colliderObject;
        let flags = colliderObject.getCollisionFlags();
        if (value) {
            flags = flags | _CF_KINEMATIC_OBJECT;
            colliderObject.setCollisionFlags(flags);
            colliderObject.forceActivationState(_DISABLE_DEACTIVATION);
            this._enableProcessCollisions = false;
            this._updateMass(0);
        } else {
            if (flags & _CF_KINEMATIC_OBJECT)
                flags = flags & ~_CF_KINEMATIC_OBJECT;
            colliderObject.setCollisionFlags(flags);
            colliderObject.setActivationState(_ACTIVE_TAG);
            this._enableProcessCollisions = true;
            this._updateMass(this._mass);
        };
        _tempBTVec3.setValue(0, 0, 0);
        colliderObject.setInterpolationLinearVelocity(_tempBTVec3);
        colliderObject.setLinearVelocity(_tempBTVec3);
        colliderObject.setInterpolationAngularVelocity(_tempBTVec3);
        colliderObject.setAngularVelocity(_tempBTVec3);
        this._enableCount > 0 && this._addToWorld();
    }
);

/**
 * !#en gravity
 * !#zh 重力
 */
js.getset(proto, 'gravity', 
    function () {
        return this._gravity;
    },
    function (value) {
        this._gravity = value;
        _tempBTVec3.setValue(value.x, value.y, value.z);
        this._colliderObject.setGravity(_tempBTVec3);
    }
);

/**
 * !#en Override gravity
 * !#zh 是否重载重力
 */
js.getset(proto, 'overrideGravity', 
    function () {
        return this._overrideGravity;
    },
    function (value) {
        this._overrideGravity = value;
        let colliderObject = this._colliderObject;
        let flag = colliderObject.getFlags();
        if (value) {
            if ((flag & _BT_DISABLE_WORLD_GRAVITY) === 0) {
                colliderObject.setFlags(flag | _BT_DISABLE_WORLD_GRAVITY);
            }
        } else {
            if ((flag & _BT_DISABLE_WORLD_GRAVITY) > 0) {
                colliderObject.setFlags(flag & ~_BT_DISABLE_WORLD_GRAVITY);
            }
        }
    }
);

/**
 * !#en total force
 * !#zh 总力
 */
js.get(proto, 'totalForce',
    function () {
        return this._colliderObject.getTotalForce();
    }
);

/**
 * !#en linear velocity
 * !#zh 线速度
 */
js.getset(proto, 'linearVelocity',
    function(){
        return this._linearDamping;
    },
    function(value){
        this._linearVelocity.set(value);
        _tempBTVec3.setValue(value.x, value.y, value.z);
        this.isSleeping && this.wakeUp();
        this._colliderObject.setLinearVelocity(_tempBTVec3);
    }
);

/**
 * !#en Is needed to detect collisions
 * !#zh 是否进行碰撞检测
 */
js.getset(proto, 'detectCollisions',
    function(){
        return this._detectCollisions;
    },
    function (value) {
        if (this._detectCollisions !== value) {
            this._detectCollisions = value;
            if (this._enableCount > 0) {
                this._removeFromWorld();
                this._addToWorld();
            }
        }
    }
);

/**
 * !#en Linear factor
 * !#zh 线性因子
 */
js.getset(proto, 'linearFactor',
    function(){
        return this._linearFactor;
    },
    function(value){
        this._linearFactor.set(value);
        _tempBTVec3.setValue(value.x, value.y, value.z);
        this._colliderObject.setLinearFactor(_tempBTVec3);
    }
);

/**
 * !#en Angular factor
 * !#zh 角因子
 */
js.getset(proto, 'angularFactor',
    function () {
        return this._angularFactor;
    },
    function (value) {
        this._angularFactor.set(value);
        _tempBTVec3.setValue(value.x, value.y, value.z);
        this._colliderObject.setAngularFactor(_tempBTVec3);
    }
);

/**
 * !#en Angular velocity
 * !#zh 角速度
 */
js.getset(proto, 'angularVelocity',
    function () {
        return this._angularVelocity;
    },
    function (value) {
        this._angularVelocity.set(value);
        _tempBTVec3.setValue(value.x, value.y, value.z);
        this.isSleeping && this.wakeUp();
        this._colliderObject.setAngularVelocity(_tempBTVec3);
    }
);

/**
 * !#en Total torque
 * !#zh 刚体所有扭力
 */
js.get(proto, 'totalTorque',
    function () {
        let value = this._colliderObject.getTotalTorque();
        var out = this._totalTorque;
        out.x = value.x;
        out.y = value.y;
        out.z = value.z;
        return out;
    }
);

/**
 * !#en Is sleeping
 * !#zh 是否处于睡眠状态
 */
js.get(proto, 'isSleeping',
    function () {
        return this._colliderObject.getActivationState() === _ISLAND_SLEEPING;
    }
);

/**
 * !#en Sleep linear velocity
 * !#zh 刚体睡眠的线速度阈值
 */
js.getset(proto, 'sleepLinearVelocity',
    function () {
        return this._colliderObject.getLinearSleepingThreshold();
    },
    function (value) {
        let colliderObject = this._colliderObject;
        colliderObject.setSleepingThresholds(value, colliderObject.getAngularSleepingThreshold());
    }
);

/**
 * !#en Sleep angular velocity
 * !#zh 刚体睡眠的角速度阈值
 */
js.getset(proto, 'sleepAngularVelocity',
    function () {
        return this._colliderObject.getAngularSleepingThreshold();
    },
    function (value) {
        let colliderObject = this._colliderObject;
        colliderObject.setSleepingThresholds(colliderObject.getLinearSleepingThreshold(), value);
    }
);

module.exports = RigidBody3D;