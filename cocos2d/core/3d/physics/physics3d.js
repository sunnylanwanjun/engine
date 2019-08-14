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
const js = require('../platform/js');
const Node = cc.Node;
const NodeEvent = Node.EventType;
const DirtyFlag = Node._LocalDirtyFlag;
let _gRigidBodyId = 0;
let _normalBTVec3 = new ammo.btVector3(1, 1, 1);
let _tempBTVec3 = new ammo.btVector3();
let _tempTransform = new ammo.btTransform();

// collision flag
_CF_STATIC_OBJECT = 1;
_CF_KINEMATIC_OBJECT = 2;
_CF_NO_CONTACT_RESPONSE = 4;
_CF_CUSTOM_MATERIAL_CALLBACK = 8; //this allows per-triangle material (friction/restitution)
_CF_CHARACTER_OBJECT = 16;
_CF_DISABLE_VISUALIZE_OBJECT = 32; //disable debug drawing
_CF_DISABLE_SPU_COLLISION_PROCESSING = 64; //disable parallel/SPU processing

// activation state
_ACTIVE_TAG = 1;
_ISLAND_SLEEPING = 2;
_WANTS_DEACTIVATION = 3;
_DISABLE_DEACTIVATION = 4;
_DISABLE_SIMULATION = 5;

// btRigidBodyFlags
_BT_DISABLE_WORLD_GRAVITY = 1;
_BT_ENABLE_GYROPSCOPIC_FORCE = 2;

let Physics3D = function (node) {
    this._isTrigger = false;
    this._enableCount = 0;
    this._node = node;
    this._id = _gRigidBodyId++;
    this._refCount = 0;

    this._compoundShape = new ammo.btCompoundShape();
    this._colliderObject = null;
    this._shapes = [];

    this._collisionFilterGroup = 1 << 0;
    this._collisionFilterMask = 1 << 0;

    this._inTransformList = false;
    this._transformFlag = DirtyFlag.POSITION | DirtyFlag.ROTATION | DirtyFlag.SCALE;

    this._physics3DManger = cc.director.getPhysics3DManager();
    this._buildCollider();
    this._updateTrigger();
};

let proto = Physics3D.prototype;
js.mixin(proto, {
    _buildCollider () {

    },

    _removeFromWorld () {
    },

    _addToWorld () {
    },

    /**
     * !#en destroy all WebAssembly object
     * !#zh 释放所有 WebAssembly 对象
     */
    destroy () {
        this._enableCount = 0;
        this._refCount = 0;
        if (this._compoundShape) {
            ammo.destroy(this._compoundShape);
            this._compoundShape = null;
        }
    },

    /**
     * !#en Increase reference count
     * !#zh 增加引用计数
     */
    incRef () {
        this._refCount++;
    },

    /**
     * !#en Decrease reference count, if reference count is zero, rigid body will be destroyed.
     * !#zh 减少引用计数，当引用计数为0时，刚体会被销毁
     */
    decRef () {
        this._refCount--;
        if (this._refCount <= 0) {
            this.destroy();
        }
    },

    /**
     * !#en Enabled rigid body
     * !#zh 启用刚体
     */
    enable () {
        if (this._enableCount == 0) {
            this._enable();
        }
        this._enableCount++;
    },

    _enable () {
        this._updatePhysicsTransform(true);
        this._registerNodeEvents();
        this._addToWorld();
    },

    /**
     * !#en Disabled rigid body
     * !#zh 禁用刚体
     */
    disable () {
        if (this._enableCount <= 0) return;
        this._enableCount--;
        if (this._enableCount <= 0) {
            this._disable();
        }
    },

    _disable () {
        this._physics3DManger._removeFromTransformList(this);
        this._unregisterNodeEvents();
        this._removeFromWorld();
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

    _updatePhysicsTransform (force) {
        let flag = this._transformFlag;
        if (force || flag & DirtyFlag.POSITION) {
            
            this._transformFlag &= ~DirtyFlag.ROTATION;
        }
        if (force || flag & DirtyFlag.ROTATION) {
            
            this._transformFlag &= ~DirtyFlag.ROTATION;
        }
        if (force || flag & DirtyFlag.SCALE) {
            
            this._transformFlag &= ~DirtyFlag.SCALE;
        }
    },

    addGroup (v) {
        this._collisionFilterGroup |= v;
        this._updateGroupOrMask();
    },

    removeGroup (v) {
        this._collisionFilterGroup &= ~v;
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
        if (this._enableCount > 0) {
            this._removeFromWorld();
            this._addToWorld();
        }
    },

    isRigidBody () {
        return false;
    },

    addShape (colliderComp) {
        colliderComp._indexInCompound = this._shapes.length;
        this._shapes.push(colliderComp);
        // _tempTransform.
    },

    removeShape (colliderComp) {
        let iShape = colliderComp._indexInCompound;
        colliderComp._indexInCompound = -1;
        let shapes = this._shapes;
        if (iShape == -1) return;
        if (shapes[iShape] !== colliderComp) {
            cc.error("Physics3D: removeShape failed, indexInCompound", iShape);
            return;
        }
        
        let shapesLen = this._shapes.length;
        if (shapesLen - 1 == iShape) {
            shapes.splice(iShape, 1);
            this._compoundShape.removeChildShapeByIndex(iShape);
            return;
        }

        let lastCollider = this._shapes[shapesLen - 1];
        shapes.splice(iShape, 1);
        shapes[iShape] = lastCollider;
        lastCollider._indexInCompound = iShape;
        this._compoundShape.removeChildShapeByIndex(iShape);
    },

    clearShapes () {

    },

    extract (other) {
        let shapes = other._shapes;
        other._shapes = [];
        this._shapes = shapes;

        let compoundShape = other._compoundShape;
        other._compoundShape = null;
        if (this._compoundShape) {
            ammo.destroy(this._compoundShape);
            this._compoundShape = null;
        }
        this._compoundShape = compoundShape;
        this._colliderObject.setCollisionShape(compoundShape);

        let collisionFlags = this._colliderObject.getCollisionFlags();
        this._colliderObject.setCollisionFlags(collisionFlags);

        this._enableCount = other._enableCount;
        this._refCount = other._refCount;

        this.group = other._collisionFilterGroup;
        this.mask = other._collisionFilterMask;
    },

    _updateTrigger () {
        let colliderObject = this._colliderObject;
        let flags = colliderObject.getCollisionFlags();
        if (this._isTrigger) {
            if ((flags & _CF_NO_CONTACT_RESPONSE) === 0)
                colliderObject.setCollisionFlags(flags | _CF_NO_CONTACT_RESPONSE);
        } else {
            if ((flags & _CF_NO_CONTACT_RESPONSE) !== 0)
                colliderObject.setCollisionFlags(flags & ~_CF_NO_CONTACT_RESPONSE);
        }
    },
});

/**
 * !#en Collision filter group
 * !#zh 碰撞组
 */
js.getset(proto, 'group',
    function () {
        return this._collisionFilterGroup;
    },
    function (value) {
        this._collisionFilterGroup = value;
        this._updateGroupOrMask();
    }
);

/**
 * !#en Collision filter mask
 */
js.getset(proto, 'mask',
    function () {
        return this._collisionFilterMask;
    },
    function (value) {
        this._collisionFilterMask = value;
        this._updateGroupOrMask();
    }
);

module.exports = Physics3D;