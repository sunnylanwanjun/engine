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
const TileFlag = TiledMap.TileFlag;
const FLIPPED_MASK = TileFlag.FLIPPED_MASK;

import IARenderData from '../renderer/render-data/ia-render-data';

const renderer = require('../core/renderer/');
const vfmtPosUvColor = require('../core/renderer/webgl/vertex-format').vfmtPosUvColor;

import InputAssembler from '../renderer/core/input-assembler';

const Orientation = TiledMap.Orientation;
const maxGridsLimit = parseInt(65535 / 4);

import { mat4, vec3 } from '../core/vmath';

const RenderFlow = require('../core/renderer/render-flow');

let _mat4_temp = mat4.create();
let _vec3_temp = vec3.create();
let _leftDown = {row:0, col:0};
let _tempUV = {r:0, l:0, t:0, b:0};

let SpineBuffer = require('../core/renderer/webgl/spine-buffer');
let TiledMapBuffer = cc.Class({
    name: 'cc.TiledMapBuffer',
    extends: require('../core/renderer/webgl/quad-buffer'),

    requestStatic : SpineBuffer.prototype.requestStatic,
    adjust : SpineBuffer.prototype.adjust,
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
        renderData.nodesRenderList = [];
        this._dataList.push(renderData);
    },

    popRenderData (vb, ib, start, count) {
        if (this._offset >= this._dataList.length) {
            this._pushRenderData();
        }
        let renderData = this._dataList[this._offset];
        renderData.nodesRenderList.length = 0;
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
        //if (comp._isClipDirty() || comp._isUserNodeDirty()) {
            buffer.reset();

            let leftDown, rightTop;
            if (comp._enableClip) {
               let clipRect = comp._clipRect;
               leftDown = clipRect.leftDown;
               rightTop = clipRect.rightTop;
            } else {
                leftDown = _leftDown;
                rightTop = comp._rightTop;
            }

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
            comp._setUserNodeDirty(false);
        // } else {
        //     let renderDataList = comp._renderDataList;
        //     let renderData = null;
        //     let nodesRenderList = null;
        //     let nodesList = null;
        //     for (let i = 0; i < renderDataList._offset; i++) {
        //         renderData = renderDataList._dataList[i];
        //         if (renderData.ia._count > 0) {
        //             renderer._flushIA(renderData);
        //         }
        //         nodesRenderList = renderData.nodesRenderList;
        //         for (let j = 0; j < nodesRenderList.length; j++) {
        //             nodesList = nodesRenderList[j];
        //             if (!nodesList) continue;
        //             for (let idx = 0; idx < nodesList.length; idx++) {
        //                 node = nodesList[idx];
        //                 if (!node) continue;
        //                 RenderFlow.visitRootNode(node);
        //             }
        //         }
        //     }
        // }
    },

    // rowMoveDir is -1 or 1, -1 means decrease, 1 means increase
    // colMoveDir is -1 or 1, -1 means decrease, 1 means increase
    traverseGrids (comp, renderer, leftDown, rightTop, rowMoveDir, colMoveDir) {
        let buffer = comp._buffer;
        let vbuf = buffer._vData;
        let uintbuf = buffer._uintVData;
        let layerNode = comp.node;
        let color = layerNode._color._val;
        let tiledTiles = comp._tiledTiles;
        let texGrids = comp._texGrids;
        let tiles = comp._tiles;
        let texIdToMatIdx = comp._texIdToMatIndex;
        let mats = comp.sharedMaterials, material = null;
        let anchorX = layerNode.anchorX;
        let anchorY = layerNode.anchorY;
        let moveX = -layerNode.width * anchorX;
        let moveY = -layerNode.height * anchorY;

        let vertices = comp._vertices;
        let rowData, col, cols, row, rows, colData, tileSize,
            vfOffset = 0, grid = null, gid = 0;
        let fillGrids = 0;
        let left = 0, bottom = 0, right = 0, top = 0; // x, y
        let tiledNode = null, curTexIdx = -1, matIdx;
        let ul, ur, vt, vb;// u, v

        let renderDataList = comp._renderDataList;
        renderDataList.reset();
        let renderData = renderDataList.popRenderData(buffer._vb, buffer._ib, 0, 0);
        let ia = renderData.ia;
        let colNodesCount = 0, checkColRange = true;

        let flush = function () {
            if (ia._count === 0) {
                return;
            }

            buffer.uploadData();
            renderer._flushIA(renderData);

            let needSwitchBuffer = fillGrids >= maxGridsLimit;
            if (needSwitchBuffer) {
                buffer.switchBuffer();
                renderData = renderDataList.popRenderData(buffer._vb, buffer._ib, 0, 0);
                ia = renderData.ia;
                vfOffset = 0;
                fillGrids = 0;
            } else {
                renderData = renderDataList.popRenderData(buffer._vb, buffer._ib, buffer.indiceOffset, 0);
                ia = renderData.ia;
            }
        }

        let renderNodes = function (nodeRow, nodeCol) {
            let nodesInfo = comp._getNodesByRowCol(nodeRow, nodeCol);
            if (!nodesInfo || nodesInfo.count == 0) return;
            let nodesList = nodesInfo.list;
            let newIdx = 0, oldIdx = 0;
            renderData.nodesRenderList.push(nodesList);
            flush();
            for (; newIdx < nodesInfo.count; ) {
                node = nodesList[oldIdx];
                oldIdx++;
                if (!node) continue;
                RenderFlow.visitRootNode(node);
                if (newIdx !== oldIdx) {
                    nodesList[newIdx] = node;
                    node._index_ = newIdx;
                }
                newIdx++;
            }
            nodesList.length = newIdx;
        }

        if (rowMoveDir == -1) {
            row = rightTop.row;
            rows = leftDown.row;
        } else {
            row = leftDown.row;
            rows = rightTop.row;
        }

        rows += rowMoveDir;
        // traverse row
        for (; row != rows; row += rowMoveDir) {
            rowData = vertices[row];
            colNodesCount = comp._getNodesCountByRow(row);
            checkColRange = (colNodesCount == 0 && rowData != undefined);

            // limit min col and max col
            if (colMoveDir == 1) {
                col = checkColRange && leftDown.col < rowData.minCol ? rowData.minCol : leftDown.col;
                cols = checkColRange && rightTop.col > rowData.maxCol ? rowData.maxCol : rightTop.col;
            } else {
                col = checkColRange && rightTop.col > rowData.maxCol ? rowData.maxCol : rightTop.col;
                cols = checkColRange && leftDown.col < rowData.minCol ? rowData.minCol : leftDown.col;
            }

            cols += colMoveDir;
            // traverse col
            for (; col != cols; col += colMoveDir) {
                colData = rowData && rowData[col];
                if (!colData) {
                    // only render users nodes because map data is empty
                    if (colNodesCount > 0) renderNodes(row, col);
                    continue;
                }

                gid = tiles[colData.index];
                grid = texGrids[(gid & FLIPPED_MASK) >>> 0];
                
                // check init or new material
                if (curTexIdx !== grid.texId) {
                    // need flush
                    if (curTexIdx !== -1) {
                        flush();
                    }
                    // update material
                    curTexIdx = grid.texId;
                    matIdx = texIdToMatIdx[curTexIdx];
                    material = mats[matIdx];
                    renderData.material = material;
                }
                if (!material) continue;

                // calc rect vertex
                left = colData.left + moveX;
                bottom = colData.bottom + moveY;
                tileSize = grid.tileset._tileSize;
                right = left + tileSize.width;
                top = bottom + tileSize.height;

                // begin to fill vertex buffer
                tiledNode = tiledTiles[colData.index];
                if (!tiledNode) {
                    // tl
                    vbuf[vfOffset] = left;
                    vbuf[vfOffset + 1] = top;
                    uintbuf[vfOffset + 4] = color;

                    // bl
                    vbuf[vfOffset + 5] = left;
                    vbuf[vfOffset + 6] = bottom;
                    uintbuf[vfOffset + 9] = color;

                    // tr
                    vbuf[vfOffset + 10] = right;
                    vbuf[vfOffset + 11] = top;
                    uintbuf[vfOffset + 14] = color;

                    // br
                    vbuf[vfOffset + 15] = right;
                    vbuf[vfOffset + 16] = bottom;
                    uintbuf[vfOffset + 19] = color;
                } else {
                    this.fillByTiledNode(tiledNode.node, layerNode, vbuf, uintbuf, vfOffset, left, right, top, bottom);
                }

                TiledMap.flipTexture(_tempUV, grid, gid);
                // calc rect uv
                ul = _tempUV.l;
                ur = _tempUV.r;
                vt = _tempUV.t;
                vb = _tempUV.b;

                // tl
                vbuf[vfOffset + 2] = ul;
                vbuf[vfOffset + 3] = vt;

                // bl
                vbuf[vfOffset + 7] = ul;
                vbuf[vfOffset + 8] = vb;

                // tr
                vbuf[vfOffset + 12] = ur;
                vbuf[vfOffset + 13] = vt;

                // br
                vbuf[vfOffset + 17] = ur;
                vbuf[vfOffset + 18] = vb;

                // modify buffer all kinds of offset
                vfOffset += 20;
                buffer.adjust(4, 6);
                ia._count += 6;
                fillGrids++;

                // check render users node
                if (colNodesCount > 0) renderNodes(row, col);

                // vertices count exceed 66635, buffer must be switched
                if (fillGrids >= maxGridsLimit) {
                    flush();
                }
            }
        }

        // last flush
        if (ia._count > 0) {
            buffer.uploadData();
            renderer._flushIA(renderData);
        }
    },

    fillByTiledNode (tiledNode, layerNode, vbuf, uintbuf, vfOffset, left, right, top, bottom) {
        tiledNode._updateLocalMatrix();
        mat4.copy(_mat4_temp, tiledNode._matrix);
        vec3.set(_vec3_temp, -left, -bottom, 0);
        mat4.translate(_mat4_temp, _mat4_temp, _vec3_temp);
        mat4.mul(_mat4_temp, layerNode._worldMatrix, _mat4_temp);
        let a = _mat4_temp.m00;
        let b = _mat4_temp.m01;
        let c = _mat4_temp.m04;
        let d = _mat4_temp.m05;
        let tx = _mat4_temp.m12;
        let ty = _mat4_temp.m13;
        let color = tiledNode._color._val;

        // tl
        vbuf[vfOffset] = left * a + top * c + tx;
        vbuf[vfOffset + 1] = left * b + top * d + ty;
        uintbuf[vfOffset + 4] = color;

        // bl
        vbuf[vfOffset + 5] = left * a + bottom * c + tx;
        vbuf[vfOffset + 6] = left * b + bottom * d + ty;
        uintbuf[vfOffset + 9] = color;

        // tr
        vbuf[vfOffset + 10] = right * a + top * c + tx;
        vbuf[vfOffset + 11] = right * b + top * d + ty;
        uintbuf[vfOffset + 14] = color;

        // br
        vbuf[vfOffset + 15] = right * a + bottom * c + tx;
        vbuf[vfOffset + 16] = right * b + bottom * d + ty;
        uintbuf[vfOffset + 19] = color;
    }
};

module.exports = TiledLayer._assembler = tmxAssembler;
