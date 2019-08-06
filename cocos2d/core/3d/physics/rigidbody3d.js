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
let ammo = require("./lib/ammo");
let gRigidBodyId = 0;

let localInertia = new ammo.btVector3(0, 0, 0);
let tempBTTransform = new ammo.btTransform();
let tempBTVec3 = new ammo.btVector3();
let tempBTQuat = new ammo.btQuaternion();

let tempVec3 = vec3.create(0, 0, 0);


function trsToAmmo (ammoVec3, trs) {
    ammoVec3.setX(ccVec3.x);
    ammoVec3.setY(ccVec3.y);
    ammoVec3.setZ(ccVec3.z);
}

function vec3AmmoToCreator (ccVec3: Vec3, ammoVec3: Ammo.btVector3) {
    ccVec3.x = ammoVec3.x();
    ccVec3.y = ammoVec3.y();
    ccVec3.z = ammoVec3.z();
}

function trsToAmmo (ammoQuat: Ammo.btQuaternion, ccQuat: Quat) {
    ammoQuat.setX(ccQuat.x);
    ammoQuat.setY(ccQuat.y);
    ammoQuat.setZ(ccQuat.z);
    ammoQuat.setW(ccQuat.w);
}

function quatAmmoToCreator (ccQuat: Quat, ammoQuat: Ammo.btQuaternion) {
    ccQuat.x = ammoQuat.x();
    ccQuat.y = ammoQuat.y();
    ccQuat.z = ammoQuat.z();
    ccQuat.w = ammoQuat.w();
}

