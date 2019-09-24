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
let ammo = require("../lib/ammo");
let _tempBTVec3 = new ammo.btVector3();

cc.Shape3D.Box = cc.Class({
    properties: {
        /**
         * !#en Collider shape size
         * !#zh 碰撞器尺寸
         * @property {cc.Vec3} size
         * @default cc.v3(0, 0, 0)
         */
        _size: cc.v3(0, 0, 0),
        size: {
            type: cc.Vec3,
            get () {
                return this._size;
            },
            set (value) {
                this._size.x = value.x;
                this._size.y = value.y;
                this._size.z = value.z;
                this._updateShape();
            },
        },
    },

    /// private interface
    _createShape () {
        let x = this._size.x * 0.5;
        let y = this._size.y * 0.5;
        let z = this._size.z * 0.5;
        _tempBTVec3.setValue(x, y, z);
        this._shapeObject = new ammo.btBoxShape(_tempBTVec3);
    },
});

cc.BoxCollider3D = cc.Class({
    name : "cc.BoxCollider3D",
    extends : cc.Shape3D,
    mixins: [cc.Shape3D.Box],

    editor: CC_EDITOR && {
        menu: 'i18n:MAIN_MENU.component.collider3D/Box Collider',
        requireComponent: cc.Collider3D
    },

    _getAttachComponentType () {
        return cc.Collider3D;
    }
});

cc.PhysicsBoxCollider3D = cc.Class({
    name : "cc.PhysicsBoxCollider3D",
    extends : cc.Shape3D,
    mixins: [cc.Shape3D.Box],
    
    editor: CC_EDITOR && {
        menu: CC_EDITOR && 'i18n:MAIN_MENU.component.physics3D/Collider/Box',
        requireComponent: cc.RigidBody3D
    },

    _getAttachComponentType () {
        return cc.RigidBody3D;
    }
});