import Matter from 'matter-js'
import { 
  getBodyDimensions, 
  getConstraintType, 
  getConstraintStrokeStyle, 
  getConstraintWorldPoint, 
  getDistanceToSegment,
  resetBodyHighlight,
  createGear
} from './helpers'

const { Composite, Query, Bodies, Constraint } = Matter

export const setupMouseHandlers = (ctx) => {
  const {
    engine, render, socket, roomId, mouseConstraint,
    activeToolRef, materialRef, actionHistoryRef,
    selectedBodyRef, firstSelectedBodyRef, firstSelectedPointRef,
    firstSelectedAnchorRef, pivotAnchorRef,
    clearSelectedBody, clearSelectedConstraint, clearPendingSelections, selectConstraint,
    canvasContainer
  } = ctx;

  const findSelectableConstraint = (point) => {
    const selectable = engine.world.constraints.filter((constraint) => {
      if (constraint.label === 'Mouse Constraint') return false
      const type = getConstraintType(constraint)
      return ['rope', 'spring', 'rod'].includes(type)
    })

    let closest = null
    let closestDistance = 12

    selectable.forEach((constraint) => {
      const start = getConstraintWorldPoint(constraint.bodyA, constraint.pointA)
      const end = getConstraintWorldPoint(constraint.bodyB, constraint.pointB)
      const distance = getDistanceToSegment(point, start, end)

      if (distance < closestDistance) {
        closest = constraint
        closestDistance = distance
      }
    })

    return closest
  }

  // Figures out what tool is active and handles placing shapes / starting lines
  const handleCanvasClick = (e) => {
    const currentTool = activeToolRef.current

    const rect = render.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if they clicked directly on top of a shape
    const clickedBodies = Query.point(engine.world.bodies, { x, y })
    const clickedBody = clickedBodies.length > 0 ? clickedBodies[0] : null
    const clickedConstraint = clickedBody ? null : findSelectableConstraint({ x, y })

    if (currentTool === 'cursor') {
      if (clickedBody && clickedBody.id !== 999) {
        clearSelectedConstraint()
        if (selectedBodyRef.current && selectedBodyRef.current.id !== clickedBody.id) {
          resetBodyHighlight(selectedBodyRef.current)
        }
        selectedBodyRef.current = clickedBody
        clickedBody.render.lineWidth = 3
        clickedBody.render.strokeStyle = '#1e6fe8' // Highlight selected body with a light blue outline
        window.dispatchEvent(
          new CustomEvent('body-selection-change', {
            detail: {
              id: clickedBody.id,
              restitution: clickedBody.restitution,
              friction: clickedBody.friction,
              density: clickedBody.density,
            },
          })
        )
      } else if (clickedConstraint) {
        selectConstraint(clickedConstraint)
      } else {
        clearSelectedBody()
        clearSelectedConstraint()
      }
      return // Let the default Matter mouse drag helper take care of dragging dynamic bodies
    }

    clearSelectedBody()
    clearSelectedConstraint()

    const bodyId = Math.floor(Math.random() * 10000000) // Just a unique local key for sync
    const currentMaterial = materialRef.current

    if (currentTool === 'box') {
      const newBody = Bodies.rectangle(x, y, 60, 60, {
        id: bodyId,
        restitution: currentMaterial.restitution,
        friction: currentMaterial.friction,
        density: currentMaterial.density,
        render: { fillStyle: '#6366f1', strokeStyle: '#4f46e5', lineWidth: 1.5 },
      })
      Composite.add(engine.world, newBody)
      actionHistoryRef.current.push({ type: 'body', id: bodyId })
      socket.emit('add-body', {
        roomId,
        body: {
          id: bodyId,
          type: currentTool,
          x,
          y,
          options: currentMaterial,
          dimensions: getBodyDimensions(newBody),
        },
      })

    } else if (currentTool === 'circle') {
      const newBody = Bodies.circle(x, y, 30, {
        id: bodyId,
        restitution: currentMaterial.restitution,
        friction: currentMaterial.friction,
        density: currentMaterial.density,
        render: { fillStyle: '#22c55e', strokeStyle: '#16a34a', lineWidth: 1.5 },
      })
      Composite.add(engine.world, newBody)
      actionHistoryRef.current.push({ type: 'body', id: bodyId })
      socket.emit('add-body', {
        roomId,
        body: {
          id: bodyId,
          type: currentTool,
          x,
          y,
          options: currentMaterial,
          dimensions: getBodyDimensions(newBody),
        },
      })

    } else if (currentTool === 'motor') {
      let newBody;
      if (currentMaterial.motorType === 'rod') {
        newBody = Bodies.rectangle(x, y, 150, 20, {
          id: bodyId,
          isStatic: currentMaterial.isMotorized ?? true,
          render: { fillStyle: '#eab308', strokeStyle: '#ca8a04', lineWidth: 2 },
        })
        newBody.isMotor = currentMaterial.isMotorized ?? true;
        newBody.motorSpeed = currentMaterial.motorSpeed || 0.05;
        newBody.motorDirection = currentMaterial.motorDirection || 'clockwise';
        newBody.motorType = 'rod';
      } else {
        newBody = createGear(x, y, currentMaterial.gearRadius || 40, currentMaterial.gearTeeth || 12, {
          id: bodyId,
          isStatic: currentMaterial.isMotorized ?? true,
          friction: 0.1,
          restitution: 0.2,
          render: { fillStyle: '#94a3b8', strokeStyle: '#475569', lineWidth: 2 },
        });
        newBody.isMotor = currentMaterial.isMotorized ?? true;
        newBody.motorSpeed = currentMaterial.motorSpeed || 0.05;
        newBody.motorDirection = currentMaterial.motorDirection || 'clockwise';
        newBody.motorType = 'gear';
        newBody.gearRadius = currentMaterial.gearRadius || 40;
        newBody.gearTeeth = currentMaterial.gearTeeth || 12;
      }

      Composite.add(engine.world, newBody)
      actionHistoryRef.current.push({ type: 'body', id: bodyId })

      // If motor is dynamic, we need to pin it in place with a hidden constraint so it doesn't drop
      if (!(currentMaterial.isMotorized ?? true)) {
        const pivot = Constraint.create({
          id: bodyId + 1,
          bodyA: newBody,
          pointA: { x: 0, y: 0 },
          pointB: { x, y },
          stiffness: 1,
          length: 0,
          render: { visible: false }
        });
        Composite.add(engine.world, pivot);
        actionHistoryRef.current.push({ type: 'constraint', id: bodyId + 1 });

        socket.emit('add-constraint', {
          roomId,
          constraint: { id: bodyId + 1, type: 'pivot', bodyAId: newBody.id, x, y, hidden: true }
        });
      }

      socket.emit('add-body', {
        roomId,
        body: {
          id: bodyId, type: 'motor', x, y,
          dimensions: getBodyDimensions(newBody),
          options: {
            motorType: newBody.motorType,
            gearRadius: newBody.gearRadius,
            gearTeeth: newBody.gearTeeth,
            isMotorized: newBody.isMotor,
            motorSpeed: newBody.motorSpeed,
            motorDirection: newBody.motorDirection
          }
        }
      })

    } else if (currentTool === 'pivot') {
      if (!pivotAnchorRef.current) {
        pivotAnchorRef.current = { x, y }
        return
      }

      if (clickedBody && clickedBody.id !== 999) {
        const pivot = Constraint.create({
          id: bodyId,
          bodyA: clickedBody,
          pointA: { x: 0, y: 0 },
          pointB: { ...pivotAnchorRef.current },
          stiffness: 1,
          length: 0,
          render: { strokeStyle: '#f59e0b', lineWidth: 4 }
        })
        Composite.add(engine.world, pivot)
        actionHistoryRef.current.push({ type: 'constraint', id: bodyId })
        socket.emit('add-constraint', {
          roomId,
          constraint: {
            id: bodyId,
            type: 'pivot',
            bodyAId: clickedBody.id,
            x: pivotAnchorRef.current.x,
            y: pivotAnchorRef.current.y,
            pointA: { x: 0, y: 0 },
          }
        })
        pivotAnchorRef.current = null
      } else {
        pivotAnchorRef.current = { x, y }
      }

    } else if (currentTool === 'spring' || currentTool === 'rod' || currentTool === 'rope') {
      const validBody = clickedBody && clickedBody.id !== 999 ? clickedBody : null

      if (!firstSelectedBodyRef.current && !firstSelectedAnchorRef.current) {
        if (validBody) {
          firstSelectedBodyRef.current = clickedBody
          const offset = Matter.Vector.sub({ x, y }, clickedBody.position)
          firstSelectedPointRef.current = Matter.Vector.rotate(offset, -clickedBody.angle)

          clickedBody.render.lineWidth = 5
          clickedBody.render.strokeStyle = '#ef4444'
        } else {
          firstSelectedAnchorRef.current = { x, y }
        }
        return
      }

      if (!validBody) {
        if (firstSelectedAnchorRef.current) {
          firstSelectedAnchorRef.current = { x, y }
        } else {
          clearPendingSelections()
        }
        return
      }

      if (firstSelectedBodyRef.current && firstSelectedBodyRef.current.id === validBody.id) {
        clearPendingSelections()
        return
      }

      const type = currentTool
      const renderOpts = getConstraintStrokeStyle(type)
      
      let anchorOrBodyWorldPos
      if (firstSelectedAnchorRef.current) {
        anchorOrBodyWorldPos = firstSelectedAnchorRef.current
      } else {
        const pA = firstSelectedPointRef.current || { x: 0, y: 0 }
        anchorOrBodyWorldPos = Matter.Vector.add(
          firstSelectedBodyRef.current.position, 
          Matter.Vector.rotate(pA, firstSelectedBodyRef.current.angle)
        )
      }

      const offsetB = Matter.Vector.sub({ x, y }, validBody.position)
      const pointB = Matter.Vector.rotate(offsetB, -validBody.angle)
      const validBodyWorldPos = Matter.Vector.add(validBody.position, Matter.Vector.rotate(pointB, validBody.angle))

      const defaultDistance = Matter.Vector.magnitude(
        Matter.Vector.sub(anchorOrBodyWorldPos, validBodyWorldPos)
      )
      const length =
        type === 'rod' ? (currentMaterial.rodLength ?? defaultDistance) :
        type === 'spring' ? (currentMaterial.springLength ?? defaultDistance) :
        (currentMaterial.ropeLength ?? defaultDistance)

      const finalPointA = firstSelectedBodyRef.current
        ? (firstSelectedBodyRef.current.isStatic 
            ? Matter.Vector.rotate(firstSelectedPointRef.current, firstSelectedBodyRef.current.angle) 
            : firstSelectedPointRef.current)
        : firstSelectedAnchorRef.current;

      const finalPointB = validBody.isStatic 
        ? Matter.Vector.rotate(pointB, validBody.angle) 
        : pointB;

      const newConstraint = Constraint.create({
        id: bodyId,
        bodyA: firstSelectedBodyRef.current || undefined,
        pointA: finalPointA ? { ...finalPointA } : undefined,
        bodyB: validBody,
        pointB: finalPointB ? { ...finalPointB } : undefined,
        stiffness: type === 'rod' ? 1 : type === 'rope' ? 1 : currentMaterial.springStiffness || 0.05,
        length,
        isRope: type === 'rope',
        maxLength: type === 'rope' ? length : undefined,
        render: renderOpts,
      })

      Composite.add(engine.world, newConstraint)
      actionHistoryRef.current.push({ type: 'constraint', id: bodyId })
      socket.emit('add-constraint', {
        roomId,
        constraint: {
          id: bodyId,
          type,
          bodyAId: firstSelectedBodyRef.current?.id,
          bodyBId: validBody.id,
          pointA: finalPointA,
          pointB: finalPointB,
          stiffness: newConstraint.stiffness,
          length,
          isRope: type === 'rope',
          maxLength: type === 'rope' ? length : undefined,
        }
      })
      clearPendingSelections()
    }
  }

  canvasContainer.addEventListener('mousedown', handleCanvasClick)

  let customDragBody = null;
  let draggedDynamicBody = null;

  const onMousedown = (event) => {
    if (activeToolRef.current !== 'cursor') return;
    const bodies = Query.point(engine.world.bodies, event.mouse.position);
    const body = bodies.length > 0 ? bodies[0] : null;
    if (body && body.id !== 999) {
      if (body.isStatic) {
        customDragBody = body;
      } else {
        draggedDynamicBody = body;
      }
    }
  };

  const onMousemove = (event) => {
    if (customDragBody) {
      Matter.Body.setPosition(customDragBody, event.mouse.position);

      // Drag the constraint anchors along as the shape moves
      const pivots = engine.world.constraints.filter(c => c.bodyA === customDragBody && !c.bodyB);
      pivots.forEach(pivot => {
        const worldPointA = { x: customDragBody.position.x + pivot.pointA.x, y: customDragBody.position.y + pivot.pointA.y };
        pivot.pointB = { x: worldPointA.x, y: worldPointA.y };
      });
    }
  };

  const onMouseup = (event) => {
    if (customDragBody) {
      socket.emit('physics-update', {
        roomId,
        bodies: [{
          id: customDragBody.id,
          position: customDragBody.position,
          angle: customDragBody.angle,
          velocity: customDragBody.velocity,
          angularVelocity: customDragBody.angularVelocity
        }]
      });

      const pivots = engine.world.constraints.filter(c => c.bodyA === customDragBody && !c.bodyB);
      pivots.forEach(pivot => {
        socket.emit('update-constraint', {
          roomId,
          constraint: {
            id: pivot.id,
            x: pivot.pointB.x,
            y: pivot.pointB.y
          }
        });
      });

      customDragBody = null;
    }

    if (draggedDynamicBody) {
      socket.emit('physics-update', {
        roomId,
        bodies: [{
          id: draggedDynamicBody.id,
          position: draggedDynamicBody.position,
          angle: draggedDynamicBody.angle,
          velocity: draggedDynamicBody.velocity,
          angularVelocity: draggedDynamicBody.angularVelocity
        }]
      });

      const pivots = engine.world.constraints.filter(c => c.bodyA === draggedDynamicBody && !c.bodyB);
      pivots.forEach(pivot => {
        socket.emit('update-constraint', {
          roomId,
          constraint: {
            id: pivot.id,
            x: pivot.pointB.x,
            y: pivot.pointB.y
          }
        });
      });

      draggedDynamicBody = null;
    }
  };

  Matter.Events.on(mouseConstraint, 'mousedown', onMousedown);
  Matter.Events.on(mouseConstraint, 'mousemove', onMousemove);
  Matter.Events.on(mouseConstraint, 'mouseup', onMouseup);

  return () => {
    canvasContainer.removeEventListener('mousedown', handleCanvasClick)
    Matter.Events.off(mouseConstraint, 'mousedown', onMousedown)
    Matter.Events.off(mouseConstraint, 'mousemove', onMousemove)
    Matter.Events.off(mouseConstraint, 'mouseup', onMouseup)
  }
}
