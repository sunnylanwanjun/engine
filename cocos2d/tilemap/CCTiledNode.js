/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.
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
const TiledBase = require('./CCTiledBase');

/**
 * !#en Render the TMX layer by node.
 * !#zh 使用节点渲染 TMX layer。
 * @class TiledNode
 * @extends Component
 */
let TiledNode = cc.Class({
    name: 'cc.TiledNode',

    mixins: [TiledBase],
    extends: cc.Component,

    ctor () {
        this._pool = [];
        this._using = [];
    },

    _clearNode () {
        for (let i = 0; i < this._using.length; i++) {
            let node = this._using[i];
            node.x = -9999999;
            node.y = -9999999;
            this._pool.push(node);
        }
        this._using.length = 0;
    },

    _updateNode () {
        this._clearNode();
        let tiles = this._tiles;
        let texGrids = this._texGrids;
        for (let i = 0, n = tiles.length; i < n; i ++) {
            let gid = tiles[i];
            let grid = texGrids[gid];
            if (!grid) continue;
            let node = this._pool.pop();
            if (!node) {
                node = new cc.PrivateNode();
                node.parent = this.node;
            }
            let sprite = node.getComponent(cc.Sprite);
            if (!sprite) {
                sprite = node.addComponent(cc.Sprite);
            }
            let spFrame = sprite.spriteFrame;
            if (!spFrame) {
                spFrame = sprite.spriteFrame = new cc.SpriteFrame;
            }
            let tex = this._textures[grid.texId];
            spFrame.setTexture(tex, grid);
            node.setContentSize(grid.width, grid.height);
            // to set position
            this._using.push(node);
        }
    },

    /**
     * !#en Set the texture.
     * !#zh 设置纹理。
     * @method setTexture
     * @param {Texture2D} textures
     */
    setTextures (textures){
        this._textures = textures;
        this._updateNode();
    },

    // override
    _prepareToRender () {
        this._updateNode();
    },

    _init (layerInfo, mapInfo, tilesets, textures, texGrids) {
        this._initBase(layerInfo, mapInfo, tilesets, textures, texGrids);
        this._prepareToRender();
    },
});

cc.TiledNode = module.exports = TiledNode;
