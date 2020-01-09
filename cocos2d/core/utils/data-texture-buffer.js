/****************************************************************************
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

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

const BLOCK_WIDTH = 400;
const BLOCK_HEIGHT = 400;

function DataTextureBuffer (dataType, blockWidth, blockHeight, pixelFormat) {
    this._textures = [];
    this._blocks = [];
    this._blockIdx = 0;
    this._contentOffset = 0;
    this._dataType = dataType || Float32Array;
    this._blockWidth = blockWidth || BLOCK_WIDTH;
    this._blockHeight = blockHeight || BLOCK_HEIGHT;
    this._pixelFormat = pixelFormat || cc.Texture2D.PixelFormat.RGBA32F;
    this._totalSize = blockWidth * blockHeight;
}

let _proto = DataTextureBuffer.prototype;
let _writeResult = {
    offset: 0,
    texture: null,
};

_proto.write = function (data) {
    let contentOffset = this._contentOffset;
    let blockIdx = this._blockIdx;

    let block = this._blocks[blockIdx];
    if (!block) {
        block = new this._dataType(this._totalSize);
        this._blocks[blockIdx] = block;

        const NEAREST = cc.Texture2D.Filter.NEAREST;
        let texture = new cc.Texture2D();
        texture.setFilters(NEAREST, NEAREST);
        this._textures[blockIdx] = texture;
    }

    block.set(data, contentOffset);
    _writeResult.offset = contentOffset;
    _writeResult.texture = this._textures[blockIdx];

    this._contentOffset += data.length;
    if (this._contentOffset >= this._totalSize) {
        this._contentOffset = 0;
        this._blockIdx++;
    }
    return _writeResult;
};

_proto.uploadData = function () {
    let blocks = this._blocks;
    let contentOffset = this._contentOffset;
    let blockIdx = this._blockIdx;
    let textures = this._textures;
    let pixelFormat = this._pixelFormat;
    let blockWidth = this._blockWidth;
    let blockHeight = this._blockHeight;
    
    for (let bIdx = 0; bIdx <= blockIdx; bIdx++) {
        // data is empty, no need to upload
        if (bIdx === blockIdx && contentOffset === 0) {
            break;
        }
        let block = blocks[bIdx];
        let texture = textures[bIdx];
        texture.initWithData(block, pixelFormat, blockWidth, blockHeight);
    }
};

_proto.reset = function () {
    this._blockIdx = 0;
    this._contentOffset = 0;
};

_proto.destroy = function () {
    let textures = this._textures;
    for (let i = 0, n = textures.length; i < n; i++) {
        let tex = textures[i];
        if (tex) tex.destroy();
    }
    textures.length = 0;
    this.reset();
};

module.exports = DataTextureBuffer;