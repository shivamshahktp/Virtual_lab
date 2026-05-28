import Matter from 'matter-js'
import { getConstraintWorldPoint } from './helpers'

export const setupRenderLoop = (ctx) => {
  const {
    engine, render, socket, roomId, mouseConstraint,
    activeToolRef, selectedBodyRef, vectorSettingsRef, pivotAnchorRef, firstSelectedAnchorRef,
    firstSelectedBodyRef, firstSelectedPointRef,
    checkApplyingRemoteUpdate
  } = ctx;

  let lastBroadcast = 0
  
  const onAfterUpdate = () => {
    // Don't bounce the position updates back if they came from another user
    if (checkApplyingRemoteUpdate && checkApplyingRemoteUpdate()) {
      return
    }

    const now = Date.now()
    // Cap broadcast rate to 20Hz (50ms intervals) so we don't spam socket connections
    if (now - lastBroadcast > 50) {
      // Only share position data for shapes this specific user is actively dragging
      const activeBodies = engine.world.bodies.filter(b => 
        b.id !== 999 && (mouseConstraint.body && mouseConstraint.body.id === b.id)
      )

      if (activeBodies.length > 0) {
        // Send only the bare minimum vectors we need to update state
        const bodiesData = activeBodies.map(b => ({
          id: b.id,
          position: b.position,
          angle: b.angle,
          velocity: b.velocity,
          angularVelocity: b.angularVelocity
        }))

        // Tell the rest of the room where the shape went
        socket.emit('physics-update', { roomId, bodies: bodiesData })
      }
      lastBroadcast = now
    }
  }
  
  const onBeforeUpdate = () => {
    // Static shapes in Matter don't automatically rotate constraints attached off-center, so we handle it manually
    engine.world.constraints.forEach(c => {
      if (c.bodyA && c.bodyA.isStatic) {
          if (c.angleA === undefined) {
              c.angleA = c.bodyA.angle;
          }
          Matter.Vector.rotate(c.pointA, c.bodyA.angle - c.angleA, c.pointA);
          c.angleA = c.bodyA.angle;
      }
      if (c.bodyB && c.bodyB.isStatic) {
          if (c.angleB === undefined) {
              c.angleB = c.bodyB.angle;
          }
          Matter.Vector.rotate(c.pointB, c.bodyB.angle - c.angleB, c.pointB);
          c.angleB = c.bodyB.angle;
      }

      // Check if this constraint is a rope and adjust stiffness/length before physics calculations start
      if (c.isRope) {
        if (c.maxLength === undefined || c.maxLength === null) {
          c.maxLength = c.length || 100;
        }

        const pA = getConstraintWorldPoint(c.bodyA, c.pointA);
        const pB = getConstraintWorldPoint(c.bodyB, c.pointB);

        if (pA && pB) {
          const dist = Matter.Vector.magnitude(Matter.Vector.sub(pA, pB));
          if (dist < c.maxLength * 0.99) {
            // Let the rope droop without any push/pull force
            c.stiffness = 0;
            c.length = dist;
            c.render.visible = false;
          } else {
            // Tight constraint: prevent moving beyond maxLength
            c.stiffness = 1;
            c.length = c.maxLength;
            c.render.visible = true;
          }
        }
      }
    });

    // Kill air resistance to keep momentum pure, and tick motorized gears/rods forward
    engine.world.bodies.forEach(body => {
      body.frictionAir = 0;
      if (body.isMotor && body.isStatic) {
        const speed = body.motorSpeed || 0.05;
        const direction = body.motorDirection === 'anticlockwise' ? -1 : 1;
        Matter.Body.setAngle(body, body.angle + (speed * direction));
      }
    })
    
    // Only let users grab and throw shapes when using the pointer tool
    if (activeToolRef.current !== 'cursor') {
      mouseConstraint.collisionFilter.mask = 0;
    } else {
      mouseConstraint.collisionFilter.mask = 0xFFFFFFFF;
    }

    if (mouseConstraint.body) {
      const body = mouseConstraint.body;
      // Keep background pivot anchors glued to shapes while dragging them
      const pivots = engine.world.constraints.filter(c => c.bodyA === body && !c.bodyB);
      pivots.forEach(pivot => {
        const worldPointA = { x: body.position.x + pivot.pointA.x, y: body.position.y + pivot.pointA.y };
        pivot.pointB = { x: worldPointA.x, y: worldPointA.y };
      });
    }
  }

  let lastTime = performance.now()
  const onAnalyticsUpdate = () => {
    const now = performance.now()
    const fps = Math.round(1000 / (now - lastTime))
    lastTime = now

    let telemetry = null
    if (selectedBodyRef.current) {
      const body = selectedBodyRef.current
      let rawSpeed = body.speed
      
      // Filter out physics outlier spikes so the charts look smooth
      if (body._lastSpeed !== undefined && rawSpeed > body._lastSpeed * 1.5 + 1) {
        rawSpeed = body._lastSpeed
      }
      body._lastSpeed = body.speed
      
      const rawEnergy = 0.5 * body.mass * Math.pow(rawSpeed, 2)
      telemetry = {
        speed: rawSpeed.toFixed(1),
        energy: rawEnergy.toFixed(1),
        rawSpeed: rawSpeed,
        rawEnergy: rawEnergy
      }
    }

    window.dispatchEvent(new CustomEvent('physics-metrics', {
      detail: {
        fps: isNaN(fps) ? 0 : Math.min(fps, 60), // Cap it at 60 so the UI doesn't freak out
        bodies: engine.world.bodies.length,
        telemetry
      }
    }))
  }

  const onAfterRender = () => {
    const context = render.context
    if (!context) return
    const selectedBody = selectedBodyRef.current

    // Draw velocity vector arrow
    if (selectedBody && selectedBody.speed > 0.5) {
      const startX = selectedBody.position.x
      const startY = selectedBody.position.y
      const scale = 5
      const endX = startX + selectedBody.velocity.x * scale
      const endY = startY + selectedBody.velocity.y * scale

      context.beginPath()
      context.moveTo(startX, startY)
      context.lineTo(endX, endY)
      context.strokeStyle = '#ef4444' // Use red for velocity
      context.lineWidth = 3
      context.stroke()

      const angle = Math.atan2(endY - startY, endX - startX)
      const headlen = 10
      context.beginPath()
      context.moveTo(endX, endY)
      context.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6))
      context.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6))
      context.fillStyle = '#ef4444'
      context.fill()
    }

    // Draw rope as a curving quadratic bezier path when it gets slack
    engine.world.constraints.forEach(c => {
      if (c.isRope && c.stiffness === 0) {
        const pA = getConstraintWorldPoint(c.bodyA, c.pointA);
        const pB = getConstraintWorldPoint(c.bodyB, c.pointB);
        
        context.beginPath();
        context.moveTo(pA.x, pA.y);
        
        const midX = (pA.x + pB.x) / 2;
        const midY = (pA.y + pB.y) / 2;
        const dist = Matter.Vector.magnitude(Matter.Vector.sub(pA, pB));
        const slack = (c.maxLength || c.length) - dist;
        
        context.quadraticCurveTo(midX, midY + (slack * 1.5), pB.x, pB.y);
        context.strokeStyle = '#d97706';
        context.lineWidth = 3;
        context.stroke();
      }
    });

    if (pivotAnchorRef.current) {
      context.beginPath()
      context.arc(pivotAnchorRef.current.x, pivotAnchorRef.current.y, 6, 0, Math.PI * 2)
      context.fillStyle = '#facc15'
      context.fill()

      context.beginPath()
      context.moveTo(pivotAnchorRef.current.x, pivotAnchorRef.current.y)
      context.lineTo(mouseConstraint.mouse.position.x, mouseConstraint.mouse.position.y)
      context.setLineDash([6, 6])
      context.strokeStyle = '#facc15'
      context.lineWidth = 2
      context.stroke()
      context.setLineDash([])
    }

    if ((firstSelectedAnchorRef.current || firstSelectedBodyRef.current) && ['rope', 'spring', 'rod'].includes(activeToolRef.current)) {
      let startX, startY;
      
      if (firstSelectedAnchorRef.current) {
        startX = firstSelectedAnchorRef.current.x;
        startY = firstSelectedAnchorRef.current.y;
      } else {
        const body = firstSelectedBodyRef.current;
        const localPoint = firstSelectedPointRef.current || { x: 0, y: 0 };
        const worldPoint = Matter.Vector.add(body.position, Matter.Vector.rotate(localPoint, body.angle));
        startX = worldPoint.x;
        startY = worldPoint.y;
      }

      context.beginPath()
      context.arc(startX, startY, 5, 0, Math.PI * 2)
      context.fillStyle = '#ef4444' // Red indicator for placement anchor
      context.fill()

      context.beginPath()
      context.moveTo(startX, startY)
      context.lineTo(mouseConstraint.mouse.position.x, mouseConstraint.mouse.position.y)
      context.setLineDash([8, 5])
      context.strokeStyle = '#ef4444'
      context.lineWidth = 3
      context.stroke()
      context.setLineDash([])
    }

    // Draw HUD arrows for speed/gravity vectors if enabled
    const vs = vectorSettingsRef.current;
    if (vs?.velocity) {
      engine.world.bodies.forEach(body => {
        if (body.isStatic || body.id === 999) return;
        const velX = body.velocity.x;
        const velY = body.velocity.y;
        const speed = Math.hypot(velX, velY);
        
        if (speed > 0.5) {
          context.beginPath();
          context.moveTo(body.position.x, body.position.y);
          context.lineTo(body.position.x + velX * 5, body.position.y + velY * 5);
          context.strokeStyle = '#1e6fe8'; 
          context.lineWidth = 2;
          context.stroke();
          
          const angle = Math.atan2(velY, velX);
          context.beginPath();
          context.moveTo(body.position.x + velX * 5, body.position.y + velY * 5);
          context.lineTo(body.position.x + velX * 5 - 8 * Math.cos(angle - Math.PI/6), body.position.y + velY * 5 - 8 * Math.sin(angle - Math.PI/6));
          context.lineTo(body.position.x + velX * 5 - 8 * Math.cos(angle + Math.PI/6), body.position.y + velY * 5 - 8 * Math.sin(angle + Math.PI/6));
          context.lineTo(body.position.x + velX * 5, body.position.y + velY * 5);
          context.fillStyle = '#1e6fe8';
          context.fill();
        }
      });
    }
    
    if (vs?.gravity) {
      engine.world.bodies.forEach(body => {
        if (body.isStatic || body.id === 999) return;
        const gravY = engine.world.gravity.y * engine.world.gravity.scale * body.mass * 10000;
        
        if (gravY > 0.5) {
          context.beginPath();
          context.moveTo(body.position.x, body.position.y);
          context.lineTo(body.position.x, body.position.y + gravY);
          context.strokeStyle = '#9333ea';
          context.lineWidth = 2;
          context.stroke();
          
          context.beginPath();
          context.moveTo(body.position.x, body.position.y + gravY);
          context.lineTo(body.position.x - 5, body.position.y + gravY - 8);
          context.lineTo(body.position.x + 5, body.position.y + gravY - 8);
          context.lineTo(body.position.x, body.position.y + gravY);
          context.fillStyle = '#9333ea';
          context.fill();
        }
      });
    }
  }

  Matter.Events.on(engine, 'afterUpdate', onAfterUpdate)
  Matter.Events.on(engine, 'afterUpdate', onAnalyticsUpdate)
  Matter.Events.on(engine, 'beforeUpdate', onBeforeUpdate)
  Matter.Events.on(render, 'afterRender', onAfterRender)

  return () => {
    Matter.Events.off(engine, 'afterUpdate', onAfterUpdate)
    Matter.Events.off(engine, 'afterUpdate', onAnalyticsUpdate)
    Matter.Events.off(engine, 'beforeUpdate', onBeforeUpdate)
    Matter.Events.off(render, 'afterRender', onAfterRender)
  }
}
