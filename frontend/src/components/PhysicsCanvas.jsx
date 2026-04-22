import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import socket from '../socket'

const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Constraint, Query } = Matter

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

export default function PhysicsCanvas({ roomId, activeTool, material, isPaused }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const runnerRef = useRef(null)

  // Use a ref for activeTool so we don't have to restart the physics engine every time the tool changes
  const activeToolRef = useRef(activeTool)
  // Ref to track the first body selected for constraints like Spring
  const firstSelectedBodyRef = useRef(null)
  // Ref to track the local point on the first body where the user clicked
  const firstSelectedPointRef = useRef(null)
  // Ref for the currently selected body for telemetry
  const selectedBodyRef = useRef(null)
  // Ref for material settings
  const materialRef = useRef(material || { restitution: 0.6, friction: 0.1, density: 0.001 })

  useEffect(() => {
    activeToolRef.current = activeTool

    // Clear selection state if we switch tools to avoid weird behavior
    if (firstSelectedBodyRef.current) {
      firstSelectedBodyRef.current.render.lineWidth = 2
      firstSelectedBodyRef.current.render.strokeStyle = firstSelectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80'
      firstSelectedBodyRef.current = null
      firstSelectedPointRef.current = null
    }

    if (selectedBodyRef.current && activeTool !== 'cursor') {
      selectedBodyRef.current.render.lineWidth = 2
      selectedBodyRef.current.render.strokeStyle = selectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80'
      selectedBodyRef.current = null
    }
  }, [activeTool])

  useEffect(() => {
    materialRef.current = material || { restitution: 0.6, friction: 0.1, density: 0.001 }
  }, [material])

  useEffect(() => {
    if (runnerRef.current) {
      runnerRef.current.enabled = !isPaused;
    }
  }, [isPaused])

  useEffect(() => {
    // 1. Create the physics engine
    const engine = Engine.create()
    engineRef.current = engine

    // 2. Get actual container dimensions
    const rect = canvasRef.current.getBoundingClientRect()
    const canvasWidth = rect.width || window.innerWidth
    const canvasHeight = rect.height || (window.innerHeight - 48)

    // 3. Create the renderer
    const render = Render.create({
      element: canvasRef.current,
      engine: engine,
      options: {
        width: canvasWidth,
        height: canvasHeight,
        wireframes: false,
        background: '#0a0e17',
        pixelRatio: window.devicePixelRatio || 1,
      },
    })

    const width = canvasWidth
    const height = canvasHeight

    // 4. Create initial bodies (Load from MongoDB if available)
    const ground = Bodies.rectangle(width / 2, height - 30, width, 60, {
      id: 999,
      isStatic: true,
      restitution: 0.8,
      render: { fillStyle: '#1f2937', strokeStyle: '#374151', lineWidth: 2 },
    })

    // 5. Add mouse drag support
    const mouse = Mouse.create(render.canvas)

    // Fix High-DPI (Retina) screen mouse drag offset issue
    // Matter.js reads the canvas width (which is scaled by pixelRatio) and scales mouse position by pixelRatio.
    // By setting the pixelRatio explicitly to what the Render is using, or scaling it back, we fix the offset.
    const pr = window.devicePixelRatio || 1
    // Apply the standard fix for Matter.js Mouse scaling on Retina screens:
    Matter.Mouse.setScale(mouse, { x: 1 / pr, y: 1 / pr })

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    })
    render.mouse = mouse

    // Add ground and mouse first
    Composite.add(engine.world, [ground, mouseConstraint])

    // --- ACTION HISTORY FOR UNDO ---
    const actionHistory = [];

    // --- KEYBOARD LISTENER FOR UNDO ---
    const handleKeyDown = (e) => {
      // Check for Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        
        // Clear active selections
        if (firstSelectedBodyRef.current) {
          firstSelectedBodyRef.current.render.lineWidth = 2;
          firstSelectedBodyRef.current.render.strokeStyle = firstSelectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80';
          firstSelectedBodyRef.current = null;
          firstSelectedPointRef.current = null;
        }
        if (selectedBodyRef.current) {
          selectedBodyRef.current.render.lineWidth = 2;
          selectedBodyRef.current.render.strokeStyle = selectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80';
          selectedBodyRef.current = null;
        }

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
    fetch(`http://localhost:5001/api/rooms/${roomId}`)
      .then(res => res.json())
      .then(roomData => {
        if (roomData && roomData.bodies && roomData.bodies.length > 0) {
          // Reconstruct bodies from database
          const loadedBodies = roomData.bodies.map(b => {
            let newBody;
            const opts = b.options || {};
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
                newBody = Bodies.rectangle(b.x, b.y, 150, 20, {
                  id: b.id, isStatic: opts.isMotorized ?? true, angle: b.angle,
                  render: { fillStyle: '#eab308', strokeStyle: '#ca8a04', lineWidth: 2 }
                });
                newBody.isMotor = opts.isMotorized ?? true;
                newBody.motorSpeed = opts.motorSpeed || 0.05;
                newBody.motorDirection = opts.motorDirection || 'clockwise';
                newBody.motorType = 'rod';
              }
            } else if (b.type === 'circle') {
              newBody = Bodies.circle(b.x, b.y, 30, {
                id: b.id, angle: b.angle, velocity: b.velocity, angularVelocity: b.angularVelocity,
                restitution: opts.restitution ?? 0.8, friction: opts.friction ?? 0.1, density: opts.density ?? 0.001,
                render: { fillStyle: '#22c55e', strokeStyle: '#4ade80', lineWidth: 2 }
              });
              Matter.Body.setVelocity(newBody, b.velocity || { x: 0, y: 0 });
            } else {
              newBody = Bodies.rectangle(b.x, b.y, 60, 60, {
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
                  pointA: c.pointA || { x: c.x - bodyA.position.x, y: c.y - bodyA.position.y },
                  pointB: { x: c.x, y: c.y }, stiffness: 1, length: 0,
                  render: c.hidden ? { visible: false } : { strokeStyle: '#f59e0b', lineWidth: 4 }
                });
                Composite.add(engine.world, pivot);
              } else if (c.type === 'spring') {
                const bodyB = Composite.get(engine.world, c.bodyBId, 'body');
                if (bodyA && bodyB) {
                  const spring = Constraint.create({
                    id: c.id, bodyA: bodyA, bodyB: bodyB, 
                    pointA: c.pointA || { x: 0, y: 0 },
                    pointB: c.pointB || { x: 0, y: 0 },
                    stiffness: c.stiffness || 0.05,
                    render: { strokeStyle: '#ef4444', lineWidth: 3 }
                  });
                  Composite.add(engine.world, spring);
                }
              }
            });
          }
        } else {
          // Default starting bodies if empty
          const box = Bodies.rectangle(width / 2, 100, 80, 80, {
            id: 1, restitution: 0.6,
            render: { fillStyle: '#6366f1', strokeStyle: '#818cf8', lineWidth: 2 },
          });
          const circle = Bodies.circle(width / 2 - 120, 50, 40, {
            id: 2, restitution: 0.8,
            render: { fillStyle: '#22c55e', strokeStyle: '#4ade80', lineWidth: 2 },
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
          type: c.length === 0 ? 'pivot' : 'spring',
          bodyAId: c.bodyA?.id,
          bodyBId: c.bodyB?.id,
          x: c.pointB?.x,
          y: c.pointB?.y,
          pointA: c.pointA,
          pointB: c.pointB,
          stiffness: c.stiffness,
          hidden: c.render?.visible === false
        }));

      try {
        const res = await fetch(`http://localhost:5001/api/rooms/${roomId}/save`, {
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

      // Clear selections
      if (selectedBodyRef.current) selectedBodyRef.current = null
      if (firstSelectedBodyRef.current) firstSelectedBodyRef.current = null

      // Notify other users
      socket.emit('clear-canvas', { roomId })
    };
    window.addEventListener('trigger-clear', handleClear);

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

      // 2. Drive motors
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

      if (currentTool === 'cursor') {
        if (clickedBody && clickedBody.id !== 999) {
          if (selectedBodyRef.current && selectedBodyRef.current.id !== clickedBody.id) {
            selectedBodyRef.current.render.lineWidth = 2
            selectedBodyRef.current.render.strokeStyle = selectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80'
          }
          selectedBodyRef.current = clickedBody
          clickedBody.render.lineWidth = 4
          clickedBody.render.strokeStyle = '#38bdf8' // Highlight blue
        } else {
          // Deselect if clicking empty space
          if (selectedBodyRef.current) {
            selectedBodyRef.current.render.lineWidth = 2
            selectedBodyRef.current.render.strokeStyle = selectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80'
            selectedBodyRef.current = null
          }
        }
        return // Let MouseConstraint handle the actual dragging
      }

      const bodyId = Math.floor(Math.random() * 10000000) // Random unique ID
      const currentMaterial = materialRef.current

      if (currentTool === 'box') {
        const newBody = Bodies.rectangle(x, y, 60, 60, {
          id: bodyId,
          restitution: currentMaterial.restitution,
          friction: currentMaterial.friction,
          density: currentMaterial.density,
          render: { fillStyle: '#6366f1', strokeStyle: '#818cf8', lineWidth: 2 },
        })
        Composite.add(engine.world, newBody)
        actionHistory.push({ type: 'body', id: bodyId })
        socket.emit('add-body', { roomId, body: { id: bodyId, type: currentTool, x, y, options: currentMaterial } })

      } else if (currentTool === 'circle') {
        const newBody = Bodies.circle(x, y, 30, {
          id: bodyId,
          restitution: currentMaterial.restitution,
          friction: currentMaterial.friction,
          density: currentMaterial.density,
          render: { fillStyle: '#22c55e', strokeStyle: '#4ade80', lineWidth: 2 },
        })
        Composite.add(engine.world, newBody)
        actionHistory.push({ type: 'body', id: bodyId })
        socket.emit('add-body', { roomId, body: { id: bodyId, type: currentTool, x, y, options: currentMaterial } })

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
        if (clickedBody && clickedBody.id !== 999) {
          const dx = x - clickedBody.position.x;
          const dy = y - clickedBody.position.y;
          const localPoint = { x: dx, y: dy };

          const pivot = Constraint.create({
            id: bodyId,
            bodyA: clickedBody,
            pointA: localPoint,
            pointB: { x, y },
            stiffness: 1,
            length: 0,
            render: { strokeStyle: '#f59e0b', lineWidth: 4 }
          })
          Composite.add(engine.world, pivot)
          actionHistory.push({ type: 'constraint', id: bodyId })
          socket.emit('add-constraint', {
            roomId,
            constraint: { id: bodyId, type: 'pivot', bodyAId: clickedBody.id, x, y, pointA: localPoint }
          })
        }

      } else if (currentTool === 'spring') {
        if (clickedBody && clickedBody.id !== 999) {
          if (!firstSelectedBodyRef.current) {
            // First body selected!
            firstSelectedBodyRef.current = clickedBody
            
            const dx = x - clickedBody.position.x;
            const dy = y - clickedBody.position.y;
            firstSelectedPointRef.current = { x: dx, y: dy };

            // Visual feedback (thicker border, red)
            clickedBody.render.lineWidth = 5
            clickedBody.render.strokeStyle = '#ef4444'
          } else {
            // Second body selected!
            if (firstSelectedBodyRef.current.id !== clickedBody.id) {
              const dx = x - clickedBody.position.x;
              const dy = y - clickedBody.position.y;
              const localPointB = { x: dx, y: dy };

              const spring = Constraint.create({
                id: bodyId,
                bodyA: firstSelectedBodyRef.current,
                pointA: firstSelectedPointRef.current,
                bodyB: clickedBody,
                pointB: localPointB,
                stiffness: currentMaterial.springStiffness || 0.05,
                render: { strokeStyle: '#ef4444', lineWidth: 3 }
              })
              Composite.add(engine.world, spring)
              actionHistory.push({ type: 'constraint', id: bodyId })
              socket.emit('add-constraint', {
                roomId,
                constraint: {
                  id: bodyId, type: 'spring',
                  bodyAId: firstSelectedBodyRef.current.id,
                  bodyBId: clickedBody.id,
                  pointA: firstSelectedPointRef.current,
                  pointB: localPointB,
                  stiffness: currentMaterial.springStiffness || 0.05
                }
              })
            }
            // Reset visual feedback
            firstSelectedBodyRef.current.render.lineWidth = 2
            firstSelectedBodyRef.current.render.strokeStyle = firstSelectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80'
            firstSelectedBodyRef.current = null
            firstSelectedPointRef.current = null
          }
        } else {
          // Clicked empty space, reset selection
          if (firstSelectedBodyRef.current) {
            firstSelectedBodyRef.current.render.lineWidth = 2
            firstSelectedBodyRef.current.render.strokeStyle = firstSelectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80'
            firstSelectedBodyRef.current = null
            firstSelectedPointRef.current = null
          }
        }
      }
    }

    // We attach the listener to the wrapper div to ensure it captures clicks
    const canvasContainer = canvasRef.current
    canvasContainer.addEventListener('mousedown', handleCanvasClick)

    // D. Receive new bodies spawned by other users
    const onAddBody = (data) => {
      let newBody = null
      const opts = data.body.options || {}

      if (data.body.type === 'box') {
        newBody = Bodies.rectangle(data.body.x, data.body.y, 60, 60, {
          id: data.body.id,
          restitution: opts.restitution ?? 0.6,
          friction: opts.friction ?? 0.1,
          density: opts.density ?? 0.001,
          render: { fillStyle: '#6366f1', strokeStyle: '#818cf8', lineWidth: 2 },
        })
      } else if (data.body.type === 'circle') {
        newBody = Bodies.circle(data.body.x, data.body.y, 30, {
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
          newBody = Bodies.rectangle(data.body.x, data.body.y, 150, 20, {
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

    // E. Receive constraints added by other users
    const onAddConstraint = (data) => {
      const c = data.constraint
      const bodyA = Composite.get(engine.world, c.bodyAId, 'body')

      if (c.type === 'pivot' && bodyA) {
        const pivot = Constraint.create({
          id: c.id,
          bodyA: bodyA,
          pointA: c.pointA || { x: c.x - bodyA.position.x, y: c.y - bodyA.position.y },
          pointB: { x: c.x, y: c.y },
          stiffness: 1,
          length: 0,
          render: c.hidden ? { visible: false } : { strokeStyle: '#f59e0b', lineWidth: 4 }
        })
        Composite.add(engine.world, pivot)
      } else if (c.type === 'spring') {
        const bodyB = Composite.get(engine.world, c.bodyBId, 'body')
        if (bodyA && bodyB) {
          const spring = Constraint.create({
            id: c.id,
            bodyA: bodyA,
            bodyB: bodyB,
            pointA: c.pointA || { x: 0, y: 0 },
            pointB: c.pointB || { x: 0, y: 0 },
            stiffness: c.stiffness || 0.05,
            render: { strokeStyle: '#ef4444', lineWidth: 3 }
          })
          Composite.add(engine.world, spring)
        }
      }
    }
    socket.on('add-constraint', onAddConstraint)

    // K. Receive clear canvas event from other users
    const onClearCanvas = () => {
      const bodiesToRemove = engine.world.bodies.filter(b => b.id !== 999)
      const constraintsToRemove = engine.world.constraints.filter(c => c.label !== 'Mouse Constraint')
      Composite.remove(engine.world, bodiesToRemove)
      Composite.remove(engine.world, constraintsToRemove)
      if (selectedBodyRef.current) selectedBodyRef.current = null
      if (firstSelectedBodyRef.current) firstSelectedBodyRef.current = null
    }
    socket.on('clear-canvas', onClearCanvas)

    // L. Receive remove events (Undo) from other users
    const onRemoveBody = (data) => {
      const bodyToRemove = engine.world.bodies.find(b => b.id === data.id)
      if (bodyToRemove) {
        Composite.remove(engine.world, bodyToRemove)
        const constraintsToRemove = engine.world.constraints.filter(c => c.bodyA?.id === data.id || c.bodyB?.id === data.id)
        Composite.remove(engine.world, constraintsToRemove)
      }
    }
    socket.on('remove-body', onRemoveBody)

    const onRemoveConstraint = (data) => {
      const constraintToRemove = engine.world.constraints.find(c => c.id === data.id)
      if (constraintToRemove) {
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
    }
    window.addEventListener('resize', handleResize)

    // 9. Cleanup on unmount
    return () => {
      socket.off('physics-update', onPhysicsUpdate)
      socket.off('add-body', onAddBody)
      socket.off('add-constraint', onAddConstraint)
      socket.off('clear-canvas', onClearCanvas)
      socket.off('remove-body', onRemoveBody)
      socket.off('remove-constraint', onRemoveConstraint)
      canvasContainer.removeEventListener('mousedown', handleCanvasClick)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('trigger-save', handleSave)
      window.removeEventListener('trigger-clear', handleClear)
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
