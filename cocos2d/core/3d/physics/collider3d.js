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
let Physics3DBase = require("./physics3d-base");
let CollisionFlag = Physics3DBase.CollisionFlag;
let ActivationState = Physics3DBase.ActivationState;

let Collider3D = cc.Class ({
    name: 'cc.Collider3D',
    extends: Physics3DBase,

    editor: CC_EDITOR && {
        executeInEditMode: true,
        disallowMultiple: true
    },

    ctor () {

    },

    onDestroy () {
        this._super();
        if (this._colliderObject) {
            ammo.destroy(this._colliderObject);
            this._colliderObject = null;
        }
    },

    /// private interface
    __preload () {
        this._super();
    },

    _removeFromWorld () {
        this._super();
        this._physics3DManger._addCollider(this._colliderObject);
    },

    _addToWorld () {
        this._super();
        this._physics3DManger._removeCollider(this._colliderObject, this._collisionFilterGroup, this._collisionFilterMask);
    },

    _buildCollider () {
        let colliderObject = this._colliderObject = new ammo.btCollisionObject();
        colliderObject.setUserIndex(this.id);
        colliderObject.forceActivationState(ActivationState.DISABLE_SIMULATION);
        let flags = colliderObject.getCollisionFlags();
        if ((flags & CollisionFlag.STATIC_OBJECT) !== 0)
            flags = flags & ~ CollisionFlag.STATIC_OBJECT;
        flags = flags | CollisionFlag.KINEMATIC_OBJECT;
        colliderObject.setCollisionFlags(flags);
    },
});

module.exports = Collider3D;