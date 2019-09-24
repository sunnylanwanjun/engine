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
let _normalBTVec3 = new ammo.btVector3(1, 1, 1);
let _tempBTVec3 = new ammo.btVector3(1, 1, 1);
let _tempBTQuaternion = new ammo.btQuaternion(0, 0, 0, 1);
let _tempBTTransform = new ammo.btTransform();
let _tempCCQuat = new cc.quat();

let CompoundShape = cc.Class({
    name: 'cc.CompoundShape',

    properties: {
        _offset : cc.v3(0, 0, 0),
        _rotation :  cc.v3(0, 0, 0),
    
        /**
         * !#en Compound collider shape offset
         * !#zh 组合碰撞器偏移
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
            },
        },

        /**
         * !#en Compound Collider shape rotation
         * !#zh 组合碰撞器旋转
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
            },
        }
    },

    ctor () {
        this._shapeObject = new ammo.btCompoundShape();
        this._shapes = [];
    },

    destroy () {
        this._clearShapes();
        if (this._shapeObject) {
            ammo.destroy(this._shapeObject);
            this._shapeObject = null;
        }
    },

    _getColliderShape () {
        return this._shapeObject;
    },

    _addSubShape (shapeComponent) {
        if (shapeComponent._attached) {
            cc.error("Shape component can't be attached to different target at the same time");
            return;
        }
        shapeComponent._shapeObject = this;
        shapeComponent._indexInCompound = this._shapes.length;
        this._shapes.push(shapeComponent);

        var offset = shapeComponent.offset;
		var rotation = shapeComponent.rotation;
		_tempBTVec3.setValue(offset.x, offset.y, offset.z);
		_tempBTQuaternion.setValue(rotation.x, rotation.y, rotation.z, rotation.w);
		_tempBTTransform.setOrigin(_tempBTVec3);
        _tempBTTransform.setRotation(_tempBTQuaternion);
        
        let compoundShape = this._shapeObject;
		var originScale = compoundShape.getLocalScaling();
		compoundShape.setLocalScaling(_normalBTVec3);
		compoundShape.addChildShape(_tempBTTransform, shapeComponent._shapeObject);
		compoundShape.setLocalScaling(originScale);
    },

    _removeSubShape (shapeComponent) {
        if (shapeComponent._attached) {
            cc.error("cc.CompoundShape: Shape component has been detach");
            return;
        }
        if (shapeComponent._shapeObject != this) {
            cc.error("cc.CompoundShape: Shape component hasn't been attach to the compound shape");
            return;
        }
        let iShape = shapeComponent._indexInCompound;
        if (iShape == -1) {
            cc.error("cc.CompoundShape: Shape component's compound index incorrect");
            return;
        }

        shapeComponent._shapeObject = null;
        shapeComponent._indexInCompound = -1;
        let shapes = this._shapes;
        if (shapes[iShape] !== shapeComponent) {
            cc.error("cc.CompoundShape: store shape different", iShape);
            return;
        }
        
        let shapesLen = this._shapes.length;
        if (shapesLen - 1 == iShape) {
            shapes.splice(iShape, 1);
            this._shapeObject.removeChildShapeByIndex(iShape);
            return;
        }

        let lastShape = this._shapes[shapesLen - 1];
        shapes.splice(iShape, 1);
        shapes[iShape] = lastShape;
        lastShape._indexInCompound = iShape;
        this._shapeObject.removeChildShapeByIndex(iShape);
    },

    _clearShapes () {
        let shapes = this._shapes;
        for (let i = shapes.length-1; i >= 0; i--) {
            let shapeComp = shapes[i];
            shapeComp._detachShape();
        }
        shapes.length = 0;
    },

    _updateScale (scale) {
        _tempBTVec3.setValue(scale.x, scale.y, scale.z);
		this._shapeObject.setLocalScaling(_tempBTVec3);
    },

    _updateSubShapeTransform (shapeComponent) {
        let offset = shapeComponent.offset;
        let rotation = shapeComponent.rotation;
        
        _tempBTVec3.setValue(offset.x, offset.y, offset.z);
        _tempBTTransform.setOrigin(_tempBTVec3);
        _tempCCQuat.fromEuler(rotation);
        _tempBTQuaternion.setValue(_tempCCQuat.x, _tempCCQuat.y, _tempCCQuat.z, _tempCCQuat.w);
		_tempBTTransform.setRotation(_tempBTQuaternion);
		this._shapeObject.updateChildTransform(shapeComponent._indexInCompound,_tempBTTransform, true);
    }
});

module.exports = cc.CompoundShape = CompoundShape;