/****************************************************************************
 Copyright (c) 2019 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

import { Sphere } from '../../../../geom-utils';
import { BuiltinShape } from './builtin-shape';
import { ISphereShape } from '../../spec/i-collider-shape';
import { SphereColliderComponent } from '../../exports/collider-framework';
import { Vec3 } from '../../../../value-types';

let _worldScale = new Vec3();

export class BuiltinSphereShape extends BuiltinShape implements ISphereShape {

    set radius (radius: number) {
        this.localSphere.radius = radius;
        this.collider.node.getWorldScale(_worldScale);
        const s = _worldScale.maxAxis();
        this.worldSphere.radius = this.localSphere.radius * s;
    }

    get localSphere () {
        return this._localShape as Sphere;
    }

    get worldSphere () {
        return this._worldShape as Sphere;
    }

    get sphereCollider () {
        return this.collider as SphereColliderComponent;
    }

    constructor (radius: number) {
        super();
        this._localShape = new Sphere(0, 0, 0, radius);
        this._worldShape = new Sphere(0, 0, 0, radius);
    }

    onLoad () {
        super.onLoad();
        this.radius = this.sphereCollider.radius;
    }

}
