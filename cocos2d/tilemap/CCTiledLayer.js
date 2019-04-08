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
const RenderComponent = require('../core/components/CCRenderComponent');
const Material = require('../core/assets/material/CCMaterial');
const TiledBase = require('./CCTiledBase');

/**
 * !#en Render the TMX layer.
 * !#zh 渲染 TMX layer。
 * @class TiledLayer
 * @extends Component
 */
let TiledLayer = cc.Class({
    name: 'cc.TiledLayer',

    mixins: [TiledBase],

    // Inherits from the abstract class directly,
    // because TiledLayer not create or maintains the sgNode by itself.
    extends: RenderComponent,

    editor: {
        inspector: 'packages://inspector/inspectors/comps/tiled-layer.js',
    },

    ctor () {
        // store the layer tiles node, index is caculated by 'x + width * y', format likes '[0]=tileNode0,[1]=tileNode1, ...'
        this._tiledTiles = [];

        // store the layer tilesets index array
        this._tilesetIndexArr = [];
        // texture id to material index
        this._texIdToMatIndex = {};
    },

    /**
     * !#en
     * Get the TiledTile with the tile coordinate.<br/>
     * If there is no tile in the specified coordinate and forceCreate parameter is true, <br/>
     * then will create a new TiledTile at the coordinate.
     * The renderer will render the tile with the rotation, scale, position and color property of the TiledTile.
     * !#zh
     * 通过指定的 tile 坐标获取对应的 TiledTile。 <br/>
     * 如果指定的坐标没有 tile，并且设置了 forceCreate 那么将会在指定的坐标创建一个新的 TiledTile 。<br/>
     * 在渲染这个 tile 的时候，将会使用 TiledTile 的节点的旋转、缩放、位移、颜色属性。<br/>
     * @method getTiledTileAt
     * @param {Integer} x
     * @param {Integer} y
     * @param {Boolean} forceCreate
     * @return {cc.TiledTile}
     * @example
     * let tile = tiledLayer.getTiledTileAt(100, 100, true);
     * cc.log(tile);
     */
    getTiledTileAt (x, y, forceCreate) {
        if (this._isInvalidPosition(x, y)) {
            throw new Error("TiledLayer.getTiledTileAt: invalid position");
        }
        if (!this._tiles) {
            cc.logID(7236);
            return null;
        }

        let index = Math.floor(x) + Math.floor(y) * this._layerSize.width;
        let tile = this._tiledTiles[index];
        if (!tile && forceCreate) {
            let node = new cc.Node();
            tile = node.addComponent(cc.TiledTile);
            tile._x = x;
            tile._y = y;
            tile._layer = this;
            tile._updateInfo();
            node.parent = this.node;
            return tile;
        }
        return tile;
    },

    /** 
     * !#en
     * Change tile to TiledTile at the specified coordinate.
     * !#zh
     * 将指定的 tile 坐标替换为指定的 TiledTile。
     * @method setTiledTileAt
     * @param {Integer} x
     * @param {Integer} y
     * @param {cc.TiledTile} tiledTile
     * @return {cc.TiledTile}
     */
    setTiledTileAt (x, y, tiledTile) {
        if (this._isInvalidPosition(x, y)) {
            throw new Error("TiledLayer.setTiledTileAt: invalid position");
        }
        if (!this._tiles) {
            cc.logID(7236);
            return null;
        }

        let index = Math.floor(x) + Math.floor(y) * this._layerSize.width;
        return this._tiledTiles[index] = tiledTile;
    },

    /**
     * !#en Set the texture.
     * !#zh 设置纹理。
     * @method setTexture
     * @param {Texture2D} textures
     */
    setTextures (textures){
        this._textures = textures;
        this._activateMaterial();
    },

    // override
    _prepareToRender () {
        this._traverseAllGrid();
        this._activateMaterial();
    },

    _traverseAllGrid () {
        let tiles = this._tiles;
        let texGrids = this._texGrids;
        let tilesetIndexArr = this._tilesetIndexArr;
        let tilesetIdxMap = {};

        tilesetIndexArr.length = 0;
        for (let i = 0; i < tiles.length; i++) {
            let gid = tiles[i];
            if (gid === 0) continue;
            let tilesetIdx = texGrids[gid].texId;
            if (tilesetIdxMap[tilesetIdx]) continue;
            tilesetIdxMap[tilesetIdx] = true;
            tilesetIndexArr.push(tilesetIdx);
        }
    },

    _init (layerInfo, mapInfo, tilesets, textures, texGrids) {
        this._initBase(layerInfo, mapInfo, tilesets, textures, texGrids);
        this._prepareToRender();
    },

    onEnable () {
        this._super();
        this._activateMaterial();
    },

    onDestroy () {
        this._super();
        if (this._buffer) {
            this._buffer.destroy();
            this._buffer = null;
        }
    },

    _activateMaterial () {
        let tilesetIndexArr = this._tilesetIndexArr;
        if (tilesetIndexArr.length === 0) {
            this.disableRender();
            return;
        }

        let texIdMatIdx = this._texIdToMatIndex = {};
        let textures = this._textures;

        for (let i = 0; i < tilesetIndexArr.length; i++) {
            let tilesetIdx = tilesetIndexArr[i];
            let texture = textures[tilesetIdx];

            let material = this.sharedMaterials[i];
            if (!material) {
                material = Material.getInstantiatedBuiltinMaterial('sprite', this);
                material.define('USE_TEXTURE', true);
            }
            else {
                material = Material.getInstantiatedMaterial(material, this);
            }

            material.setProperty('texture', texture);
            this.sharedMaterials[i] = material;

            texIdMatIdx[tilesetIdx] = i;
        }

        this.markForUpdateRenderData(true);
        this.markForRender(false);
        this.markForCustomIARender(true);
    },
});

cc.TiledLayer = module.exports = TiledLayer;
