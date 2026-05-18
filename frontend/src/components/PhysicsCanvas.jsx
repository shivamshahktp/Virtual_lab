import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import socket from '../socket'

const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Constraint, Query } = Matter

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Helper function to create a compound gear body
const createGear = (x, y, radius, teethCount, options) => {
  const parts = [];
  const renderOpts = options && options.render ? options.render : { fillStyle: '#94a3b8', strokeStyle: '#475569', lineWidth: 2 };

  // Core circle
  parts.push(Bodies.circle(x, y, radius, { render: renderOpts }));

  // Teeth
  const toothWidth = (radius * Math.PI * 2) / teethCount * 0.4;
  const toothHeight = radius * 0.4;

  for (let i = 0; i < teethCount; i++) {
    const angle = (Math.PI * 2 / teethCount) * i;
    const tx = x + Math.cos(angle) * radius;
    const ty = y + Math.sin(angle) * radius;

    parts.push(Bodies.rectangle(tx, ty, toothHeight, toothWidth, { angle: angle, render: renderOpts }));
  }

  return Matter.Body.create({ parts: parts, ...options });
};

const getBodyDimensions = (body) => {
  if (body.circleRadius) {
    return { radius: body.circleRadius }
  }

  return {
    width: body.bounds.max.x - body.bounds.min.x,
    height: body.bounds.max.y - body.bounds.min.y,
  }
}

const getConstraintType = (constraint) => {
  if (constraint.length === 0) return 'pivot'
  if (constraint.isRope) return 'rope'
  if (constraint.stiffness === 1) return 'rod'
  return 'spring'
}

const getConstraintStrokeStyle = (type, isSelected = false) => {
  if (type === 'pivot') {
    return {
      strokeStyle: isSelected ? '#fcd34d' : '#f59e0b',
      lineWidth: isSelected ? 5 : 4,
    }
  }

  if (type === 'rod') {
    return {
      strokeStyle: isSelected ? '#38bdf8' : '#94a3b8',
      lineWidth: isSelected ? 7 : 5,
    }
  }

  if (type === 'rope') {
    return {
      strokeStyle: isSelected ? '#facc15' : '#d97706',
      lineWidth: isSelected ? 5 : 3,
    }
  }

  return {
    strokeStyle: isSelected ? '#f87171' : '#ef4444',
    lineWidth: isSelected ? 5 : 3,
  }
}

const applyConstraintRender = (constraint, isSelected = false) => {
  const type = getConstraintType(constraint)
  if (constraint.render?.visible === false && type === 'pivot') return
  Object.assign(constraint.render, getConstraintStrokeStyle(type, isSelected))
}

const getConstraintWorldPoint = (body, point) => {
  if (body) {
    return Matter.Vector.add(body.position, point || { x: 0, y: 0 })
  }

  return point || { x: 0, y: 0 }
}

const getDistanceToSegment = (point, start, end) => {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy))
  )

  const projection = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  }

  return Math.hypot(point.x - projection.x, point.y - projection.y)
}

const resetBodyHighlight = (body) => {
  if (!body?.render) return
  body.render.lineWidth = 1.5
  // Restore appropriate stroke for each body color
  if (body.render.fillStyle === '#6366f1') body.render.strokeStyle = '#4f46e5'
  else if (body.render.fillStyle === '#22c55e') body.render.strokeStyle = '#16a34a'
  else if (body.render.fillStyle === '#eab308') body.render.strokeStyle = '#ca8a04'
  else if (body.render.fillStyle === '#94a3b8') body.render.strokeStyle = '#64748b'
  else body.render.strokeStyle = '#94a3b8'
}

