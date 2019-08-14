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
let Physics3D = require("./physics3d");

let Collider3D = function (node) {
    Physics3D.call(this, node);
};

let proto = Collider3D.prototype;
js.extend(proto, Physics3D);

js.mixin(proto, {

    _removeFromWorld () {
        Physics3D.prototype._removeFromWorld.call(this);
        this._physics3DManger._addCollider(this._colliderObject);
    },

    _addToWorld () {
        Physics3D.prototype._addToWorld.call(this);
        this._physics3DManger._removeCollider(this._colliderObject, this._collisionFilterGroup, this._collisionFilterMask);
    },

    _buildCollider () {
        let colliderObject = this._colliderObject = new ammo.btCollisionObject();
        colliderObject.setUserIndex(this.id);
        colliderObject.forceActivationState(_DISABLE_SIMULATION);
        let flags = colliderObject.getCollisionFlags();
        if ((flags & _CF_STATIC_OBJECT) !== 0)
            flags = flags & ~_CF_STATIC_OBJECT;
        flags=flags | _CF_KINEMATIC_OBJECT;
        colliderObject.setCollisionFlags(flags);
        colliderObject.setCollisionShape(this._compoundShape);
    },

    /**
     * !#en destroy all WebAssembly object
     * !#zh 释放所有 WebAssembly 对象
     */
    destroy () {
        Physics3D.prototype.destroy.call(this);
        if (this._colliderObject) {
            ammo.destroy(this._colliderObject);
            this._colliderObject = null;
        }
    },
});

module.exports = Collider3D;