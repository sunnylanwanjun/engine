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

// Each Node Memery Layout:
// Space A: [Next Free Offset Or Pre Using Offset]   [Size:1 Uint32]
// Space B: [Next Using Offset]                      [Size:1 Uint32]
// Space C: [Dirty]                                  [Size:1 Uint32]
// Space D: [TRS]                                    [Size:10 Float32]
// Space E: [LocalMat]                               [Size:16 Float32]
// Space F: [WorldMat]                               [Size:16 Float32]
// ------------------------------------------------
// Unit has many Node, layout such as :
// HeadFreePointer + TailUsingPointer + Node 1 + Node 2 + Node 3 ...
// ------------------------------------------------
// A unit is compose by using "link list" and free "link list",
// the "link list" is tightness in memerty,not disperse,so it is cache friendly.
// The using link list is a two way link list such as : 
// one way is: tail -> [ <- using 1 -> ] [<- using 2 -> ] [ <- using 3 -> ] .....
// The free link list is a single way link list such as :
// head -> [free 1 ->] [free 2 ->] [free 3 ->]....

var NODE_SPACE = 45;
var NODE_NUM = 128;
var UNIT_SIZE = NODE_NUM * NODE_SPACE;
var INVALID_FLAG = 0xffffffff;
var Unit = function (unitID) {
    
    this.unitID = unitID;

    this._data = new Uint32Array(UNIT_SIZE + 2);
    this._transData = new Uint32Array(this._data.buffer, 2 << 2);

    // head of the free link list
    this._data[0] = 0;

    // tail of the using link list
    this._data[1] = INVALID_FLAG;

    // init each space point to next can use space
    for (var i = 0; i < UNIT_SIZE; i += NODE_SPACE) {
        this._transData[i] = i + NODE_SPACE;
        this._transData[i + 1] = INVALID_FLAG;
    }
    // last one has no next space;
    this._transData[UNIT_SIZE - NODE_SPACE] = INVALID_FLAG;
}

var UnitProto = Unit.prototype;
UnitProto.hasSpace = function () {
    return this._data[0] !== INVALID_FLAG;
}

// pop space from unit
UnitProto.pop = function () {
    var headFreeOffset = this._data[0];
    if (headFreeOffset === INVALID_FLAG) return undefined;

    var offset = headFreeOffset;
    var space = {
        dirty : new Uint32Array(this._transData.buffer, (offset + 2) << 2, 1),
        trs : new Float32Array(this._transData.buffer, (offset + 3) << 2, 10),
        localMat : new Float32Array(this._transData.buffer, (offset + 13) << 2, 16),
        worldMat : new Float32Array(this._transData.buffer, (offset + 29) << 2, 16),
        offset : offset,
        unitID : this.unitID
    }

    // store new next free space offset
    var newNextFreeOffset = this._transData[offset];

    var tailUsingOffset = this._data[1];
    // change pre node next pointer to this node
    if (tailUsingOffset !== INVALID_FLAG) {
    	this._transData[tailUsingOffset + 1] = offset;
    }

    // set this node pre pointer
    this._transData[offset] = tailUsingOffset;
    // set this node next pointer
    this._transData[offset + 1] = INVALID_FLAG;
    // store last using space offset
    this._data[1] = offset;

    // store next free space offset
    this._data[0] = newNextFreeOffset;

    return space;
}

// push back to unit
UnitProto.push = function (offset) {
    // pre using offset
    var preUsingOffset = this._transData[offset];
    // next using offset
    var nextUsingOffset = this._transData[offset + 1];

    // if pre pointer is valid,set pre node's next pointer to "this node"'s next pointer
    if (preUsingOffset !== INVALID_FLAG) {
        this._transData[preUsingOffset + 1] = nextUsingOffset;
    }

    // if next pointer is valid,set next node's pre pointer to "this node"'s pre pointer
    if (nextUsingOffset !== INVALID_FLAG) {
    	this._transData[nextUsingOffset] = preUsingOffset;
    }

    // if push space is the tail of using list,then update tail of the using list.
    if (this._data[1] === offset) {
        this._data[1] = preUsingOffset;
    }

    // store head free offset to the space
    this._transData[offset] = this._data[0];
    // reset next using offset
    this._transData[offset + 1] = INVALID_FLAG;
    // update head free offset
    this._data[0] = offset;
}

// dump all space info
UnitProto.dump = function () {
    var spaceNum = 0;
    var nextOffset = this._data[0];
    var freeStr = "";
    while (nextOffset != INVALID_FLAG) {
        spaceNum ++;
        freeStr += nextOffset + "->";
        nextOffset = this._transData[nextOffset];
    }
    var usingNum = 0;
    var preUsingOffset = this._data[1];
    var usingStr = "";
    while (preUsingOffset != INVALID_FLAG) {
        usingNum ++;
        usingStr += preUsingOffset + "->";
        preUsingOffset = this._transData[preUsingOffset];
    }
    console.log("unitID:", this.unitID, "spaceNum:", spaceNum, "useNum:", usingNum, "totalNum:", spaceNum + usingNum, NODE_NUM);
    console.log("free info:", freeStr);
    console.log("using info:", usingStr);
}

var TransPool = function () {
    this._pool = [new Unit(0)];
    this._findOrder = [this._pool[0]];
}

var TransPoolProto = TransPool.prototype;
TransPoolProto.pop = function () {
    var findUnit = undefined;
    var idx = 0;
    for (var n = this._findOrder.length; idx < n; idx++) {
        var unit = this._findOrder[idx];
        if (unit.hasSpace()) {
            findUnit = unit;
            break;
        }
    }

    if (!findUnit) {
        findUnit = new Unit(this._pool.length)
        this._pool.push(findUnit);
        this._findOrder.push(findUnit);
        idx = this._findOrder.length - 1;
    }

    // swap has space unit to first position, so next find will fast
    var firstUnit = this._findOrder[0];
    if (firstUnit !== findUnit && findUnit.hasSpace()) {
        this._findOrder[0] = findUnit;
        this._findOrder[idx] = firstUnit;
    }

    return findUnit.pop();
}

TransPoolProto.push = function (info) {
    var unit = this._pool[info.unitID];
    unit.push(info.offset);
}

// dump unit info
TransPoolProto.dump = function () {
    for (var i = 0, n = this._pool.length; i < n; i++) {
        var unit = this._pool[i];
        console.log("------------dump unit:",i,unit.unitID);
        unit.dump();
    }
}

module.exports = cc.transPool = new TransPool();