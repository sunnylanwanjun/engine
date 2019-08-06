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
const NodeEvent = require('../CCNode').EventType;

let Physics3DBaseComponent = cc.Class({
    name: 'cc.Physics3DBaseComponent',
    extends: cc.Component,

    ctor () {
        this._colliderObject = null;
        this._inTransformList = false;
        this._shareBody = null;
        this._physics3DManger = cc.director.getPhysics3DManager();
    },

    /**
     * @zh
     * 设置分组值。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    setGroup (v) {
        if (this._shareBody) {
            return this._shareBody.setGroup(v);
        }
    },

    /**
     * @zh
     * 获取分组值。
     * @returns 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    getGroup () {
        if (this._shareBody) {
            return this._shareBody.getGroup();
        }
        return 0;
    },

    /**
     * @zh
     * 添加分组值，可填要加入的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    addGroup (v) {
        if (this._shareBody) {
            return this._shareBody.addGroup(v);
        }
    },

    /**
     * @zh
     * 减去分组值，可填要移除的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    removeGroup (v) {
        if (this._shareBody) {
            return this._shareBody.removeGroup(v);
        }
    },

    /**
     * @zh
     * 获取掩码值。
     * @returns 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    getMask () {
        if (this._shareBody) {
            return this._shareBody.getMask();
        }
        return 0;
    },

    /**
     * @zh
     * 设置掩码值。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    setMask (v) {
        if (this._shareBody) {
            return this._shareBody.setMask(v);
        }
    },

    /**
     * @zh
     * 添加掩码值，可填入需要检查的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    addMask (v) {
        if (this._shareBody) {
            return this._shareBody.addMask(v);
        }
    },

    /**
     * @zh
     * 减去掩码值，可填入不需要检查的 group。
     * @param v - 整数，范围为 2 的 0 次方 到 2 的 31 次方
     */
    removeMask (v) {
        if (this._shareBody) {
            return this._shareBody.removeMask(v);
        }
    },

    onEnable () {
        if (this._shareBody) {
            this._shareBody.enable();
        }
        this._registerNodeEvents();
    },

    onDisable () {
        if (this._shareBody) {
            this._shareBody.disable();
        }
        this._unregisterNodeEvents();
    },

    onDestroy () {
        if (this._shareBody) {
            this._shareBody.decRef();
            this._shareBody = null;
        }
    },

    _registerNodeEvents: function () {
        var node = this.node;
        node.on(NodeEvent.POSITION_CHANGED, this._toUpdatePhysicsTransform, this);
        node.on(NodeEvent.ROTATION_CHANGED, this._toUpdatePhysicsTransform, this);
        node.on(NodeEvent.SCALE_CHANGED, this._toUpdatePhysicsTransform, this);
    },

    _unregisterNodeEvents: function () {
        var node = this.node;
        node.off(NodeEvent.POSITION_CHANGED, this._toUpdatePhysicsTransform, this);
        node.off(NodeEvent.ROTATION_CHANGED, this._toUpdatePhysicsTransform, this);
        node.off(NodeEvent.SCALE_CHANGED, this._toUpdatePhysicsTransform, this);
    },

    _toUpdatePhysicsTransform () {
        if (this._physics3DManger) {
            this._physics3DManger._addToTransformList(this);
        }
    },

    _updatePhysicsTransform () {
        if (this._shareBody) {
            this._shareBody.updatePhysicsTransform();
        }
    },

    __preload () {
        if (!CC_EDITOR) return;

        if (this._shareBody == null) {
            const physicsBaseComponents = this.node.getComponents(Physics3DBaseComponent);
            let shareBody = null;
            for (const physicsBasedComponent of physicsBaseComponents) {
                if (physicsBasedComponent._shareBody) {
                    shareBody = physicsBasedComponent._shareBody;
                    break;
                }
            }
            if (!shareBody) {
                const rigidbody = this.getComponent(cc.RigidBody3DComponent);
                shareBody = new RigidBody3D();
                shareBody.init(this.node, rigidbody);
            }
            shareBody.incRef();
            this._shareBody = shareBody;
        }

        this._toUpdatePhysicsTransform();
    }
});

module.exports = Physics3DBaseComponent;