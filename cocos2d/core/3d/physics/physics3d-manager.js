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
let ammo = require("./lib/ammo");

let _ammoToCCVec3 = function (ammoVec3, ccVec3) {
    ccVec3.x = ammoVec3.x();
    ccVec3.y = ammoVec3.y();
    ccVec3.z = ammoVec3.z();
};

let Physics3DManager = cc.Class({
    name: 'cc.Physics3DManager',

    properties: {
        maxSubStep: 1.0,
        fixedTimeStep: 1.0 / 60.0,
        _enabledDebugDraw: true,

        /**
         * !#en
         * enabled debug draw
         * !#zh
         * 是否绘制碰撞组件的形状，默认为不绘制
         * @property {Boolean} enabledDebugDraw
         * @default false
         */
        enabledDebugDraw: {
            get () {
                return this._enabledDebugDraw;
            },
            set (value) {
                if (value && !this._enabledDebugDraw) {
                    this._checkDebugDrawValid();
                    this._debugDrawer.node.active = true;
                }
                else if (!value && this._enabledDebugDraw) {
                    this._debugDrawer.clear(true);
                    this._debugDrawer.node.active = false;
                }
                this._enabledDebugDraw = value;
            }
        },
    },

    ctor () {
        this._frameCount = 0;
        this._debugDrawer = null;
        this._vector3Zero = null;
        this._quaternion = null;

        this._collisionConfiguration = null;
        this._dispatcher = null;
        this._broadphase = null;
        this._discreteDynamicsWorld = null;
        this._collisionWorld = null;

        this._solverInfo = null;
        this._dispatchInfo = null;

        this._closestRayResultCallback = null;
		this._allHitsRayResultCallback = null;
		this._closestConvexResultCallback = null;
        this._allConvexResultCallback = null;
        
        this._curCollisionInfos = [];
        this._preCollisionInfos = [];
        this._transformList = [];
        this._physics3DObjectMap = {};

        cc.director._scheduler && cc.director._scheduler.enableForTarget(this);
        this.init();
    },

    init (isCollisionOnly) {
        this._physicsUtils = new cc.Physics3DUtils();
        let vec30 = this._vector3Zero = new ammo.btVector3(0, 0, 0);
		this._quaternion = new ammo.btQuaternion(0, 0, 0, 1);

        this._collisionConfiguration = new ammo.btDefaultCollisionConfiguration();
		this._dispatcher = new ammo.btCollisionDispatcher(this._collisionConfiguration);
		this._broadphase = new ammo.btDbvtBroadphase();
        this._broadphase.getOverlappingPairCache().setInternalGhostPairCallback(new ammo.btGhostPairCallback());
        
        if (!isCollisionOnly) {
            let solver = this._solver = new ammo.btSequentialImpulseConstraintSolver();
            this._discreteDynamicsWorld = new ammo.btDiscreteDynamicsWorld(this._dispatcher, this._broadphase, solver, this._collisionConfiguration);
            this._collisionWorld = this._discreteDynamicsWorld;

            this._solverInfo = this._discreteDynamicsWorld.getSolverInfo();
            this._dispatchInfo = this._discreteDynamicsWorld.getDispatchInfo();
        } else {
            this._collisionWorld = new ammo.btCollisionWorld(this._dispatcher, this._broadphase, this._collisionConfiguration);
        }

        this._closestRayResultCallback = new ammo.ClosestRayResultCallback(vec30, vec30);
		this._allHitsRayResultCallback = new ammo.AllHitsRayResultCallback(vec30, vec30);
		this._closestConvexResultCallback = new ammo.ClosestConvexResultCallback(vec30, vec30);
		this._allConvexResultCallback = new ammo.AllConvexResultCallback(vec30, vec30);
        ammo._btGImpactCollisionAlgorithm_RegisterAlgorithm(this._dispatcher.a);
        
        this.enabledDebugDraw = this._enabledDebugDraw;
    },

    destroy () {
		if (this._discreteDynamicsWorld) {
			ammo.destroy(this._discreteDynamicsWorld);
			this._discreteDynamicsWorld = null;
		} else if (this._collisionWorld) {
            ammo.destroy(this._collisionWorld);
			this._collisionWorld = null;
        }
        
        if (this._broadphase) {
            ammo.destroy(this._broadphase);
            this._broadphase = null;
        }
        
        if (this._dispatcher) {
            ammo.destroy(this._dispatcher);
            this._dispatcher = null;
        }
        
        if (this._collisionConfiguration) {
            ammo.destroy(this._collisionConfiguration);
            this._collisionConfiguration = null;
        }

        if (this._solver) {
            ammo.destroy(this._solver);
            this._solver = null;
        }

        if (this._closestRayResultCallback) {
            ammo.destroy(this._closestRayResultCallback);
            this._closestRayResultCallback = null;
        }

        if (this._allHitsRayResultCallback) {
            ammo.destroy(this._allHitsRayResultCallback);
            this._allHitsRayResultCallback = null;
        }

        if (this._closestConvexResultCallback) {
            ammo.destroy(this._closestConvexResultCallback);
            this._closestConvexResultCallback = null;
        }

        if (this._allConvexResultCallback) {
            ammo.destroy(this._allConvexResultCallback);
            this._allConvexResultCallback = null;
        }

        if (this._vector3Zero) {
            ammo.destroy(this._vector3Zero);
            this._vector3Zero = null;
        }

        if (this._quaternion) {
            ammo.destroy(this._quaternion);
            this._quaternion = null;
        }
    },

    update (dt) {
        this._frameCount++;
        this._updatePhysicsTransfrom();
        this._simulator(dt);

        if (this._collisionWorld && this._enabledDebugDraw) {
            this._collisionWorld.debugDrawWorld();
        }

        this._updateCollision();
        this._handleCollisionEvent();
    },

    /// private interface

    _checkDebugDrawValid () {
        if (!this._debugDrawer || !this._debugDrawer.isValid) {
            let node = new cc.Node('COLLISION_MANAGER_DEBUG_DRAW');
            node.zIndex = cc.macro.MAX_ZINDEX;
            cc.game.addPersistRootNode(node);
            this._debugDrawer = node.addComponent(cc.Graphics);

            let oldAmmoDebugDrawer = this._ammoDebugDrawer;
            let ammoDebugDrawer = this._ammoDebugDrawer = new ammo.DebugDrawer();
            ammoDebugDrawer.DebugDrawMode = 0;
            ammoDebugDrawer.drawLine = function (from, to, color) {
                cc.log("drawLine", 
                    "from", from.x(), from.y(), from.z(), 
                    "to", to.x(), to.y(), to.z(), 
                    "color", color.x(), color.y(), color.z());
                // to do ...
            };
            ammoDebugDrawer.drawContactPoint = function (pointOnB, normalOnB, distance, lifeTime, color) {
                cc.log("drawContactPoint", 
                "pointOnB", pointOnB.x(), pointOnB.y(), pointOnB.z(), 
                "normalOnB", normalOnB.x(), normalOnB.y(), normalOnB.z(),
                "distance", distance,
                "lifeTime", lifeTime,
                "color", color.x(), color.y(), color.z());
                // to do ...
            };
            ammoDebugDrawer.reportErrorWarning = function(warningString) {
                console.warn(warningString);
            };
            ammoDebugDrawer.draw3dText = function(location, textString) {
                cc.log("drawContactPoint", 
                "location", location.x(), location.y(), location.z(),
                "textString", textString);
                // to do ...
            };
            ammoDebugDrawer.setDebugMode = function(debugMode) {
                this.DebugDrawMode = debugMode;
            };
            ammoDebugDrawer.getDebugMode = function() {
                return this.DebugDrawMode;
            };
            if (oldAmmoDebugDrawer) {
                ammo.destroy(oldAmmoDebugDrawer);
                oldAmmoDebugDrawer = null;
            }
            if (this._collisionWorld) {
                this._collisionWorld.setDebugDrawer(ammoDebugDrawer);
            }
        }
    },

    _registerPhysics3D (object) {
        this._physics3DObjectMap[object._id] = object;
    },

    _unregisterPhysics3D (object) {
        delete this._physics3DObjectMap[object._id];
    },

    _simulator (dt) {
        if (this._discreteDynamicsWorld) {
            this._discreteDynamicsWorld.stepSimulation(dt, this.maxSubStep, this.fixedTimeStep);
        } else {
            this._collisionWorld.performDiscreteCollisionDetection();
        }
    },

    _updatePhysicsTransform () {
        for (let i = 0; i < this._transformList.length; i++) {
            let object = this._transformList[i];
            object._inTransformList = false;
            object._updatePhysicsTransform();
        }
        this._transformList.length = 0;
    },

    _updateCollision () {
        this._physicsUtils.resetContactPool();
		let preCollisionInfos = this._curCollisionInfos;
		this._curCollisionInfos = this._preCollisionInfos;
		this._curCollisionInfos.length = 0;
		this._preCollisionInfos = preCollisionInfos;
        let objectMap = this._physics3DObjectMap;

		let numManifolds = this._dispatcher.getNumManifolds();
		for (let manifoldIdx = 0; manifoldIdx < numManifolds; manifoldIdx++) {
			let manifold = this._dispatcher.getManifoldByIndexInternal(manifoldIdx);
			let collider1 = objectMap[manifold.getBody0().getUserIndex()];
			let collider2 = objectMap[manifold.getBody1().getUserIndex()];
			let collisionInfo = null;
            let contacts = null;
            let isNewCollision = false;

            let isTrigger = collider1.isTrigger || collider2.isTrigger;
            let needHandleCollisions = collider1._needHandleCollisions || collider2._needHandleCollisions;
			if (isTrigger) {
				let numContacts = manifold.getNumContacts();
				for (let contactIdx = 0; contactIdx < numContacts; contactIdx++) {
					let pt = manifold.getContactPoint(contactIdx);
					let distance = pt.getDistance();
					if (distance > 0) continue;
                    collisionInfo = this._physicsUtils.getCollisionInfo(collider1, collider2);
                    // Avoid get same collision info in one loop, or same collision will be pushed into container twice
                    isNewCollision = collisionInfo._currentFrameCount != this._frameCount;
                    if (isNewCollision) {                        
                        collisionInfo.contacts.length = 0;
                        collisionInfo._isTrigger = true;
                    }
                    break;
				}
			} else if (needHandleCollisions) {
                let numContacts=manifold.getNumContacts();
                for (let contactIdx = 0; contactIdx < numContacts; contactIdx++) {
                    let pt = manifold.getContactPoint(contactIdx);
                    let distance = pt.getDistance();
                    if (distance > 0) continue;
                    let contact = this._physicsUtils.getContact();
                    contact.colliderA = collider1;
                    contact.colliderB = collider2;
                    contact.distance = distance;
                    let ammoNormal = pt.get_m_normalWorldOnB();
                    _ammoToCCVec3(ammoNormal, contact._normal);
                    let ammoPostion1 = pt.get_m_positionWorldOnA();
                    _ammoToCCVec3(ammoPostion1, contact._position1);
                    let ammoPostion2 = pt.get_m_positionWorldOnB();
                    _ammoToCCVec3(ammoPostion2, contact._position2);
                    if (!collisionInfo) {
                        collisionInfo = this._physicsUtils.getCollisionInfo(collider1, collider2);
                        contacts = collisionInfo.contacts;
                        // Avoid get same collision info in one loop, or same collision will be pushed into container twice
                        isNewCollision = collisionInfo._currentFrameCount !== this._frameCount;
                        if (isNewCollision) {
                            collisionInfo._isTrigger = false;
                            contacts.length = 0;
                        }
                    }
                    contacts.push(contact);
                }
            }
			if (collisionInfo && isNewCollision){
				this._curCollisionInfos.push(collisionInfo);
				collisionInfo.setFrameCount(this._frameCount);
			}
		}
    },

    _invokeComponentFunc (funcName, funcParam) {
        
    },

    _handleCollisionEvent () {
        let frameCount = this._frameCount;
        let curCollisionInfos = this._curCollisionInfos;
        let preCollisionInfos = this._preCollisionInfos;

        /*

        let comps1 = collider1.node._components;
        let comps2 = collider2.node._components;

        let i, l, comp;
        for (i = 0, l = comps1.length; i < l; i++) {
            comp = comps1[i];
            if (comp[contactFunc]) {
                comp[contactFunc](collider2, collider1);
            }
        }

        for (i = 0, l = comps2.length; i < l; i++) {
            comp = comps2[i];
            if (comp[contactFunc]) {
                comp[contactFunc](collider1, collider2);
            }
        }

        */

		for (let i = 0, n = curCollisionInfos.length; i < n; i++){
			let collisionInfo = curCollisionInfos[i];
			let collider1 = collisionInfo._collider1;
			let collider2 = collisionInfo._collider2;
			if (!collider1.isValid && !collider2.isValid) {
                continue;
            }

            let comps1 = collider1.node._components;
            let comps2 = collider2.node._components;

			if (frameCount - collisionInfo._currentFrameCount === 1) {
				let ownerA = collider1.owner;
				let scriptsA=ownerA._scripts;
				if (scriptsA) {
					if (collisionInfo._isTrigger) {
                        if (ownerA._needProcessTriggers) {
                            for (let j=0,m=scriptsA.length;j < m;j++)
                            scriptsA[j].onTriggerStay(collider2);
                        }
                    }else {
                        if (ownerA._needProcessCollisions){
                            for (j=0,m=scriptsA.length;j < m;j++){
                                collisionInfo.other=collider2;
                                scriptsA[j].onCollisionStay(collisionInfo);
                            }
                        }
					}
				};
				let ownerB=collider2.owner;
				let scriptsB=ownerB._scripts;
				if (scriptsB){
					if (collisionInfo._isTrigger){
						if (ownerB._needProcessTriggers){
							for (j=0,m=scriptsB.length;j < m;j++)
							scriptsB[j].onTriggerStay(collider1);
						}
						}else {
						if (ownerB._needProcessCollisions){
							for (j=0,m=scriptsB.length;j < m;j++){
								collisionInfo.other=collider1;
								scriptsB[j].onCollisionStay(collisionInfo);
							}
						}
					}
				}
				}else {
				ownerA=collider1.owner;
				scriptsA=ownerA._scripts;
				if (scriptsA){
					if (collisionInfo._isTrigger){
						if (ownerA._needProcessTriggers){
							for (j=0,m=scriptsA.length;j < m;j++)
							scriptsA[j].onTriggerEnter(collider2);
						}
						}else {
						if (ownerA._needProcessCollisions){
							for (j=0,m=scriptsA.length;j < m;j++){
								collisionInfo.other=collider2;
								scriptsA[j].onCollisionEnter(collisionInfo);
							}
						}
					}
				}
				ownerB=collider2.owner;
				scriptsB=ownerB._scripts;
				if (scriptsB){
					if (collisionInfo._isTrigger){
						if (ownerB._needProcessTriggers){
							for (j=0,m=scriptsB.length;j < m;j++)
							scriptsB[j].onTriggerEnter(collider1);
						}
						}else {
						if (ownerB._needProcessCollisions){
							for (j=0,m=scriptsB.length;j < m;j++){
								collisionInfo.other=collider1;
								scriptsB[j].onCollisionEnter(collisionInfo);
							}
						}
					}
				}
			}
		}
		for (i=0,n=this._previousFrameCollisions.length;i < n;i++){
			let preFrameCol=this._previousFrameCollisions[i];
			let preColliderA=preFrameCol._colliderA;
			let preColliderB=preFrameCol._colliderB;
			if (preColliderA.destroyed || preColliderB.destroyed)
				continue ;
			if (loopCount-preFrameCol._updateFrame===1){
				this._collisionsUtils.recoverCollision(preFrameCol);
				ownerA=preColliderA.owner;
				scriptsA=ownerA._scripts;
				if (scriptsA){
					if (preFrameCol._isTrigger){
						if (ownerA._needProcessTriggers){
							for (j=0,m=scriptsA.length;j < m;j++)
							scriptsA[j].onTriggerExit(preColliderB);
						}
						}else {
						if (ownerA._needProcessCollisions){
							for (j=0,m=scriptsA.length;j < m;j++){
								preFrameCol.other=preColliderB;
								scriptsA[j].onCollisionExit(preFrameCol);
							}
						}
					}
				}
				ownerB=preColliderB.owner;
				scriptsB=ownerB._scripts;
				if (scriptsB){
					if (preFrameCol._isTrigger){
						if (ownerB._needProcessTriggers){
							for (j=0,m=scriptsB.length;j < m;j++)
							scriptsB[j].onTriggerExit(preColliderA);
						}
						}else {
						if (ownerB._needProcessCollisions){
							for (j=0,m=scriptsB.length;j < m;j++){
								preFrameCol.other=preColliderA;
								scriptsB[j].onCollisionExit(preFrameCol);
							}
						}
					}
				}
			}
		}
    },

    _getCollisionWorld () {
        return this._collisionWorld;
    },

    _addToTransformList (physicsObject) {
        if (physicsObject._inTransformList) return;
        physicsObject._inTransformList = true;
        this._transformList.push(physicsObject);
    },

    _removeFromTransformList (physicsObject) {
        if (!physicsObject._inTransformList) return;
        physicsObject._inTransformList = false;
        let index = this._transformList.indexOf(physicsObject);
        if (index >= 0) {
            this._transformList.splice(index, 1);
        }
    },

    _addCollider (collider, group, mask) {
        this._collisionWorld.addCollisionObject(collider, group, mask);
    },

    _removeCollider (collider) {
        this._collisionWorld.removeCollisionObject(collider);
    },

    _addRigidBody (rigidBody, group, mask) {
        if (!this._discreteDynamicsWorld) {
            cc.error("Physics3DManager: can not invoke addRigidBody when the physics engine is set to collision only");
            return;
        }
        this._collisionWorld.addRigidBody(rigidBody, group, mask);
    },

    _removeRigidBody (rigidBody) {
        if (!this._discreteDynamicsWorld) {
            cc.error("Physics3DManager: can not invoke removeRigidBody when the physics engine is set to collision only");
            return;
        }
        this._collisionWorld.removeRigidBody(rigidBody);
    }
});

module.exports = cc.Physics3DManager = Physics3DManager;