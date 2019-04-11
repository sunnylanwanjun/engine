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

import IARenderData from '../renderer/render-data/ia-render-data';

const renderer = require('../core/renderer/');
const vfmtPosUvColor = require('../core/renderer/webgl/vertex-format').vfmtPosUvColor;

import InputAssembler from '../renderer/core/input-assembler';

const TileFlag = TiledMap.TileFlag;
const maxGridsLimit = parseInt(65535 / 4);

import { mat4 } from '../core/vmath';

let _mat4_temp = mat4.create();

let SpineBuffer = require('../core/renderer/webgl/spine-buffer');
let TiledMapBuffer = cc.Class({
    name: 'cc.TiledMapBuffer',
    extends: require('../core/renderer/webgl/quad-buffer'),

    requestStatic : SpineBuffer.requestStatic,
    adjust : SpineBuffer.adjust,
});

let RenderDataList = cc.Class({
    name: 'cc.TiledMapRenderDataList',

    ctor () {
        this._dataList = [];
        this._offset = 0;
    },

    _pushRenderData () {
        let renderData = new IARenderData();
        renderData.ia = new InputAssembler();
        this._dataList.push(renderData);
    },

    popRenderData (vb, ib, start, count) {
        if (this._offset >= this._dataList.length) {
            this._pushRenderData();
        }
        let renderData = this._dataList[this._offset];
        let ia = renderData.ia;
        ia._vertexBuffer = vb;
        ia._indexBuffer = ib;
        ia._start = start;
        ia._count = count;
        this._offset++;
        return renderData;
    },

    reset () {
        this._offset = 0;
    }
});

