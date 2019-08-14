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
let Physics3DBaseComponent = require("./physics3d-base-component");

let Collider3DComponent = cc.Class({
    name: 'cc.Collider3DComponent',
    extends: Physics3DBaseComponent,

    properties: {
        /**
         * !#en Collider shape center
         * !#zh 碰撞器中心点
         * @property {cc.Vec3} center
         * @default cc.v3(0, 0, 0)
         */
        _center: null,
        center: {
            type: cc.Vec3,
            get () {
                return this._center;
            },
            set (value) {
                this._center.x = value.x;
                this._center.y = value.y;
                this._center.z = value.z;
                this._physicsObject.updateShapeTransform(this);
            },
        },

        /**
         * 
         */

        /**
         * !#en Enabled trigger
         * !#zh 是否为触发器
         * @property {Boolean} isTrigger
         * @default false
         */
        isTrigger: {
            default: false,
            tooltip: CC_DEV && 'i18n:COMPONENT.physics3d.collider.isTrigger',
            notify () {
                this._updateTrigger();
            }
        },
    },

    ctor () {
        this._indexInCompound = -1;
        this._center = cc.v3(0, 0, 0);
    },

    __preload () {
        this._super();
        this._updateTrigger();
    },

    _updateShape () {
        if (this._colliderShape) {
            if (this._indexInCompound !== -1) {
                this._physicsObject.removeShape(this);
            }
            ammo.destroy(this._colliderShape);
            this._colliderShape = null;
        }
        let x = this._size.x * 0.5;
        let y = this._size.y * 0.5;
        let z = this._size.z * 0.5;
        _tempBTVec3.setValue(x, y, z);
        this._colliderShape = new ammo.btBoxShape(_tempBTVec3);
        this._physicsObject.addShape(this);
    },
});
module.exports = Collider3DComponent;