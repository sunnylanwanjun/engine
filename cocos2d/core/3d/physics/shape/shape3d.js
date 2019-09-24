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

let Shape3D = cc.Class({
    name: 'cc.Shape3D',
    extends: cc.Component,

    properties: {
        _offset: cc.v3(0, 0, 0),
        _rotation: cc.v3(0, 0, 0),

        /**
         * !#en Collider shape offset
         * !#zh 碰撞器偏移
         * @property {cc.Vec3} offset
         * @default cc.v3(0, 0, 0)
         */
        offset: {
            type: cc.Vec3,
            get () {
                return this._offset;
            },
            set (value) {
                this._offset.x = value.x;
                this._offset.y = value.y;
                this._offset.z = value.z;
                if (this._compoundShape) {
                    this._compoundShape._updateSubShapeTransform(this);
                }
            },
        },

        /**
         * !#en Collider shape rotation
         * !#zh 碰撞器旋转
         * @property {cc.Vec3} rotation
         * @default cc.v3(0, 0, 0)
         */
        rotation: {
            type: cc.Vec3,
            get () {
                return this._rotation;
            },
            set (value) {
                this._rotation.x = value.x;
                this._rotation.y = value.y;
                this._rotation.z = value.z;
                if (this._compoundShape) {
                    this._compoundShape._updateSubShapeTransform(this);
                }
            },
        }
    },

    ctor () {
        this._attachObject = null;
        this._shapeObject = null;

        this._compoundShape = null;
        this._indexInCompound = -1;
        this._attached = false;
    },

    onDestroy () {
        this._super();
        this._destroyShape();
    },
    
    onEnable () {
        this._super();
        let attachType = this._getAttachComponentType();
        let attachObject = this.getComponent(attachType);
        if (!attachObject) {
            cc.error("Shape component depend on collider or rigidbody component");
            return;
        }
        this._attachObject = attachObject;
        this._attachShape();
        if (this._compoundShape) {
            this._compoundShape._updateSubShapeTransform(this);
        }
    },

    onDisable () {
        this._super();
        this._detachShape();
    },

    /// private interface

    // implement by subclass
    _createShape () {
    },

    // implement by subclass
    _getAttachComponentType () {
    },

    __preload () {
        this._super();
        this._createShape();
    },

    _attachShape () {
        if (!this._attached) {
            this._attachObject && this._attachObject.addSubShape(this);
            this._attached = true;
        }
    },

    _detachShape () {
        if (this._attached) {
            this._attachObject && this._attachObject.removeSubShape(this);
            this._attachObject = null;
            this._attached = false;
        }
    },

    _destroyShape () {
        if (this._shapeObject) {
            this._detachShape();
            ammo.destroy(this._shapeObject);
            this._shapeObject = null;
        }
    },

    _getWorldScale () {
        let node = this.node;
        let scaleX = node.scaleX;
        let scaleY = node.scaleY;
    
        let parent = node.parent;
        while(parent.parent){
            scaleX *= parent.scaleX;
            scaleY *= parent.scaleY;
            parent = parent.parent;
        }
    
        return cc.v2(scaleX, scaleY);
    }
});

module.exports = cc.Shape3D = Shape3D;