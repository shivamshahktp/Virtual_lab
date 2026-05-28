import Matter from 'matter-js'
import { createGear, getBodyDimensions, getConstraintType } from './helpers'
import { loadRoomState, getRoomState } from './syncHandlers'

const { Composite, Constraint, Bodies } = Matter

export const setupSocketListeners = (ctx) => {
  const {
    engine, socket, roomId, width,
    selectedBodyRef, firstSelectedBodyRef, selectedConstraintRef,
    clearSelectedBody, clearSelectedConstraint, clearPendingSelections
  } = ctx;

  let hasReceivedLiveSync = false

  // Heads up: this handles when another peer spawns a body
  const onAddBody = (data) => {
    let newBody = null
    const opts = data.body.options || {}
    const dimensions = data.body.dimensions || {}

    if (data.body.type === 'box') {
      newBody = Bodies.rectangle(data.body.x, data.body.y, dimensions.width || 60, dimensions.height || 60, {
        id: data.body.id,
        restitution: opts.restitution ?? 0.6,
        friction: opts.friction ?? 0.1,
        density: opts.density ?? 0.001,
        render: { fillStyle: '#6366f1', strokeStyle: '#818cf8', lineWidth: 2 },
      })
    } else if (data.body.type === 'circle') {
      newBody = Bodies.circle(data.body.x, data.body.y, dimensions.radius || 30, {
        id: data.body.id,
        restitution: opts.restitution ?? 0.8,
        friction: opts.friction ?? 0.1,
        density: opts.density ?? 0.001,
        render: { fillStyle: '#22c55e', strokeStyle: '#4ade80', lineWidth: 2 },
      })
    } else if (data.body.type === 'motor') {
      if (opts.motorType === 'gear') {
        newBody = createGear(data.body.x, data.body.y, opts.gearRadius || 40, opts.gearTeeth || 12, {
          id: data.body.id,
          isStatic: opts.isMotorized ?? true,
          friction: 0.1, restitution: 0.2,
          render: { fillStyle: '#94a3b8', strokeStyle: '#475569', lineWidth: 2 },
        })
        newBody.isMotor = opts.isMotorized ?? true;
        newBody.motorSpeed = opts.motorSpeed || 0.05;
        newBody.motorDirection = opts.motorDirection || 'clockwise';
        newBody.motorType = 'gear';
        newBody.gearRadius = opts.gearRadius || 40;
        newBody.gearTeeth = opts.gearTeeth || 12;
      } else {
        newBody = Bodies.rectangle(data.body.x, data.body.y, dimensions.width || 150, dimensions.height || 20, {
          id: data.body.id,
          isStatic: opts.isMotorized ?? true,
          render: { fillStyle: '#eab308', strokeStyle: '#ca8a04', lineWidth: 2 },
        })
        newBody.isMotor = opts.isMotorized ?? true;
        newBody.motorSpeed = opts.motorSpeed || 0.05;
        newBody.motorDirection = opts.motorDirection || 'clockwise';
        newBody.motorType = 'rod';
      }
    }

    if (newBody) {
      Composite.add(engine.world, newBody)
    }
  }

  const onUpdateBodyProperties = (data) => {
    const targetBody = Composite.get(engine.world, data.body.id, 'body')
    if (!targetBody) return

    if (typeof data.body.restitution === 'number') {
      targetBody.restitution = data.body.restitution
    }

    if (typeof data.body.friction === 'number') {
      targetBody.friction = data.body.friction
    }

    if (
      typeof data.body.density === 'number' &&
      !Number.isNaN(data.body.density) &&
      !targetBody.isStatic
    ) {
      Matter.Body.setDensity(targetBody, data.body.density)
    }

    if (selectedBodyRef.current?.id === targetBody.id) {
      window.dispatchEvent(
        new CustomEvent('body-selection-change', {
          detail: {
            id: targetBody.id,
            restitution: targetBody.restitution,
            friction: targetBody.friction,
            density: targetBody.density,
          },
        })
      )
    }
  }

  const onAddConstraint = (data) => {
    const c = data.constraint
    const bodyA = Composite.get(engine.world, c.bodyAId, 'body')

    if (c.type === 'pivot' && bodyA) {
      const pivot = Constraint.create({
        id: c.id,
        bodyA: bodyA,
        pointA: c.pointA || { x: 0, y: 0 },
        pointB: { x: c.x, y: c.y },
        stiffness: 1,
        length: 0,
        render: c.hidden ? { visible: false } : { strokeStyle: '#f59e0b', lineWidth: 4 }
      })
      Composite.add(engine.world, pivot)
    } else if (c.type === 'spring' || c.type === 'rod' || c.type === 'rope') {
      const bodyB = Composite.get(engine.world, c.bodyBId, 'body')
      if ((bodyA || c.pointA) && bodyB) {
        const newConstraint = Constraint.create({
          id: c.id,
          bodyA: bodyA,
          bodyB: bodyB,
          pointA: c.pointA || { x: 0, y: 0 },
          pointB: c.pointB || { x: 0, y: 0 },
          stiffness: c.stiffness || 0.05,
          length: c.length,
          isRope: c.type === 'rope' || c.isRope,
          maxLength: c.maxLength,
          render: c.type === 'rod' ? { strokeStyle: '#94a3b8', lineWidth: 5 } : c.type === 'rope' ? { strokeStyle: '#d97706', lineWidth: 3 } : { strokeStyle: '#ef4444', lineWidth: 3 }
        })
        Composite.add(engine.world, newConstraint)
      }
    }
  }

  const onUpdateConstraint = (data) => {
    const targetConstraint = engine.world.constraints.find((constraint) => constraint.id === data.constraint.id)
    if (!targetConstraint) return

    if (typeof data.constraint.length === 'number') {
      targetConstraint.length = data.constraint.length
    }

    if (typeof data.constraint.maxLength === 'number') {
      targetConstraint.maxLength = data.constraint.maxLength
    }

    if (typeof data.constraint.x === 'number' && typeof data.constraint.y === 'number') {
      targetConstraint.pointB = { x: data.constraint.x, y: data.constraint.y }
    }

    if (selectedConstraintRef.current?.id === targetConstraint.id) {
      window.dispatchEvent(
        new CustomEvent('constraint-selection-change', {
          detail: {
            type: getConstraintType(targetConstraint),
            length: targetConstraint.maxLength || targetConstraint.length,
          },
        })
      )
    }
  }

  const onClearCanvas = () => {
    const bodiesToRemove = engine.world.bodies.filter(b => b.id !== 999)
    const constraintsToRemove = engine.world.constraints.filter(c => c.label !== 'Mouse Constraint')
    Composite.remove(engine.world, bodiesToRemove)
    Composite.remove(engine.world, constraintsToRemove)
    clearSelectedBody()
    clearSelectedConstraint()
    clearPendingSelections()
  }

  const onRequestSync = (data) => {
    const state = getRoomState(engine);
    socket.emit('sync-state', { targetSocketId: data.targetSocketId, bodies: state.bodies, constraints: state.constraints });
  }

  const onSyncState = (data) => {
    hasReceivedLiveSync = true;
    onClearCanvas();
    loadRoomState(engine, data, width);
  }

  const onRemoveBody = (data) => {
    const bodyToRemove = engine.world.bodies.find(b => b.id === data.id)
    if (bodyToRemove) {
      if (selectedBodyRef.current?.id === data.id) {
        clearSelectedBody()
      }
      if (firstSelectedBodyRef.current?.id === data.id) {
        clearPendingSelections()
      }
      Composite.remove(engine.world, bodyToRemove)
      const constraintsToRemove = engine.world.constraints.filter(c => c.bodyA?.id === data.id || c.bodyB?.id === data.id)
      if (selectedConstraintRef.current && constraintsToRemove.some((constraint) => constraint.id === selectedConstraintRef.current.id)) {
        clearSelectedConstraint()
      }
      Composite.remove(engine.world, constraintsToRemove)
    }
  }

  const onRemoveConstraint = (data) => {
    const constraintToRemove = engine.world.constraints.find(c => c.id === data.id)
    if (constraintToRemove) {
      if (selectedConstraintRef.current?.id === data.id) {
        clearSelectedConstraint()
      }
      Composite.remove(engine.world, constraintToRemove)
    }
  }

  let isApplyingRemoteUpdate = false

  const onPhysicsUpdate = (data) => {
    isApplyingRemoteUpdate = true
    data.bodies.forEach((remoteBody) => {
      const localBody = Composite.get(engine.world, remoteBody.id, 'body')
      if (localBody && localBody.id !== 999) {
        Matter.Body.setPosition(localBody, remoteBody.position)
        Matter.Body.setAngle(localBody, remoteBody.angle)
        Matter.Body.setVelocity(localBody, remoteBody.velocity)
        Matter.Body.setAngularVelocity(localBody, remoteBody.angularVelocity)

        const pivot = engine.world.constraints.find(c => c.bodyA === localBody && !c.bodyB && c.length === 0)
        if (pivot) {
          pivot.pointB = { x: remoteBody.position.x, y: remoteBody.position.y }
        }
      }
    })
  }

  socket.on('add-body', onAddBody)
  socket.on('update-body-properties', onUpdateBodyProperties)
  socket.on('add-constraint', onAddConstraint)
  socket.on('update-constraint', onUpdateConstraint)
  socket.on('clear-canvas', onClearCanvas)
  socket.on('request-sync', onRequestSync)
  socket.on('sync-state', onSyncState)
  socket.on('remove-body', onRemoveBody)
  socket.on('remove-constraint', onRemoveConstraint)
  socket.on('physics-update', onPhysicsUpdate)

  const checkApplyingRemoteUpdate = () => {
    const temp = isApplyingRemoteUpdate
    isApplyingRemoteUpdate = false
    return temp
  }

  return {
    hasReceivedLiveSync: () => hasReceivedLiveSync,
    checkApplyingRemoteUpdate,
    cleanup: () => {
      socket.off('add-body', onAddBody)
      socket.off('update-body-properties', onUpdateBodyProperties)
      socket.off('add-constraint', onAddConstraint)
      socket.off('update-constraint', onUpdateConstraint)
      socket.off('clear-canvas', onClearCanvas)
      socket.off('request-sync', onRequestSync)
      socket.off('sync-state', onSyncState)
      socket.off('remove-body', onRemoveBody)
      socket.off('remove-constraint', onRemoveConstraint)
      socket.off('physics-update', onPhysicsUpdate)
    }
  }
}
