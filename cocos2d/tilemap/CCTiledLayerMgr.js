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

let DefaultTiledType = cc.Enum({ 'TILED_BATCH': 0, 'TILED_NODE': 1 });

/**
 * !#en Enum for tiled type.
 * !#zh Tiled 渲染类型
 * @enum TiledLayerMgr.TiledType
 */
let TiledType = cc.Enum({
    /**
     * !#en The tiled vertices batch render mode.
     * !#zh tiled 顶点批量渲染模式。
     * @property {Number} TILED_BATCH
     */
    TILED_BATCH: 0,
    /**
     * !#en The tiled as node render mode.
     * !#zh 每个 tiled 作为节点渲染模式。
     * @property {Number} TILED_NODE
     */
    TILED_NODE: 1,
});

/**
 * !#en Tiled layer manager.
 * !#zh TMX layer。
 * @class TiledLayerMgr
 * @extends Component
 */
let TiledLayerMgr = cc.Class({
    name: 'cc.TiledLayerMgr',
    extends: cc.Component,

    properties: {
        _debugClip:{
            default: false,
            notify () {
                this._updateDebugClip();
            },
            editorOnly: true,
            visible: true,
            animatable: false,
            displayName: "Debug Clip Rect",
            tooltip: CC_DEV && 'i18n:COMPONENT.tiled_map.debug_clip'
        },

        _tiledType: TiledType.TILED_BATCH,
        _defaultTiledType: {
            default: TiledType.TILED_BATCH,
            type: DefaultTiledType,
            notify () {
                this.setTiledType(this._defaultTiledType);
            },
            editorOnly: true,
            visible: true,
            animatable: false,
            displayName: "Tiled Render Mode",
            tooltip: CC_DEV && 'i18n:COMPONENT.tiled_map.tiled_render_mode'
        },

        _enableClip : {
            default: true,
            notify () {
                
            },
            editorOnly: true,
            visible: true,
            animatable: false,
            displayName: "Enable Clip",
            tooltip: CC_DEV && 'i18n:COMPONENT.tiled_map.enable_clip'
        },

        layerName : '',
    },

    statics: {
        TiledType: TiledType,
    },

    ctor () {
        this._tiledMap = null;
    },

    _setTiledMap (tiledMap) {
        this._tiledMap = tiledMap;
    },

    start () {
        // default close debug clip
        this._debugClip = false;

    },

    _updateDebugClip () {
        let comp = this.getTiledComponent();
        if (!comp) return;
        if (this._debugClip) {
            comp._enableClipNode();
        } else {
            comp._disableClipNode();
        }
    },

    /**
     * !#en Gets the tiled layer component.
     * !#zh 获取层的组件。
     * @method getTiledComponent
     * @return {cc.Component}
     */
    getTiledComponent () {
        let comp = this.node.getComponent(cc.TiledLayer);
        if (!comp) comp = this.node.getComponent(cc.TiledNode);
        return comp;
    },

    /**
     * !#en Gets the tiled layer component.
     * !#zh 获取层的组件。
     * @method setTiledType
     * @param {cc.TiledLayerMgr.TiledType} tiledType
     * @return {cc.Component}
     */
    setTiledType (tiledType) {
        let oldComp = this.getTiledComponent();
        if (this._tiledType === tiledType) {
            return oldComp;
        }
        
        let newComp = null;
        switch (this._tiledType) {
            case TiledType.TILED_NODE:
            newComp = this.node.addComponent(cc.TiledLayer);
            break;
            default:
            newComp = this.node.addComponent(cc.TiledNode);
            break;
        }

        // ??????????????? 写到这，能过TiledMap去获取layerInfo，比较保障
        // tiledlayer通过tiledlayermgr获取数据，不要用layermgr去通知tiledlayer

        if (oldComp) {
            newComp._init(oldComp._layerInfo, oldComp._mapInfo, oldComp._tilesets, oldComp._textures, oldComp._texGrids);
            this._tiledMap._changeLayer(oldComp.getLayerName(), newComp);
            oldComp.destroy();
        }
        
        this._tiledType = tiledType;
        return newComp;
    },
});

cc.TiledLayerMgr = module.exports = TiledLayerMgr;
