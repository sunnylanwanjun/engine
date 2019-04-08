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
/**
 * !#en Render the TMX layer.
 * !#zh 渲染 TMX layer。
 * @class TiledLayer
 * @extends Component
 */
let TiledBase = cc.Class({
    name: 'cc.TiledBase',

    ctor () {
        // render range
        this._range = {x:0, y:0, width:0, height:0};

        this._rangeDirty = true;

        // store the layer tiles, index is caculated by 'x + width * y', format likes '[0]=gid0,[1]=gid1, ...'
        this._tiles = [];
        // vertex array
        this._vertices = [];

        this._layerName = '';
        this._layerOrientation = null;
        // store all layer gid corresponding texture info, index is gid, format likes '[gid0]=tex-info,[gid1]=tex-info, ...'
        this._texGrids = null;
        // store all tileset texture, index is tileset index, format likes '[0]=texture0, [1]=texture1, ...'
        this._textures = null;
        this._tilesets = null;

        // use to debug layer clip range
        this._clipNode = null;
    },

    /**
     * !#en Gets the layer name.
     * !#zh 获取层的名称。
     * @method getLayerName
     * @return {String}
     * @example
     * let layerName = tiledLayer.getLayerName();
     * cc.log(layerName);
     */
    getLayerName () {
        return this._layerName;
    },

    /**
     * !#en Set the layer name.
     * !#zh 设置层的名称
     * @method SetLayerName
     * @param {String} layerName
     * @example
     * tiledLayer.setLayerName("New Layer");
     */
    setLayerName (layerName) {
        this._layerName = layerName;
    },

    /**
     * !#en Return the value for the specific property name.
     * !#zh 获取指定属性名的值。
     * @method getProperty
     * @param {String} propertyName
     * @return {*}
     * @example
     * let property = tiledLayer.getProperty("info");
     * cc.log(property);
     */
    getProperty (propertyName) {
        return this._properties[propertyName];
    },

    /**
     * !#en Returns the position in pixels of a given tile coordinate.
     * !#zh 获取指定 tile 的像素坐标。
     * @method getPositionAt
     * @param {Vec2|Number} pos position or x
     * @param {Number} [y]
     * @return {Vec2}
     * @example
     * let pos = tiledLayer.getPositionAt(cc.v2(0, 0));
     * cc.log("Pos: " + pos);
     * let pos = tiledLayer.getPositionAt(0, 0);
     * cc.log("Pos: " + pos);
     */
    getPositionAt (pos, y) {
        let x;
        if (y !== undefined) {
            x = Math.floor(pos);
            y = Math.floor(y);
        }
        else {
            x = Math.floor(pos.x);
            y = Math.floor(pos.y);
        }
        
        let ret;
        switch (this._layerOrientation) {
            case cc.TiledMap.Orientation.ORTHO:
                ret = this._positionForOrthoAt(x, y);
                break;
            case cc.TiledMap.Orientation.ISO:
                ret = this._positionForIsoAt(x, y);
                break;
            case cc.TiledMap.Orientation.HEX:
                ret = this._positionForHexAt(x, y);
                break;
        }
        return ret;
    },

    _isInvalidPosition (x, y) {
        if (x && typeof x === 'object') {
            let pos = x;
            y = pos.y;
            x = pos.x;
        }
        return x >= this._layerSize.width || y >= this._layerSize.height || x < 0 || y < 0;
    },

    _positionForIsoAt (x, y) {
        return cc.v2(
            this._mapTileSize.width / 2 * ( this._layerSize.width + x - y - 1),
            this._mapTileSize.height / 2 * (( this._layerSize.height * 2 - x - y) - 2)
        );
    },

    _positionForOrthoAt (x, y) {
        return cc.v2(
            x * this._mapTileSize.width,
            (this._layerSize.height - y - 1) * this._mapTileSize.height
        );
    },

    _positionForHexAt (col, row) {
        let tileWidth = this._mapTileSize.width;
        let tileHeight = this._mapTileSize.height;
        let rows = this._layerSize.height;

        let index = Math.floor(col) + Math.floor(row) * this._layerSize.width;
        let gid = this._tiles[index];
        let tileset = this._texGrids[gid].tileset;
        let offset = tileset.tileOffset;

        let centerWidth = this.node.width / 2;
        let centerHeight = this.node.height / 2;
        let odd_even = (this._staggerIndex === cc.TiledMap.StaggerIndex.STAGGERINDEX_ODD) ? 1 : -1;
        let x = 0, y = 0;
        let diffX = 0;
        let diffX1 = 0;
        let diffY = 0;
        let diffY1 = 0;
        switch (this._staggerAxis) {
            case cc.TiledMap.StaggerAxis.STAGGERAXIS_Y:
                diffX = 0;
                diffX1 = (this._staggerIndex === cc.TiledMap.StaggerIndex.STAGGERINDEX_ODD) ? 0 : tileWidth / 2;
                if (row % 2 === 1) {
                    diffX = tileWidth / 2 * odd_even;
                }
                x = col * tileWidth + diffX + diffX1 + offset.x - centerWidth;
                y = (rows - row - 1) * (tileHeight - (tileHeight - this._hexSideLength) / 2) - offset.y - centerHeight;
                break;
            case cc.TiledMap.StaggerAxis.STAGGERAXIS_X:
                diffY = 0;
                diffY1 = (this._staggerIndex === cc.TiledMap.StaggerIndex.STAGGERINDEX_ODD) ? tileHeight / 2 : 0;
                if (col % 2 === 1) {
                    diffY = tileHeight / 2 * -odd_even;
                }
                x = col * (tileWidth - (tileWidth - this._hexSideLength) / 2) + offset.x - centerWidth;
                y = (rows - row - 1) * tileHeight + diffY + diffY1 - offset.y - centerHeight;
                break;
        }
        return cc.v2(x, y);
    },

    /**
     * !#en
     * Sets the tile gid (gid = tile global id) at a given tile coordinate.<br />
     * The Tile GID can be obtained by using the method "tileGIDAt" or by using the TMX editor . Tileset Mgr +1.<br />
     * If a tile is already placed at that position, then it will be removed.
     * !#zh
     * 设置给定坐标的 tile 的 gid (gid = tile 全局 id)，
     * tile 的 GID 可以使用方法 “tileGIDAt” 来获得。<br />
     * 如果一个 tile 已经放在那个位置，那么它将被删除。
     * @method setTileGIDAt
     * @param {Number} gid
     * @param {Vec2|Number} posOrX position or x
     * @param {Number} flagsOrY flags or y
     * @param {Number} [flags]
     * @example
     * tiledLayer.setTileGIDAt(1001, 10, 10, 1)
     */
    setTileGIDAt (gid, posOrX, flagsOrY, flags) {
        if (posOrX === undefined) {
            throw new Error("cc.TiledLayer.setTileGIDAt(): pos should be non-null");
        }
        let pos;
        if (flags !== undefined || !(posOrX instanceof cc.Vec2)) {
            // four parameters or posOrX is not a Vec2 object
            pos = cc.v2(posOrX, flagsOrY);
        } else {
            pos = posOrX;
            flags = flagsOrY;
        }

        pos.x = Math.floor(pos.x);
        pos.y = Math.floor(pos.y);
        if (this._isInvalidPosition(pos)) {
            throw new Error("cc.TiledLayer.setTileGIDAt(): invalid position");
        }
        if (!this._tiles || !this._tilesets || this._tilesets.length == 0) {
            cc.logID(7238);
            return;
        }
        if (gid !== 0 && gid < this._tilesets[0].firstGid) {
            cc.logID(7239, gid);
            return;
        }

        flags = flags || 0;
        let currentFlags = this.getTileFlagsAt(pos);
        let currentGID = this.getTileGIDAt(pos);

        if (currentGID === gid && currentFlags === flags) return;

        let gidAndFlags = (gid | flags) >>> 0;
        this._updateTileForGID(gidAndFlags, pos);
    },

    _updateTileForGID (gid, pos) {
        if (gid !== 0 && !this._texGrids[gid]) {
            return;
        }

        let idx = 0 | (pos.x + pos.y * this._layerSize.width);
        if (idx < this._tiles.length) {
            this._tiles[idx] = gid;
        }
    },

    /**
     * !#en
     * Returns the tile gid at a given tile coordinate. <br />
     * if it returns 0, it means that the tile is empty. <br />
     * !#zh
     * 通过给定的 tile 坐标、flags（可选）返回 tile 的 GID. <br />
     * 如果它返回 0，则表示该 tile 为空。<br />
     * @method getTileGIDAt
     * @param {Vec2|Number} pos or x
     * @param {Number} [y]
     * @return {Number}
     * @example
     * let tileGid = tiledLayer.getTileGIDAt(0, 0);
     */
    getTileGIDAt (pos, y) {
        if (pos === undefined) {
            throw new Error("cc.TiledLayer.getTileGIDAt(): pos should be non-null");
        }
        let x = pos;
        if (y === undefined) {
            x = pos.x;
            y = pos.y;
        }
        if (this._isInvalidPosition(x, y)) {
            throw new Error("cc.TiledLayer.getTileGIDAt(): invalid position");
        }
        if (!this._tiles) {
            cc.logID(7237);
            return null;
        }

        let index = Math.floor(x) + Math.floor(y) * this._layerSize.width;
        // Bits on the far end of the 32-bit global tile ID are used for tile flags
        let tile = this._tiles[index];

        return (tile & cc.TiledMap.TileFlag.FLIPPED_MASK) >>> 0;
    },

    getTileFlagsAt (pos, y) {
        if (!pos) {
            throw new Error("TiledLayer.getTileFlagsAt: pos should be non-null");
        }
        if (y !== undefined) {
            pos = cc.v2(pos, y);
        }
        if (this._isInvalidPosition(pos)) {
            throw new Error("TiledLayer.getTileFlagsAt: invalid position");
        }
        if (!this._tiles) {
            cc.logID(7240);
            return null;
        }

        let idx = Math.floor(pos.x) + Math.floor(pos.y) * this._layerSize.width;
        // Bits on the far end of the 32-bit global tile ID are used for tile flags
        let tile = this._tiles[idx];

        return (tile & cc.TiledMap.TileFlag.FLIPPED_ALL) >>> 0;
    },

    /**
     * !#en Return texture.
     * !#zh 获取纹理。
     * @method getTexture
     * @return {Texture2D}
     */
    getTexture () {
        if (this._textures && this._textures.length > 0) {
            return this._textures[0];
        }
        return null;
    },

    /**
     * !#en Return texture.
     * !#zh 获取纹理。
     * @method getTextures
     * @return {Texture2D}
     */
    getTextures () {
        return this._textures;
    },

    /**
     * !#en Set the texture.
     * !#zh 设置纹理。
     * @method setTexture
     * @param {Texture2D} texture
     */
    setTexture (texture){
        this.setTextures([texture]);
    },

    /**
     * !#en Set the texture.
     * !#zh 设置纹理。
     * @method setTexture
     * @param {Texture2D} textures
     */
    setTextures (textures){
        this._textures = textures;
    },

    /**
     * !#en Gets layer size.
     * !#zh 获得层大小。
     * @method getLayerSize
     * @return {Size}
     * @example
     * let size = tiledLayer.getLayerSize();
     * cc.log("layer size: " + size);
     */
    getLayerSize () {
        return this._layerSize;
    },

    /**
     * !#en Size of the map's tile (could be different from the tile's size).
     * !#zh 获取 tile 的大小( tile 的大小可能会有所不同)。
     * @method getMapTileSize
     * @return {Size}
     * @example
     * let mapTileSize = tiledLayer.getMapTileSize();
     * cc.log("MapTile size: " + mapTileSize);
     */
    getMapTileSize () {
        return this._mapTileSize;
    },

    /**
     * !#en Gets Tile set first information for the layer.
     * !#zh 获取 layer 索引位置为0的 Tileset 信息。
     * @method getTileSet
     * @return {TMXTilesetInfo}
     */
    getTileSet () {
        if (this._tilesets && this._tilesets.length > 0) {
            return this._tilesets[0];
        }
        return null;
    },

    /**
     * !#en Gets tile set all information for the layer.
     * !#zh 获取 layer 所有的 Tileset 信息。
     * @method getTileSet
     * @return {TMXTilesetInfo}
     */
    getTileSets () {
        return this._tilesets;
    },

    /**
     * !#en Sets tile set information for the layer.
     * !#zh 设置 layer 的 tileset 信息。
     * @method setTileSet
     * @param {TMXTilesetInfo} tileset
     */
    setTileSet (tileset) {
        this.setTileSets([tileset]);
    },

    /**
     * !#en Sets Tile set information for the layer.
     * !#zh 设置 layer 的 Tileset 信息。
     * @method setTileSets
     * @param {TMXTilesetInfo} tilesets
     */
    setTileSets (tilesets) {
        this._tilesets = tilesets;
        let textures = this._textures = [];
        let texGrids = this._texGrids = [];
        for (let i = 0; i < tilesets.length; i++) {
            let tileset = tilesets[i];
            if (tileset) {
                textures[i] = tileset.sourceImage;
            }
        }

        cc.TiledMap.loadAllTextures (textures, function () {
            for (let i = 0, l = tilesets.length; i < l; ++i) {
                let tilesetInfo = tilesets[i];
                if (!tilesetInfo) continue;
                cc.TiledMap.fillTextureGrids(tilesetInfo, texGrids, i);
            }
            this._updateVertices();
            this._prepareToRender();
        }.bind(this));
    },

    _enableClipNode () {
        if (!this._clipNode) {
            this._clipNode = new cc.Node();
            this._clipNode.parent = this;
        }
    },

    _disableClipNode () {
        if (this._clipNode) {
            this._clipNode.destroy();
            this._clipNode = null;
        }
    },

    

    _setClipSize (width, height) {
        this._rangeDirty = (this._rangeDirty || this._range.width !== width || this._range.height !== height);
        this._range.width = width;
        this._range.height = height;
    },

    _setClipPosition (x, y) {
        this._rangeDirty = (this._rangeDirty || this._range.x !== x || this._range.y !== y);
        this._range.x = x;
        this._range.y = y;
    },

    update () {
        if (this._clipNode) {
            this._setClipSize(this._clipNode.width, this._clipNode.height);
            this._setClipPosition(this._clipNode.x, this._clipNode.y);
        }
    },

    // sub class to implement
    _prepareToRender () {},

    /**
     * !#en Layer orientation, which is the same as the map orientation.
     * !#zh 获取 Layer 方向(同地图方向)。
     * @method getLayerOrientation
     * @return {Number}
     * @example
     * let orientation = tiledLayer.getLayerOrientation();
     * cc.log("Layer Orientation: " + orientation);
     */
    getLayerOrientation () {
        return this._layerOrientation;
    },

    /**
     * !#en properties from the layer. They can be added using Tiled.
     * !#zh 获取 layer 的属性，可以使用 Tiled 编辑器添加属性。
     * @method getProperties
     * @return {Array}
     * @example
     * let properties = tiledLayer.getProperties();
     * cc.log("Properties: " + properties);
     */
    getProperties () {
        return this._properties;
    },

    _updateVertices () {

        const TiledMap = cc.TiledMap;
        const TileFlag = TiledMap.TileFlag;
        const FLIPPED_MASK = TileFlag.FLIPPED_MASK;
        const StaggerAxis = TiledMap.StaggerAxis;
        const StaggerIndex = TiledMap.StaggerIndex;
        const Orientation = TiledMap.Orientation;

        let vertices = this._vertices;
        vertices.length = 0;

        let layerOrientation = this._layerOrientation,
            tiles = this._tiles;

        if (!tiles || !this._tileset) {
            return;
        }

        let maptw = this._mapTileSize.width,
            mapth = this._mapTileSize.height,
            maptw2 = maptw * 0.5,
            mapth2 = mapth * 0.5,
            rows = this._layerSize.height,
            cols = this._layerSize.width,
            grids = this._texGrids;
        
        let colOffset, gid, grid, left, bottom,
            axis, diffX1, diffY1, odd_even, diffX2, diffY2;

        if (layerOrientation === Orientation.HEX) {
            let hexSideLength = this._hexSideLength;
            axis = this._staggerAxis;
            odd_even = (this._staggerIndex === StaggerIndex.STAGGERINDEX_ODD) ? 1 : -1;
            diffX1 = (axis === StaggerAxis.STAGGERAXIS_X) ? ((maptw - hexSideLength)/2) : 0;
            diffY1 = (axis === StaggerAxis.STAGGERAXIS_Y) ? ((mapth - hexSideLength)/2) : 0;
        }

        let clipCol = 0, clipRow = 0;
        
        for (let row = 0; row < rows; ++row) {
            for (let col = 0; col < cols; ++col) {
                let index = colOffset + col;
                gid = tiles[index];
                
                grid = grids[(gid & FLIPPED_MASK) >>> 0];
                if (!grid) {
                    continue;
                }

                switch (layerOrientation) {
                    // left top to right dowm
                    case Orientation.ORTHO:
                        clipCol = col;
                        clipRow = rows - row - 1;
                        left = clipCol * maptw;
                        bottom = clipRow * mapth;
                        break;
                    // right top to left down
                    case Orientation.ISO:
                        // if not consider about col, then left is 'w/2 * (rows - row - 1)'
                        // if consider about col then left must add 'w/2 * col'
                        // so left is 'w/2 * (rows - row - 1) + w/2 * col'
                        // combine expression is 'w/2 * (rows - row + col -1)'
                        clipCol = rows + col - row - 1;
                        // if not consider about row, then bottom 'h/2 * (cols - col -1)'
                        // if consider about row then bottom must add 'h/2 * (rows - row - 1)'
                        // so bottom is 'h/2 * (cols - col -1) + h/2 * (rows - row - 1)'
                        // combine expressionn is 'h/2 * (rows + cols - col - row - 2)'
                        clipRow = rows + cols - col - row - 2;
                        left = maptw2 * clipCol;
                        bottom = mapth2 * clipRow;
                        break;
                    // left top to right dowm
                    case Orientation.HEX:
                        diffX2 = (axis === StaggerAxis.STAGGERAXIS_Y && row % 2 === 1) ? maptw2 * odd_even : 0;
                        diffY2 = (axis === StaggerAxis.STAGGERAXIS_X && col % 2 === 1) ? mapth2 * -odd_even : 0;

                        left = col * (maptw - diffX1) + diffX2;
                        bottom = (rows - row - 1) * (mapth -diffY1) + diffY2;
                        clipCol = col;
                        clipRow = rows - row - 1;
                        break;
                }

                let rowData = vertices[clipRow] = vertices[clipRow] || [];
                let colData = rowData[clipCol] = rowData[clipCol] || {};
                
                colData.left = left;
                colData.bottom = bottom;
                colData.grid = grid;
            }
            colOffset += cols;
        }
    },

    _initBase (layerInfo, mapInfo, tilesets, textures, texGrids) {
        let size = layerInfo._layerSize;

        // layerInfo
        this._layerName = layerInfo.name;
        this._tiles = layerInfo._tiles;
        this._properties = layerInfo.properties;
        this._layerSize = size;
        this._minGID = layerInfo._minGID;
        this._maxGID = layerInfo._maxGID;
        this._opacity = layerInfo._opacity;
        this._staggerAxis = mapInfo.getStaggerAxis();
        this._staggerIndex = mapInfo.getStaggerIndex();
        this._hexSideLength = mapInfo.getHexSideLength();

        // tilesets
        this._tilesets = tilesets;
        // textures
        this._textures = textures;
        // grid texture
        this._texGrids = texGrids;

        // mapInfo
        this._layerOrientation = mapInfo.orientation;
        this._mapTileSize = mapInfo.getTileSize();

        // offset (after layer orientation is set);
        this._offset = this._calculateLayerOffset(layerInfo.offset);

        if (this._layerOrientation === cc.TiledMap.Orientation.HEX) {
            let width = 0, height = 0;
            if (this._staggerAxis === cc.TiledMap.StaggerAxis.STAGGERAXIS_X) {
                height = mapInfo._tileSize.height * (this._layerSize.height + 0.5);
                width = (mapInfo._tileSize.width + this._hexSideLength) * Math.floor(this._layerSize.width / 2) + mapInfo._tileSize.width * (this._layerSize.width % 2);
            } else {
                width = mapInfo._tileSize.width * (this._layerSize.width + 0.5);
                height = (mapInfo._tileSize.height + this._hexSideLength) * Math.floor(this._layerSize.height / 2) + mapInfo._tileSize.height * (this._layerSize.height % 2);
            }
            this.node.setContentSize(width, height);
        } else {
            this.node.setContentSize(this._layerSize.width * this._mapTileSize.width,
                this._layerSize.height * this._mapTileSize.height);
        }
        this._useAutomaticVertexZ = false;
        this._vertexZvalue = 0;
    },

    _calculateLayerOffset (pos) {
        let ret = cc.v2(0,0);
        switch (this._layerOrientation) {
            case cc.TiledMap.Orientation.ORTHO:
                ret = cc.v2(pos.x * this._mapTileSize.width, -pos.y * this._mapTileSize.height);
                break;
            case cc.TiledMap.Orientation.ISO:
                ret = cc.v2((this._mapTileSize.width / 2) * (pos.x - pos.y),
                    (this._mapTileSize.height / 2 ) * (-pos.x - pos.y));
                break;
            case cc.TiledMap.Orientation.HEX:
                if(this._staggerAxis === cc.TiledMap.StaggerAxis.STAGGERAXIS_Y)
                {
                    let diffX = (this._staggerIndex === cc.TiledMap.StaggerIndex.STAGGERINDEX_EVEN) ? this._mapTileSize.width/2 : 0;
                    ret = cc.v2(pos.x * this._mapTileSize.width + diffX,
                               -pos.y * (this._mapTileSize.height - (this._mapTileSize.width - this._hexSideLength) / 2));
                }
                else if(this._staggerAxis === cc.TiledMap.StaggerAxis.STAGGERAXIS_X)
                {
                    let diffY = (this._staggerIndex === cc.TiledMap.StaggerIndex.STAGGERINDEX_ODD) ? this._mapTileSize.height/2 : 0;
                    ret = cc.v2(pos.x * (this._mapTileSize.width - (this._mapTileSize.width - this._hexSideLength) / 2),
                               -pos.y * this._mapTileSize.height + diffY);
                }
                break;
        }
        return ret;
    }
});

cc.TiledBase = module.exports = TiledBase;