let RigidBody3D = cc.Class({
    ctor () {
        this._node = null;
        this._rigidBody = null;
        this._collisionWorld = null;
        this._refCount = 0;
        this._id = -1;
        this._transformBuffer = null;
        this._ammoTransform = null;
        this._compoundShape = null;
        this._rigidBodyComponent = null;

        this._isKinematic = false;
        this._mass = 1.0;
        this._angularDamping = 0.0;
        this._linearDamping = 0.0;

        this._overrideGravity = false;
        this._detectCollisions = true;
        this._motionState = null;

        this._gravity = vec3.create(0, -10, 0);
		this._totalTorque = vec3.create(0, 0, 0);
		this._linearVelocity = vec3.create();
		this._angularVelocity = vec3.create();
		this._linearFactor = vec3.create(1, 1, 1);
		this._angularFactor = vec3.create(1, 1, 1);

        this._collisionFilterGroup = 1 << 0;
        this._collisionFilterMask = 1 << 0;

        this._nReconstructShapeRequest = 1;
        this._nReconstructBodyRequest = 1;

        this._physics3DManger = cc.director.getPhysics3DManager();
    },

    init (node, rigidBodyComponent, collisionWorld) {
        this._node = node;
        this._rigidBodyComponent = rigidBodyComponent;
        this._collisionWorld = collisionWorld;
        this._id = gRigidBodyId++;

        this._compoundShape = new ammo.btCompoundShape(true);
        this._buildRigidBody();
    },

    _buildRigidBody () {
        this._rigidBody && this._physics3DManger._removeRigidBody(this._rigidBody);

        vec3CreatorToAmmo(this._ammoWorldPositionBuffer, this._worldPosition);
        quatCreatorToAmmo(this._ammoWorldRotationBuffer, this._worldRotation);

        let trs = this.node._trs;
        tempBTTransform.setIdentity();
        tempBTVec3.setX(trs[0]);
        tempBTVec3.setY(trs[0]);
        tempBTVec3.setZ(trs[0]);
        tempBTTransform.setOrigin(tempBTVec3);
        tempBTQuat.setY(trs[1]);
        tempBTTransform.setRotation(tempBTQuat);

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(this._ammoWorldPositionBuffer);
        transform.setRotation(this._ammoWorldRotationBuffer);

        const localInertia = new Ammo.btVector3(0, 0, 0);
        this._compoundShape.calculateLocalInertia(this._mass, localInertia);

        this._motionState = new Ammo.btDefaultMotionState(transform);
        const rigidBodyConstructionInfo = new Ammo.btRigidBodyConstructionInfo(this._mass, this._motionState, this._compoundShape, localInertia);
        this._rigidBody = new Ammo.btRigidBody(rigidBodyConstructionInfo);
        this._rigidBody.setUserIndex(this._id);

        this.setUseGravity(this._useGravity);

        this._rigidBody.setRestitution(0);
        this._rigidBody.setFriction(0.7745967);

        this._updateDamping();

        this._physics3DManger._addRigidBody(this._rigidBody, this._collisionFilterGroup, this._collisionFilterMask);
    },

    destroy () {

    },

    incRef () {
        this._refCount++;
    },

    decRef () {
        this._refCount--;
        if (this._refCount <= 0) {
            this.destroy();
        }
    },

    enable () {

    },

    disable () {

    },

    addShape (shape_: ShapeBase) {
        const shape = shape_ as AmmoShape;
        shape._setBody(this);
        this._shapes.push(shape);
        this.commitShapeUpdates();
    },

    removeShape (shape_: ShapeBase) {
        const shape = shape_ as AmmoShape;
        shape._setBody(null);
        const iShape = this._shapes.indexOf(shape);
        if (iShape >= 0) {
            this._shapes.splice(iShape, 1);
        }
        this.commitShapeUpdates();
    },

    commitShapeUpdates () {
        ++this._nReconstructShapeRequest;
    },

    getMass () {
        return this._mass;
    },

    setMass (value) {
        this._mass = value;
        
        this._physics3DManger._removeRigidBody(this._rigidBody);
        
        this._compoundShape.calculateLocalInertia(this._mass, localInertia);
        this._rigidBody.setMassProps(this._mass, localInertia);
        this._rigidBody.updateInertiaTensor();

        this._physics3DManger._addRigidBody(this._rigidBody, this._collisionFilterGroup, this._collisionFilterMask);
    },

    getIsKinematic () {
        return this._isKinematic;
    },

    setIsKinematic (value) {
        this._isKinematic = value;
    },

    getLinearDamping () {
        return this._linearDamping;
    },

    setLinearDamping (value) {
        this._linearDamping = value;
        this._updateDamping();
    },

    public getAngularDamping () {
        return this._angularDamping;
    }

    public setAngularDamping (value: number) {
        this._angularDamping = value;
        this._updateDamping();
    }

    public getUseGravity (): boolean {
        return this._useGravity;
    }

    public setUseGravity (value: boolean) {
        this._useGravity = value;
        if (value) {
            if (this._world) {
                const worldGravity = this._world.gravity;
                this._ammoRigidBody.setGravity(new Ammo.btVector3(worldGravity.x, worldGravity.y, worldGravity.z));
            }
        } else {
            this._ammoRigidBody.setGravity(new Ammo.btVector3(0, 0, 0));
        }
    }

    public getIsTrigger (): boolean {
        // TO DO
        return true;
    }

    public setIsTrigger (value: boolean): void {
        // TO DO
    }

    public getVelocity (): Vec3 {
        const linearVelocity = this._ammoRigidBody.getLinearVelocity();
        vec3AmmoToCreator(this._velocityResult, linearVelocity);
        return this._velocityResult;
    }

    public setVelocity (value: Vec3): void {
        this._changeRequests.velocity.hasValue = true;
        vec3.copy(this._changeRequests.velocity.storage, value);
    }

    public getFreezeRotation (): boolean {
        // TO DO
        return false;
    }

    public setFreezeRotation (value: boolean) {
        // TO DO
    }

    public applyForce (force: Vec3, position?: Vec3) {
        if (!position) {
            position = new Vec3();
            const p = this._ammoRigidBody.getWorldTransform().getOrigin();
            vec3AmmoToCreator(position, p);
        }
        this._changeRequests.forces.push({
            force,
            position,
        });
    }

    public applyImpulse (impulse: Vec3) {
        const ammoImpulse = new Ammo.btVector3(0, 0, 0);
        vec3CreatorToAmmo(ammoImpulse, impulse);
        this._ammoRigidBody.applyCentralImpulse(ammoImpulse);
    }

    private _updateDamping () {
        this._ammoRigidBody.setDamping(this._linearDamping, this._angularDamping);
    }

    private _reconstructCompoundShape () {
        this._compoundShape = new Ammo.btCompoundShape();
        for (const shape of this._shapes) {
            this._compoundShape.addChildShape(shape.transform, shape.impl);
        }
        ++this._nReconstructBodyRequest;
    }

    private _beforeWorldStep () {
        if (this._nReconstructShapeRequest) {
            this._reconstructCompoundShape();
            this._nReconstructShapeRequest = 0;
        }
        if (this._nReconstructBodyRequest) {
            this._reconstructBody();
            this._nReconstructBodyRequest = 0;
        }
        if (this._changeRequests.velocity.hasValue) {
            this._changeRequests.velocity.hasValue = false;
            const v = new Ammo.btVector3();
            vec3CreatorToAmmo(v, this._changeRequests.velocity.storage);
            this._ammoRigidBody.setLinearVelocity(v);
        }
        for (const { force, position } of this._changeRequests.forces) {
            const ammoForce = new Ammo.btVector3(0, 0, 0);
            vec3CreatorToAmmo(ammoForce, force);
            const ammoPosition = new Ammo.btVector3(0, 0, 0);
            vec3CreatorToAmmo(ammoPosition, position);
            this._ammoRigidBody.applyForce(ammoForce, ammoPosition);
        }
        this._changeRequests.forces.length = 0;
    }

    getGroup () {
        return this._collisionFilterGroup;
    },

    setGroup (v) {
        this._collisionFilterGroup = v;
        this._updateGroupOrMask();
    },

    addGroup (v) {
        this._collisionFilterGroup |= v;
        this._updateGroupOrMask();
    },

    removeGroup (v) {
        this._collisionFilterGroup &= ~v;
        this._updateGroupOrMask();
    },

    getMask () {
        return this._collisionFilterMask;
    },

    setMask (v) {
        this._collisionFilterMask = v;
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

    _updateGroupOrMask () {
        this._physics3DManger._removeRigidBody(this._rigidBody);
        this._physics3DManger._addRigidBody(this._rigidBody, this._collisionFilterGroup, this._collisionFilterMask);
    },

    updatePhysicsTransform () {
        
    },
});

module.exports = RigidBody3D;