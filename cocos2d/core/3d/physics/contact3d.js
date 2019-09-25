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

let Contact3D = cc.Class ({

    properties: {
        _collider1: null,
        _collider2 : null,
        _distance : 0,
        _normal : cc.v3(0, 0, 0),
        _position1 : cc.v3(0, 0, 0),
        _position2 : cc.v3(0, 0, 0),

        /**
         * !#en one of the colliders
         * !#zh 发生碰撞的两个物理对象之一
         * @property {cc.Physics3DBase} collider1
         */
        collider1: {
            get () {
                return this._collider1;
            },
            set (value) {
                this._collider1 = value;
            }
        },

        /**
         * !#en one of the colliders
         * !#zh 发生碰撞的两个物理对象之一
         * @property {cc.Physics3DBase} collider2
         */
        collider2: {
            get () {
                return this._collider2;
            },
            set (value) {
                this._collider2 = value;
            }
        },

        /**
         * !#en distance of the colliders
         * !#zh 两个物理对象之间的距离
         * @property {Number} distance
         */
        distance: {
            get () {
                return this._distance;
            },
            set (value) {
                this._distance = value;
            }
        },

        /**
         * !#en collider normal line
         * !#zh 碰撞法线
         * @property {Vec3}} distance
         */
        normal: {
            get () {
                return this._normal;
            },
            set (value) {
                this._normal.set(value);
            }
        },

        /**
         * !#en position of collider
         * !#zh 物理对象1中的碰撞位置
         * @property {Vec3} position1
         */
        position1: {
            get () {
                return this._position1;
            },
            set (value) {
                this._position1.set(value);
            }
        },

        /**
         * !#en position of collider
         * !#zh 物理对象2中的碰撞位置
         * @property {Vec3} position2
         */
        position2: {
            get () {
                return this._position2;
            },
            set (value) {
                this._position2.set(value);
            }
        }
    },

    reset () {
        this._collider1 = null;
        this._collider2 = null;
        this._distance = 0;
        this._normal.set(0, 0, 0);
        this._position1.set(0, 0, 0);
        this._position2.set(0, 0, 0);
    }
});

module.exports = cc.Contact3D = Contact3D;