let tmxAssembler = {
    updateRenderData (comp) {
        if (!comp._renderDataList) {
            comp._buffer = new TiledMapBuffer(renderer._handle, vfmtPosUvColor);
            comp._renderDataList = new RenderDataList();
        }
    },

    renderIA (comp, renderer) {
        let vertices = comp._vertices;
        if (vertices.length === 0 ) return;

        let buffer = comp._buffer;
        if (comp._isClipDirty()) {
            buffer.reset();

            let clipRect = comp._clipRect;
            let leftDown = clipRect.leftDown;
            let rightTop = clipRect.rightTop;
            let maxRows = rightTop.row - leftDown.row + 1;
            let maxCols = rightTop.col - leftDown.col + 1;
            let maxGrids = maxRows * maxCols;
            if (maxGrids > maxGridsLimit) {
                maxGrids = maxGridsLimit;
            }

            buffer.request(maxGrids * 4, maxGrids * 6);

            switch (comp._layerOrientation) {
                // left top to right down
                case Orientation.ORTHO:
                    this.traverseGrids(comp, renderer, leftDown, rightTop, -1, 1);
                    break;
                // right top to left down
                case Orientation.ISO:
                    this.traverseGrids(comp, renderer, leftDown, rightTop, -1, -1);
                    break;
                // left top to right down
                case Orientation.HEX:
                    this.traverseGrids(comp, renderer, leftDown, rightTop, -1, 1);
                    break;
            }
            comp._setClipDirty(false);
        } else {
            let renderDataList = comp._renderDataList;
            let renderData = null;
            for (let i = 0; i < renderDataList._offset; i++) {
                renderData = renderDataList._dataList[i];
                renderer._flushIA(renderData);
            }
        }
    },

    // rowMoveDir is -1 or 1, -1 means decrease, 1 means increase
    // colMoveDir is -1 or 1, -1 means decrease, 1 means increase
    traverseGrids (comp, renderer, leftDown, rightTop, rowMoveDir, colMoveDir) {
        let buffer = comp._buffer;
        let vbuf = buffer._vData;
        let uintbuf = buffer._uintVData;
        let color = comp.node._color._val;
        let tiledTiles = comp._tiledTiles;
        let texIdToMatIdx = comp._texIdToMatIndex;
        let mats = comp.sharedMaterials, material = null;

        let vertices = comp._vertices;
        let rowData, col, cols, row, rows, colData, tileSize, vfOffset = 0, grid = null;
        let fillGrids = 0;
        let left = 0, bottom = 0, right = 0, top = 0; // x, y
        let tiledNode = null, curTexIdx = -1, matIdx;
        let ul, ur, vt, vb;// u, v

        let renderDataList = comp._renderDataList;
        renderDataList.reset();
        let renderData = renderDataList.popRenderData(buffer._vb, buffer._ib, 0, 0);

        if (rowMoveDir == -1) {
            row = rightTop.row;
            rows = leftDown.row;
        } else {
            row = leftDown.row;
            rows = rightTop.row;
        }

        // traverse row
        for (; ; row += rowMoveDir) {
            rowData = vertices[row];
            if (!rowData) continue;

            // limit min col and max col
            if (colMoveDir == 1) {
                col = leftDown.col < rowData.minCol ? rowData.minCol : leftDown.col;
                cols = rightTop.col > rowData.maxCol ? rowData.maxCol : rightTop.col;
            } else {
                col = rightTop.col > rowData.maxCol ? rowData.maxCol : rightTop.col;
                cols = leftDown.col < rowData.minCol ? rowData.minCol : leftDown.col;
            }
            
            // traverse col
            for (; ; col += colMoveDir) {
                colData = rowData[col];
                if (!colData) continue;
                grid = colData.grid;

                // check init or new material
                if (curTexIdx !== grid.texId) {
                    // need flush
                    if (curTexIdx !== -1 && ia._count > 0) {
                        buffer.uploadData();
                        renderer._flushIA(renderData);
                        renderData = renderDataList.popRenderData(buffer._vb, buffer._ib, buffer.indiceOffset, 0);
                    }
                    // update material
                    curTexIdx = grid.texId;
                    matIdx = texIdToMatIdx[curTexIdx];
                    material = mats[matIdx];
                    renderData.material = material;
                }
                if (!material) continue;

                // calc rect vertex
                left = colData.left;
                bottom = colData.bottom;
                tileSize = grid.tileset._tileSize;
                right = left + tileSize.width;
                top = bottom + tileSize.height;

                // begin to fill vertex buffer
                tiledNode = tiledTiles[colData.index];
                if (!tiledNode) {
                    // tl
                    vbuf[vfOffset].x = left;
                    vbuf[vfOffset+1].y = top;

                    // bl
                    vbuf[vfOffset+5].x = left;
                    vbuf[vfOffset+6].y = bottom;

                    // tr
                    vbuf[vfOffset+10].x = right;
                    vbuf[vfOffset+11].y = top;

                    // br
                    vbuf[vfOffset+15].x = right;
                    vbuf[vfOffset+16].y = bottom;
                } else {
                    this.fillByTiledNode(tiledNode, vbuf, vfOffset, left, right, top, bottom);
                }

                // calc rect uv
                ul = colData.l;
                ur = colData.r;
                vt = colData.t;
                vb = colData.b;

                // tl
                vbuf[vfOffset+2].u = ul;
                vbuf[vfOffset+3].v = vt;
                uintbuf[vfOffset+4].color = color;

                // bl
                vbuf[vfOffset+7].u = ul;
                vbuf[vfOffset+8].v = vb;
                uintbuf[vfOffset+9].color = color;

                // tr
                vbuf[vfOffset+12].u = ur;
                vbuf[vfOffset+13].v = vt;
                uintbuf[vfOffset+14].color = color;

                // br
                vbuf[vfOffset+17].u = ur;
                vbuf[vfOffset+18].v = vb;
                uintbuf[vfOffset+19].color = color;

                // modify buffer all kinds of offset
                vfOffset += 20;
                buffer.adjust(4, 6);
                ia._count += 6;
                fillGrids++;

                // vertices count exceed 66635, buffer must be switched
                if (fillGrids >= maxGridsLimit) {
                    buffer.uploadData();
                    renderer._flushIA(renderData);

                    buffer.switchBuffer();
                    renderData = renderDataList.popRenderData(buffer._vb, buffer._ib, 0, 0);
                    vfOffset = 0;
                    fillGrids = 0;
                }
                // end
                if (col == cols) break;
            }
            // end
            if (row == rows) break;
        }

        // last flush
        if (ia._count > 0) {
            buffer.uploadData();
            renderer._flushIA(renderData);
        }
    },

    fillByTiledNode (tiledNode, vbuf, vfOffset, left, right, top, bottom) {
        tiledNode._updateLocalMatrix();
        mat4.copy(_mat4_temp, tiledNode._matrix);
        let a = _mat4_temp.m00;
        let b = _mat4_temp.m01;
        let c = _mat4_temp.m04;
        let d = _mat4_temp.m05;
        let tx = _mat4_temp.m12;
        let ty = _mat4_temp.m13;

        // tl
        vbuf[vfOffset].x = left * a + top * c + tx;
        vbuf[vfOffset+1].y = left * b + top * d + ty;

        // bl
        vbuf[vfOffset+5].x = left * a + bottom * c + tx;
        vbuf[vfOffset+6].y = left * b + bottom * d + ty;

        // tr
        vbuf[vfOffset+10].x = right * a + top * c + tx;
        vbuf[vfOffset+11].y = right * b + top * d + ty;

        // br
        vbuf[vfOffset+15].x = right * a + bottom * c + tx;
        vbuf[vfOffset+16].y = right * b + bottom * d + ty;
    }
};

module.exports = TiledLayer._assembler = tmxAssembler;
