/****************************************************************************
 Copyright (c) 20179 Xiamen Yaji Software Co., Ltd.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

cc.CollisionInfo = function () {
    this._lastFrameCount = -1;
    this._currentFrameCount = -1;
    this._collider1 = null;
    this._collider2 = null;
    this._isTrigger = true;
    this._contacts = [];
};

let collisionInfoProto = cc.CollisionInfo.prototype;
collisionInfoProto.reset = function () {
    this._lastFrameCount = -1;
    this._currentFrameCount = -1;
    this._contacts.length = 0;
    this._collider1 = null;
    this._collider2 = null;
};

collisionInfoProto.setFrameCount = function (frameCount) {
    this._lastFrameCount = this._currentFrameCount;
    this._currentFrameCount = frameCount;
};

let Physics3DUtils = cc.Class({
    ctor () {
        this._contactIndex = 0;
        this._contactPool = [];

        this._collisionInfoPool = [];
        this._collisionInfoRecord = {};
    },

    resetContactPool () {
        this._contactIndex = 0;
    },

    getContact () {
        let contact = this._contactPool[this._contactIndex++];
		if (!contact){
			contact = new cc.Contact3D();
			this._contactPool.push(contact);
        }
        contact.reset();
		return contact;
    },

    getCollisionInfo (collider1, collider2) {
        let collision = null;
        let id1 = collider1._id;
        let id2 = collider2._id;
        let record = this._collisionInfoRecord[id1];
        if (!record) {
            record = this._collisionInfoRecord[id1] = {};
        }
        collision = record[id2];
        if (!collision) {
            collision = this._collisionInfoPool.pop();
            if (!collision){
                collision = new cc.CollisionInfo();
            } else {
                collision.reset();
            }
            record[id2] = collision;
            collision._collider1 = collider1;
            collision._collider2 = collider2;
        }
		return collision;
    },

    pushCollisionInfo (collision) {
        let id1 = collision._collider1._id;
        let id2 = collision._collider2._id;
        this._collisionInfoRecord[id1][id2] = null;
        this._collisionInfoPool.push(collision);
    }
});

module.exports = cc.Physics3DUtils = Physics3DUtils;