export default function PhysicsCanvas({ roomId, activeTool, material, isPaused, vectorSettings, simSpeed }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const runnerRef = useRef(null)
  const renderRef = useRef(null)

  // Use a ref for activeTool so we don't have to restart the physics engine every time the tool changes
  const activeToolRef = useRef(activeTool)
  // Ref to track the first body selected for constraints like Spring
  const firstSelectedBodyRef = useRef(null)
  // Ref to track the local point on the first body where the user clicked
  const firstSelectedPointRef = useRef(null)
  const firstSelectedAnchorRef = useRef(null)
  // Ref for the currently selected body for telemetry
  const selectedBodyRef = useRef(null)
  const selectedConstraintRef = useRef(null)
  const pivotAnchorRef = useRef(null)
  // Ref for material settings
  const materialRef = useRef(material || { restitution: 0.6, friction: 0.1, density: 0.001 })
  const vectorSettingsRef = useRef(vectorSettings || {})
  const simSpeedRef = useRef(simSpeed || 1)

  useEffect(() => {
    vectorSettingsRef.current = vectorSettings || {}
    if (renderRef.current) {
      renderRef.current.options.wireframes = vectorSettingsRef.current.wireframes || false
    }
  }, [vectorSettings])

  useEffect(() => {
    simSpeedRef.current = simSpeed || 1
    if (engineRef.current) {
      engineRef.current.timing.timeScale = simSpeed || 1
    }
  }, [simSpeed])

  useEffect(() => {
    activeToolRef.current = activeTool

    // Clear selection state if we switch tools to avoid weird behavior
    if (firstSelectedBodyRef.current) {
      resetBodyHighlight(firstSelectedBodyRef.current)
      firstSelectedBodyRef.current = null
      firstSelectedPointRef.current = null
    }

    firstSelectedAnchorRef.current = null
    pivotAnchorRef.current = null

    if (selectedBodyRef.current && activeTool !== 'cursor') {
      resetBodyHighlight(selectedBodyRef.current)
      selectedBodyRef.current = null
    }

    if (selectedConstraintRef.current && activeTool !== 'cursor') {
      applyConstraintRender(selectedConstraintRef.current, false)
      selectedConstraintRef.current = null
      window.dispatchEvent(new CustomEvent('constraint-selection-change', { detail: {} }))
    }
  }, [activeTool])

  useEffect(() => {
    materialRef.current = material || { restitution: 0.6, friction: 0.1, density: 0.001 }
  }, [material])

  useEffect(() => {
    const constraint = selectedConstraintRef.current
    if (!constraint) return

    const type = getConstraintType(constraint)
    if (!['rope', 'spring', 'rod'].includes(type)) return

    const nextLength = material?.ropeLength
    if (typeof nextLength !== 'number' || Number.isNaN(nextLength)) return

    constraint.length = nextLength
    if (type === 'rope') {
      constraint.maxLength = nextLength
    }

    socket.emit('update-constraint', {
      roomId,
      constraint: {
        id: constraint.id,
        length: nextLength,
        maxLength: type === 'rope' ? nextLength : constraint.maxLength,
      },
    })
  }, [material?.ropeLength, roomId])

  useEffect(() => {
    const selectedBody = selectedBodyRef.current
    if (!selectedBody || selectedBody.id === 999) return

    if (typeof material?.restitution === 'number') {
      selectedBody.restitution = material.restitution
    }

    if (typeof material?.friction === 'number') {
      selectedBody.friction = material.friction
    }

    if (
      typeof material?.density === 'number' &&
      !Number.isNaN(material.density) &&
      !selectedBody.isStatic
    ) {
      Matter.Body.setDensity(selectedBody, material.density)
    }

    socket.emit('update-body-properties', {
      roomId,
      body: {
        id: selectedBody.id,
        restitution: selectedBody.restitution,
        friction: selectedBody.friction,
        density: selectedBody.density,
      },
    })
  }, [material?.restitution, material?.friction, material?.density, roomId])

  useEffect(() => {
    if (runnerRef.current) {
      runnerRef.current.enabled = !isPaused;
    }
  }, [isPaused])

  useEffect(() => {
    // 0. Patch Matter.js Constraint solver to natively support slack ropes!
    if (!Matter.Constraint._originalSolve) {
      Matter.Constraint._originalSolve = Matter.Constraint.solve;
      Matter.Constraint.solve = function(constraint, timeScale) {
        if (constraint.isRope) {
          let pA = constraint.pointA;
          let pB = constraint.pointB;
          if (constraint.bodyA) pA = Matter.Vector.add(constraint.bodyA.position, pA);
          if (constraint.bodyB) pB = Matter.Vector.add(constraint.bodyB.position, pB);
          
          if (pA && pB) {
            const dist = Matter.Vector.magnitude(Matter.Vector.sub(pA, pB));
            if (dist < (constraint.maxLength || constraint.length) * 0.99) {
              constraint.stiffness = 0; // Go slack (applies 0 pushing force)
              constraint.render.visible = false; // Hide straight line
            } else {
              constraint.stiffness = 1; // Pull tight
              constraint.render.visible = true;
            }
          }
        }
        Matter.Constraint._originalSolve(constraint, timeScale);
      };
    }

    // 1. Create the physics engine
    const engine = Engine.create()
    engineRef.current = engine

    // 2. Get actual container dimensions
    const rect = canvasRef.current.getBoundingClientRect()
    const canvasWidth = rect.width || window.innerWidth
    const canvasHeight = rect.height || (window.innerHeight - 48)

    // 3. Create the renderer (transparent so CSS grid background shows through)
    const render = Render.create({
      element: canvasRef.current,
      engine: engine,
      options: {
        width: canvasWidth,
        height: canvasHeight,
        wireframes: vectorSettingsRef.current?.wireframes || false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio || 1,
      },
    })
    renderRef.current = render

    const width = canvasWidth
    const height = canvasHeight

    // 4. Create initial bodies (Load from MongoDB if available)
    const ground = Bodies.rectangle(width / 2, height - 25, width, 50, {
      id: 999,
      isStatic: true,
      restitution: 0.8,
      render: { fillStyle: '#e2e8f0', strokeStyle: '#cbd5e0', lineWidth: 1 },
    })

    // 5. Add mouse drag support
    const mouse = Mouse.create(render.canvas)

    // Fix High-DPI (Retina) screen mouse drag offset issue
    // Matter.js auto-computes scale from canvas.width / canvas.clientWidth, which equals devicePixelRatio
    // on Retina displays. But since the physics world uses CSS pixel coordinates (same as mouse event
    // coordinates), we need a 1:1 mapping. Override to prevent the pixelRatio from doubling coordinates.
    Mouse.setScale(mouse, { x: 1, y: 1 })

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    })
    render.mouse = mouse

    // Add ground and mouse first
    Composite.add(engine.world, [ground, mouseConstraint])

    // --- ACTION HISTORY FOR UNDO ---
    const actionHistory = [];

    const clearPendingSelections = () => {
      if (firstSelectedBodyRef.current) {
        resetBodyHighlight(firstSelectedBodyRef.current)
        firstSelectedBodyRef.current = null
      }

      firstSelectedPointRef.current = null
      firstSelectedAnchorRef.current = null
      pivotAnchorRef.current = null
    }

    const clearSelectedBody = () => {
      if (selectedBodyRef.current) {
        resetBodyHighlight(selectedBodyRef.current)
        selectedBodyRef.current = null
      }
      window.dispatchEvent(new CustomEvent('body-selection-change', { detail: null }))
    }

    const clearSelectedConstraint = () => {
      if (selectedConstraintRef.current) {
        applyConstraintRender(selectedConstraintRef.current, false)
        selectedConstraintRef.current = null
      }
      window.dispatchEvent(new CustomEvent('constraint-selection-change', { detail: {} }))
    }

    const selectConstraint = (constraint) => {
      clearSelectedBody()
      if (selectedConstraintRef.current && selectedConstraintRef.current.id !== constraint.id) {
        applyConstraintRender(selectedConstraintRef.current, false)
      }

      selectedConstraintRef.current = constraint
      applyConstraintRender(constraint, true)
      window.dispatchEvent(
        new CustomEvent('constraint-selection-change', {
          detail: {
            type: getConstraintType(constraint),
            length: constraint.maxLength || constraint.length,
          },
        })
      )
    }

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

    const deleteSelectedConstraint = () => {
      if (!selectedConstraintRef.current) return false

      const constraintId = selectedConstraintRef.current.id
      Composite.remove(engine.world, selectedConstraintRef.current)
      clearSelectedConstraint()
      socket.emit('remove-constraint', { roomId, id: constraintId })
      return true
    }

    const deleteSelectedBody = () => {
      if (!selectedBodyRef.current) return false

      const bodyId = selectedBodyRef.current.id
      const attachedConstraints = engine.world.constraints.filter(
        (constraint) => constraint.bodyA?.id === bodyId || constraint.bodyB?.id === bodyId
      )

      if (selectedConstraintRef.current && attachedConstraints.some((c) => c.id === selectedConstraintRef.current.id)) {
        clearSelectedConstraint()
      }

      Composite.remove(engine.world, attachedConstraints)
      attachedConstraints.forEach((constraint) => {
        socket.emit('remove-constraint', { roomId, id: constraint.id })
      })

      Composite.remove(engine.world, selectedBodyRef.current)
      clearSelectedBody()

      if (firstSelectedBodyRef.current?.id === bodyId) {
        clearPendingSelections()
      }

      socket.emit('remove-body', { roomId, id: bodyId })
      return true
    }

    // --- KEYBOARD LISTENER FOR UNDO ---
    const handleKeyDown = (e) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        if (deleteSelectedBody()) return
        deleteSelectedConstraint()
        return
      }

      // Check for Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        
        // Clear active selections
        clearPendingSelections()
        clearSelectedBody()
        clearSelectedConstraint()

        if (actionHistory.length > 0) {
          const lastAction = actionHistory.pop();
          
          if (lastAction.type === 'body') {
            const bodyToRemove = engine.world.bodies.find(b => b.id === lastAction.id);
            if (bodyToRemove) {
              Composite.remove(engine.world, bodyToRemove);
              socket.emit('remove-body', { roomId, id: lastAction.id });
              
              // Constraints attached to this body must also be removed
              const constraintsToRemove = engine.world.constraints.filter(c => c.bodyA?.id === lastAction.id || c.bodyB?.id === lastAction.id);
              Composite.remove(engine.world, constraintsToRemove);
              constraintsToRemove.forEach(c => socket.emit('remove-constraint', { roomId, id: c.id }));
            }
          } else if (lastAction.type === 'constraint') {
            const constraintToRemove = engine.world.constraints.find(c => c.id === lastAction.id);
            if (constraintToRemove) {
              Composite.remove(engine.world, constraintToRemove);
              socket.emit('remove-constraint', { roomId, id: lastAction.id });
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 6. Custom drag logic for static bodies and pinned gears
    let customDragBody = null;

    Matter.Events.on(mouseConstraint, 'mousedown', (event) => {
      if (activeToolRef.current !== 'cursor') return;
      const bodies = Query.point(engine.world.bodies, event.mouse.position);
      const body = bodies.length > 0 ? bodies[0] : null;
      if (body && body.isStatic && body.id !== 999) {
        customDragBody = body;
      }
    });

    Matter.Events.on(mouseConstraint, 'mousemove', (event) => {
      if (customDragBody) {
        Matter.Body.setPosition(customDragBody, event.mouse.position);

        // Move any background pivots attached to this static body so they drag along
        const pivots = engine.world.constraints.filter(c => c.bodyA === customDragBody && !c.bodyB);
        pivots.forEach(pivot => {
          const worldPointA = { x: customDragBody.position.x + pivot.pointA.x, y: customDragBody.position.y + pivot.pointA.y };
          pivot.pointB = { x: worldPointA.x, y: worldPointA.y };
        });
      }
    });

    Matter.Events.on(mouseConstraint, 'mouseup', (event) => {
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
        customDragBody = null;
      }
    });

    Matter.Events.on(engine, 'beforeUpdate', () => {
      if (mouseConstraint.body) {
        const body = mouseConstraint.body;
        // Move any background pivots attached to this dynamic body so they drag along
        const pivots = engine.world.constraints.filter(c => c.bodyA === body && !c.bodyB);
        pivots.forEach(pivot => {
          const worldPointA = { x: body.position.x + pivot.pointA.x, y: body.position.y + pivot.pointA.y };
          pivot.pointB = { x: worldPointA.x, y: worldPointA.y };
        });
      }
    });

    // Fetch saved state from MongoDB
    fetch(`${API_URL}/api/rooms/${roomId}`)
      .then(res => res.json())
      .then(roomData => {
        if (roomData && roomData.bodies && roomData.bodies.length > 0) {
          // Reconstruct bodies from database
          const loadedBodies = roomData.bodies.map(b => {
            let newBody;
            const opts = b.options || {};
            const dimensions = b.dimensions || {};
            if (b.type === 'motor') {
              if (opts.motorType === 'gear') {
                newBody = createGear(b.x, b.y, opts.gearRadius || 40, opts.gearTeeth || 12, {
                  id: b.id, isStatic: opts.isMotorized ?? true, angle: b.angle,
                  friction: 0.1, restitution: 0.2,
                  render: { fillStyle: '#94a3b8', strokeStyle: '#475569', lineWidth: 2 }
                });
                newBody.isMotor = opts.isMotorized ?? true;
                newBody.motorSpeed = opts.motorSpeed || 0.05;
                newBody.motorDirection = opts.motorDirection || 'clockwise';
                newBody.motorType = 'gear';
                newBody.gearRadius = opts.gearRadius || 40;
                newBody.gearTeeth = opts.gearTeeth || 12;
              } else {
                newBody = Bodies.rectangle(b.x, b.y, dimensions.width || 150, dimensions.height || 20, {
                  id: b.id, isStatic: opts.isMotorized ?? true, angle: b.angle,
                  render: { fillStyle: '#eab308', strokeStyle: '#ca8a04', lineWidth: 2 }
                });
                newBody.isMotor = opts.isMotorized ?? true;
                newBody.motorSpeed = opts.motorSpeed || 0.05;
                newBody.motorDirection = opts.motorDirection || 'clockwise';
                newBody.motorType = 'rod';
              }
            } else if (b.type === 'circle') {
              newBody = Bodies.circle(b.x, b.y, dimensions.radius || 40, {
                id: b.id, angle: b.angle, velocity: b.velocity, angularVelocity: b.angularVelocity,
                restitution: opts.restitution ?? 0.8, friction: opts.friction ?? 0.1, density: opts.density ?? 0.001,
                render: { fillStyle: '#22c55e', strokeStyle: '#4ade80', lineWidth: 2 }
              });
              Matter.Body.setVelocity(newBody, b.velocity || { x: 0, y: 0 });
            } else {
              newBody = Bodies.rectangle(b.x, b.y, dimensions.width || 80, dimensions.height || 80, {
                id: b.id, angle: b.angle, velocity: b.velocity, angularVelocity: b.angularVelocity,
                restitution: opts.restitution ?? 0.6, friction: opts.friction ?? 0.1, density: opts.density ?? 0.001,
                render: { fillStyle: '#6366f1', strokeStyle: '#818cf8', lineWidth: 2 }
              });
              Matter.Body.setVelocity(newBody, b.velocity || { x: 0, y: 0 });
            }
            return newBody;
          });

          Composite.add(engine.world, loadedBodies);

          // Reconstruct constraints
          if (roomData.constraints) {
            roomData.constraints.forEach(c => {
              const bodyA = Composite.get(engine.world, c.bodyAId, 'body');
              if (c.type === 'pivot' && bodyA) {
                const pivot = Constraint.create({
                  id: c.id, bodyA: bodyA, 
                  pointA: c.pointA || { x: 0, y: 0 },
                  pointB: { x: c.x, y: c.y }, stiffness: 1, length: 0,
                  render: c.hidden ? { visible: false } : { strokeStyle: '#f59e0b', lineWidth: 4 }
                });
                Composite.add(engine.world, pivot);
              } else if (c.type === 'spring' || c.type === 'rod' || c.type === 'rope') {
                const bodyB = Composite.get(engine.world, c.bodyBId, 'body');
                if ((bodyA || c.pointA) && bodyB) {
                  const newConstraint = Constraint.create({
                    id: c.id, bodyA: bodyA, bodyB: bodyB, 
                    pointA: c.pointA || { x: 0, y: 0 },
                    pointB: c.pointB || { x: 0, y: 0 },
                    stiffness: c.stiffness || 0.05,
                    length: c.length,
                    isRope: c.type === 'rope' || c.isRope,
                    maxLength: c.maxLength,
                    render: c.type === 'rod' ? { strokeStyle: '#94a3b8', lineWidth: 5 } : c.type === 'rope' ? { strokeStyle: '#d97706', lineWidth: 3 } : { strokeStyle: '#ef4444', lineWidth: 3 }
                  });
                  Composite.add(engine.world, newConstraint);
                }
              }
            });
          }
        } else {
          // Default starting bodies if empty
          const box = Bodies.rectangle(width / 2, 100, 80, 80, {
            id: 1, restitution: 0.6,
            render: { fillStyle: '#6366f1', strokeStyle: '#4f46e5', lineWidth: 1.5 },
          });
          const circle = Bodies.circle(width / 2 - 120, 50, 40, {
            id: 2, restitution: 0.8,
            render: { fillStyle: '#22c55e', strokeStyle: '#16a34a', lineWidth: 1.5 },
          });
          Composite.add(engine.world, [box, circle]);
        }
      })
      .catch(err => console.error("Failed to load room from DB:", err));

    // 7. Run engine + renderer
    const runner = Runner.create()
    runnerRef.current = runner
    runner.enabled = !isPaused // Set initial paused state
    Runner.run(runner, engine)
    Render.run(render)

    // --- Vector Visualization Hook ---
    Matter.Events.on(render, 'afterRender', () => {
      const context = render.context;
      if (!context) return;
      
      const vs = vectorSettingsRef.current;
      
      if (vs.velocity) {
        engine.world.bodies.forEach(body => {
          if (body.isStatic || body.id === 999) return;
          const velX = body.velocity.x;
          const velY = body.velocity.y;
          const speed = Math.hypot(velX, velY);
          
          if (speed > 0.5) {
            context.beginPath();
            context.moveTo(body.position.x, body.position.y);
            context.lineTo(body.position.x + velX * 5, body.position.y + velY * 5);
            context.strokeStyle = '#1e6fe8'; // Blue
            context.lineWidth = 2;
            context.stroke();
            
            // Draw arrow head
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
      
      if (vs.gravity) {
        engine.world.bodies.forEach(body => {
          if (body.isStatic || body.id === 999) return;
          // Scale mass for visual purposes so it's visible but not huge
          const gravY = engine.world.gravity.y * engine.world.gravity.scale * body.mass * 10000;
          
          if (gravY > 0.5) {
            context.beginPath();
            context.moveTo(body.position.x, body.position.y);
            context.lineTo(body.position.x, body.position.y + gravY);
            context.strokeStyle = '#9333ea'; // Purple
            context.lineWidth = 2;
            context.stroke();
            
            // Draw arrow head
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
    });

    // --- I. DB Save Hook ---
    const handleSave = async () => {
      // Serialize dynamic bodies and motors
      const bodiesToSave = engine.world.bodies
        .filter(b => (!b.isStatic || b.isMotor) && b.id !== 999)
        .map(b => ({
          id: b.id,
          type: b.motorType ? 'motor' : (b.circleRadius ? 'circle' : 'box'),
          x: b.position.x,
          y: b.position.y,
          angle: b.angle,
          velocity: b.velocity,
          angularVelocity: b.angularVelocity,
          dimensions: getBodyDimensions(b),
          options: b.motorType ? {
            motorType: b.motorType,
            gearRadius: b.gearRadius,
            gearTeeth: b.gearTeeth,
            isMotorized: b.isMotor,
            motorSpeed: b.motorSpeed,
            motorDirection: b.motorDirection
          } : { restitution: b.restitution, friction: b.friction, density: b.density }
        }));

      // Serialize constraints (ignoring mouse constraint)
      const constraintsToSave = engine.world.constraints
        .filter(c => c.label !== 'Mouse Constraint')
        .map(c => ({
          id: c.id,
          type: c.length === 0 ? 'pivot' : (c.isRope ? 'rope' : (c.stiffness === 1 ? 'rod' : 'spring')),
          bodyAId: c.bodyA?.id,
          bodyBId: c.bodyB?.id,
          x: c.pointB?.x,
          y: c.pointB?.y,
          pointA: c.pointA,
          pointB: c.pointB,
          stiffness: c.stiffness,
          length: c.length,
          isRope: c.isRope,
          maxLength: c.maxLength,
          hidden: c.render?.visible === false
        }));

      try {
        const res = await fetch(`${API_URL}/api/rooms/${roomId}/save`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bodies: bodiesToSave, constraints: constraintsToSave })
        });
        if (res.ok) alert('✅ Simulation saved securely to MongoDB Database!');
        else alert('❌ Failed to save simulation.');
      } catch (err) {
        console.error(err);
        alert('❌ Error saving simulation. Is backend running?');
      }
    };
    window.addEventListener('trigger-save', handleSave);

    // --- J. Clear Canvas Hook ---
    const handleClear = () => {
      // Find bodies and constraints to remove
      // We keep the ground (id: 999) and the mouse constraint
      const bodiesToRemove = engine.world.bodies.filter(b => b.id !== 999)
      const constraintsToRemove = engine.world.constraints.filter(c => c.label !== 'Mouse Constraint')

      Composite.remove(engine.world, bodiesToRemove)
      Composite.remove(engine.world, constraintsToRemove)

      clearSelectedBody()
      clearSelectedConstraint()
      clearPendingSelections()

      // Notify other users
      socket.emit('clear-canvas', { roomId })
    };
    window.addEventListener('trigger-clear', handleClear);

    const handleDeleteSelected = () => {
      if (deleteSelectedBody()) return
      deleteSelectedConstraint()
    }
    window.addEventListener('trigger-delete-selected', handleDeleteSelected)

    // --- REAL-TIME MULTIPLAYER SYNC ---

    // Flag to prevent infinite broadcast loops
    let isApplyingRemoteUpdate = false

    // A. Receive updates from other users
    const onPhysicsUpdate = (data) => {
      isApplyingRemoteUpdate = true
      data.bodies.forEach((remoteBody) => {
        // Find the local body by ID
        const localBody = Composite.get(engine.world, remoteBody.id, 'body')
        if (localBody && localBody.id !== 999) {
          // Force set the local body's state to match the remote state
          Matter.Body.setPosition(localBody, remoteBody.position)
          Matter.Body.setAngle(localBody, remoteBody.angle)
          Matter.Body.setVelocity(localBody, remoteBody.velocity)
          Matter.Body.setAngularVelocity(localBody, remoteBody.angularVelocity)

          // Move the pivot constraint to match if it's a pinned gear
          const pivot = engine.world.constraints.find(c => c.bodyA === localBody && !c.bodyB && c.length === 0)
          if (pivot) {
            pivot.pointB = { x: remoteBody.position.x, y: remoteBody.position.y }
          }
        }
      })
      isApplyingRemoteUpdate = false
    }

    socket.on('physics-update', onPhysicsUpdate)

    // B. Broadcast our local state to other users
    let lastBroadcast = 0
    Matter.Events.on(engine, 'afterUpdate', () => {
      // Don't broadcast if we are currently applying a remote update
      if (isApplyingRemoteUpdate) return

      const now = Date.now()
      // Throttle broadcasts to ~20 times per second (50ms) to save bandwidth
      if (now - lastBroadcast > 50) {
        const dynamicBodies = engine.world.bodies.filter(b => (!b.isStatic || b === customDragBody) && b.id !== 999)

        // Only extract the essential physics data
        const bodiesData = dynamicBodies.map(b => ({
          id: b.id,
          position: b.position,
          angle: b.angle,
          velocity: b.velocity,
          angularVelocity: b.angularVelocity
        }))

        // Send to backend
        socket.emit('physics-update', { roomId, bodies: bodiesData })
        lastBroadcast = now
      }
    })

    // F. Run the motors and update constraints every frame
    Matter.Events.on(engine, 'beforeUpdate', () => {
      // 1. Manually rotate constraints for STATIC bodies (Matter.js skips this by default)
      engine.world.constraints.forEach(c => {
        if (c.bodyA && c.bodyA.isStatic && c.angleA !== undefined) {
            Matter.Vector.rotate(c.pointA, c.bodyA.angle - c.angleA, c.pointA);
            c.angleA = c.bodyA.angle;
        }
        if (c.bodyB && c.bodyB.isStatic && c.angleB !== undefined) {
            Matter.Vector.rotate(c.pointB, c.bodyB.angle - c.angleB, c.pointB);
            c.angleB = c.bodyB.angle;
        }
      });

      // 3. Drive motors
      engine.world.bodies.forEach(body => {
        if (body.isMotor && body.isStatic) {
          const speed = body.motorSpeed || 0.05;
          const direction = body.motorDirection === 'anticlockwise' ? -1 : 1;
          Matter.Body.setAngle(body, body.angle + (speed * direction));
        }
      })
    })

    // G. Emit live analytics data to the React UI
    let lastTime = performance.now()
    Matter.Events.on(engine, 'afterUpdate', () => {
      const now = performance.now()
      const fps = Math.round(1000 / (now - lastTime))
      lastTime = now

      let telemetry = null
      if (selectedBodyRef.current) {
        const body = selectedBodyRef.current
        telemetry = {
          speed: body.speed.toFixed(1),
          energy: (0.5 * body.mass * Math.pow(body.speed, 2)).toFixed(1)
        }
      }

      window.dispatchEvent(new CustomEvent('physics-metrics', {
        detail: {
          fps: isNaN(fps) ? 0 : Math.min(fps, 60), // Cap at 60 for clean UI
          bodies: engine.world.bodies.length,
          telemetry
        }
      }))
    })

    // H. Draw Velocity Vector for selected body
    Matter.Events.on(render, 'afterRender', () => {
      const context = render.context
      const selectedBody = selectedBodyRef.current

      // Only draw if body is moving fast enough
      if (selectedBody && selectedBody.speed > 0.5) {
        const startX = selectedBody.position.x
        const startY = selectedBody.position.y

        // Scale the vector length based on speed
        const scale = 5
        const endX = startX + selectedBody.velocity.x * scale
        const endY = startY + selectedBody.velocity.y * scale

        // Draw main line
        context.beginPath()
        context.moveTo(startX, startY)
        context.lineTo(endX, endY)
        context.strokeStyle = '#ef4444' // Red line
        context.lineWidth = 3
        context.stroke()

        // Draw arrow head
        const angle = Math.atan2(endY - startY, endX - startX)
        const headlen = 10
        context.beginPath()
        context.moveTo(endX, endY)
        context.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6))
        context.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6))
        context.fillStyle = '#ef4444'
        context.fill()
      }

      // Draw custom slack ropes
      engine.world.constraints.forEach(c => {
        if (c.isRope && c.stiffness === 0) {
          const pA = c.bodyA ? Matter.Vector.add(c.bodyA.position, c.pointA) : c.pointA;
          const pB = c.bodyB ? Matter.Vector.add(c.bodyB.position, c.pointB) : c.pointB;
          
          context.beginPath();
          context.moveTo(pA.x, pA.y);
          
          // Draw a hanging bezier curve based on how much slack there is
          const midX = (pA.x + pB.x) / 2;
          const midY = (pA.y + pB.y) / 2;
          const dist = Matter.Vector.magnitude(Matter.Vector.sub(pA, pB));
          const slack = (c.maxLength || c.length) - dist;
          
          // Pull control point down by slack amount (gravity effect)
          context.quadraticCurveTo(midX, midY + (slack * 1.5), pB.x, pB.y);
          context.strokeStyle = '#d97706'; // rope color
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
        context.lineTo(mouse.position.x, mouse.position.y)
        context.setLineDash([6, 6])
        context.strokeStyle = '#facc15'
        context.lineWidth = 2
        context.stroke()
        context.setLineDash([])
      }

      if (firstSelectedAnchorRef.current && ['rope', 'spring', 'rod'].includes(activeToolRef.current)) {
        const style = getConstraintStrokeStyle(activeToolRef.current)
        context.beginPath()
        context.arc(firstSelectedAnchorRef.current.x, firstSelectedAnchorRef.current.y, 5, 0, Math.PI * 2)
        context.fillStyle = style.strokeStyle
        context.fill()

        context.beginPath()
        context.moveTo(firstSelectedAnchorRef.current.x, firstSelectedAnchorRef.current.y)
        context.lineTo(mouse.position.x, mouse.position.y)
        context.setLineDash([8, 5])
        context.strokeStyle = style.strokeStyle
        context.lineWidth = style.lineWidth
        context.stroke()
        context.setLineDash([])
      }
    })

    // C. Handle Click-to-Place (Spawning bodies and constraints)
    const handleCanvasClick = (e) => {
      const currentTool = activeToolRef.current

      const rect = render.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Check if we clicked on an existing body
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
          clickedBody.render.strokeStyle = '#1e6fe8' // Selection highlight (scientific blue)
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
        return // Let MouseConstraint handle the actual dragging
      }

      clearSelectedBody()
      clearSelectedConstraint()

      const bodyId = Math.floor(Math.random() * 10000000) // Random unique ID
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
        actionHistory.push({ type: 'body', id: bodyId })
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
        actionHistory.push({ type: 'body', id: bodyId })
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
        actionHistory.push({ type: 'body', id: bodyId })

        // Pin dynamic gears to the background so they spin in place instead of falling
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
          actionHistory.push({ type: 'constraint', id: bodyId + 1 });

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
          actionHistory.push({ type: 'constraint', id: bodyId })
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
            firstSelectedPointRef.current = { x: 0, y: 0 }

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
        const anchorOrBodyPosition = firstSelectedAnchorRef.current || firstSelectedBodyRef.current.position
        const defaultDistance = Matter.Vector.magnitude(
          Matter.Vector.sub(anchorOrBodyPosition, validBody.position)
        )
        const length =
          typeof currentMaterial.ropeLength === 'number'
            ? currentMaterial.ropeLength
            : defaultDistance

        const newConstraint = Constraint.create({
          id: bodyId,
          bodyA: firstSelectedBodyRef.current || undefined,
          pointA: firstSelectedBodyRef.current ? { x: 0, y: 0 } : { ...firstSelectedAnchorRef.current },
          bodyB: validBody,
          pointB: { x: 0, y: 0 },
          stiffness: type === 'rod' ? 1 : type === 'rope' ? 1 : currentMaterial.springStiffness || 0.05,
          length,
          isRope: type === 'rope',
          maxLength: type === 'rope' ? length : undefined,
          render: renderOpts,
        })

        Composite.add(engine.world, newConstraint)
        actionHistory.push({ type: 'constraint', id: bodyId })
        socket.emit('add-constraint', {
          roomId,
          constraint: {
            id: bodyId,
            type,
            bodyAId: firstSelectedBodyRef.current?.id,
            bodyBId: validBody.id,
            pointA: firstSelectedBodyRef.current
              ? { x: 0, y: 0 }
              : { ...firstSelectedAnchorRef.current },
            pointB: { x: 0, y: 0 },
            stiffness: newConstraint.stiffness,
            length,
            isRope: type === 'rope',
            maxLength: type === 'rope' ? length : undefined,
          }
        })
        clearPendingSelections()
      }
    }

    // We attach the listener to the wrapper div to ensure it captures clicks
    const canvasContainer = canvasRef.current
    canvasContainer.addEventListener('mousedown', handleCanvasClick)

    // D. Receive new bodies spawned by other users
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
    socket.on('add-body', onAddBody)

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
    }
    socket.on('update-body-properties', onUpdateBodyProperties)

    // E. Receive constraints added by other users
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
    socket.on('add-constraint', onAddConstraint)

    const onUpdateConstraint = (data) => {
      const targetConstraint = engine.world.constraints.find((constraint) => constraint.id === data.constraint.id)
      if (!targetConstraint) return

      if (typeof data.constraint.length === 'number') {
        targetConstraint.length = data.constraint.length
      }

      if (typeof data.constraint.maxLength === 'number') {
        targetConstraint.maxLength = data.constraint.maxLength
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
    socket.on('update-constraint', onUpdateConstraint)

    // K. Receive clear canvas event from other users
    const onClearCanvas = () => {
      const bodiesToRemove = engine.world.bodies.filter(b => b.id !== 999)
      const constraintsToRemove = engine.world.constraints.filter(c => c.label !== 'Mouse Constraint')
      Composite.remove(engine.world, bodiesToRemove)
      Composite.remove(engine.world, constraintsToRemove)
      clearSelectedBody()
      clearSelectedConstraint()
      clearPendingSelections()
    }
    socket.on('clear-canvas', onClearCanvas)

    // L. Receive remove events (Undo) from other users
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
    socket.on('remove-body', onRemoveBody)

    const onRemoveConstraint = (data) => {
      const constraintToRemove = engine.world.constraints.find(c => c.id === data.id)
      if (constraintToRemove) {
        if (selectedConstraintRef.current?.id === data.id) {
          clearSelectedConstraint()
        }
        Composite.remove(engine.world, constraintToRemove)
      }
    }
    socket.on('remove-constraint', onRemoveConstraint)

    // 8. Handle window resize
    const handleResize = () => {
      const w = canvasRef.current.clientWidth
      const h = canvasRef.current.clientHeight
      const pr = window.devicePixelRatio || 1

      render.canvas.width = w * pr
      render.canvas.height = h * pr
      render.canvas.style.width = `${w}px`
      render.canvas.style.height = `${h}px`
      render.options.width = w
      render.options.height = h
      render.options.pixelRatio = pr

      // Matter.js recomputes mouse.scale from canvas.width / canvas.clientWidth
      // (= devicePixelRatio) after the canvas is resized, which breaks object
      // pickup on non-Retina screens. Re-apply the 1:1 override every time.
      Mouse.setScale(mouse, { x: 1, y: 1 })
    }
    window.addEventListener('resize', handleResize)

    // 9. Cleanup on unmount
    return () => {
      socket.off('physics-update', onPhysicsUpdate)
      socket.off('add-body', onAddBody)
      socket.off('update-body-properties', onUpdateBodyProperties)
      socket.off('add-constraint', onAddConstraint)
      socket.off('update-constraint', onUpdateConstraint)
      socket.off('clear-canvas', onClearCanvas)
      socket.off('remove-body', onRemoveBody)
      socket.off('remove-constraint', onRemoveConstraint)
      canvasContainer.removeEventListener('mousedown', handleCanvasClick)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('trigger-save', handleSave)
      window.removeEventListener('trigger-clear', handleClear)
      window.removeEventListener('trigger-delete-selected', handleDeleteSelected)
      Render.stop(render)
      Runner.stop(runner)
      Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [roomId])

  return (
    <div
      ref={canvasRef}
      id="physics-canvas"
      className="w-full h-full"
    />
  )
}
