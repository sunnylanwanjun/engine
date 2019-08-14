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

const RigidBody3D = require("./rigidbody3d");
const Collider3D = require("./collider3d");

let Physics3DBaseComponent = cc.Class({
    name: 'cc.Physics3DBaseComponent',
    extends: cc.Component,

    ctor () {
        this._physicsObject = null;
        this._enablePhysicsObject = false;
    },

    /**
     * @zh
     * 设置分组值。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    setGroup (v) {
        if (this._physicsObject) {
            return this._physicsObject.setGroup(v);
        }
    },

    /**
     * @zh
     * 获取分组值。
     * @returns 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    getGroup () {
        if (this._physicsObject) {
            return this._physicsObject.getGroup();
        }
        return 0;
    },

    /**
     * @zh
     * 添加分组值，可填要加入的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    addGroup (v) {
        if (this._physicsObject) {
            return this._physicsObject.addGroup(v);
        }
    },

    /**
     * @zh
     * 减去分组值，可填要移除的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    removeGroup (v) {
        if (this._physicsObject) {
            return this._physicsObject.removeGroup(v);
        }
    },

    /**
     * @zh
     * 获取掩码值。
     * @returns 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    getMask () {
        if (this._physicsObject) {
            return this._physicsObject.getMask();
        }
        return 0;
    },

    /**
     * @zh
     * 设置掩码值。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    setMask (v) {
        if (this._physicsObject) {
            return this._physicsObject.setMask(v);
        }
    },

    /**
     * @zh
     * 添加掩码值，可填入需要检查的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    addMask (v) {
        if (this._physicsObject) {
            return this._physicsObject.addMask(v);
        }
    },

    /**
     * @zh
     * 减去掩码值，可填入不需要检查的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    removeMask (v) {
        if (this._physicsObject) {
            return this._physicsObject.removeMask(v);
        }
    },

    onEnable () {
        if (this._enablePhysicsObject) return;
        this._enablePhysicsObject = true;
        if (this._physicsObject) {
            this._physicsObject.enable();
        }
    },

    onDisable () {
        if (!this._enablePhysicsObject) return;
        this._enablePhysicsObject = false;
        if (this._physicsObject) {
            this._physicsObject.disable();
        }
    },

    onDestroy () {
        if (this._physicsObject) {
            this._physicsObject.decRef();
            this._physicsObject = null;
        }
    },

    __preload () {
        if (!CC_EDITOR) return;

        if (this._physicsObject == null) {
            const comps = this.node.getComponents(cc.Physics3DBaseComponent);
            let share = null;
            for (const comp of comps) {
                if (comp._physicsObject) {
                    share = comp._physicsObject;
                    break;
                }
            }

            const hasRigidbody = !!(this instanceof cc.RigidBody3DComponent);
            let oldShare = null;
            if (share && hasRigidbody !== share.isRigidBody()) {
                oldShare = share;
                share = null;
            }

            if (!share) {
                if (hasRigidbody) {
                    share = new RigidBody3D(this.node);
                } else {
                    share = new Collider3D(this.node);
                }

                if (oldShare) {
                    share.extract(oldShare);
                    oldShare.destroy();
                    oldShare = null;
                }

                for (const comp of comps) {
                    comp._physicsObject = share;
                }
            }

            this._physicsObject = share;
            share.incRef();
        }
    }
});

module.exports = Physics3DBaseComponent;