/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

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

const TiledLayer = require('./CCTiledLayer');
const TiledMap = require('./CCTiledMap');

const RenderFlow = require('../core/renderer/render-flow');

import IARenderData from '../renderer/render-data/ia-render-data';

const renderer = require('../core/renderer/');
const vfmtPosUvColor = require('../core/renderer/webgl/vertex-format').vfmtPosUvColor;
const QuadBuffer = require('../core/renderer/webgl/quad-buffer');

import InputAssembler from '../renderer/core/input-assembler';

const TileFlag = TiledMap.TileFlag;
const FLIPPED_MASK = TileFlag.FLIPPED_MASK;

// import { mat4, vec3 } from '../core/vmath';

// let _mat4_temp = mat4.create();
// let _mat4_temp2 = mat4.create();
// let _vec3_temp = vec3.create();

let tmxAssembler = {
    updateRenderData (comp) {
        if (!comp._ia) {
            comp._buffer = new QuadBuffer(renderer._handle, vfmtPosUvColor);
            comp._ia = new InputAssembler();
            comp._ia._vertexBuffer = comp._buffer._vb;
            comp._ia._indexBuffer = comp._buffer._ib;
            comp._ia._start = 0;
            comp._ia._count = 0;

            comp._renderData = new IARenderData();
            comp._renderData.ia = comp._ia;
        }
        
        comp._renderData.material = comp.sharedMaterials[0];
    },

    renderIA (comp, renderer) {

        let buffer = comp._buffer;
        

        renderer._flushIA(comp._renderData);
    }
};

module.exports = TiledLayer._assembler = tmxAssembler;
