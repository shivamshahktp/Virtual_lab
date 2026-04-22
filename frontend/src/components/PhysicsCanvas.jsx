import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import socket from '../socket'

const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Constraint, Query } = Matter

export default function PhysicsCanvas({ roomId, activeTool, material }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  
  // Use a ref for activeTool so we don't have to restart the physics engine every time the tool changes
  const activeToolRef = useRef(activeTool)
  // Ref to track the first body selected for constraints like Spring
  const firstSelectedBodyRef = useRef(null)
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
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    })
    render.mouse = mouse

    // Add ground and mouse first
    Composite.add(engine.world, [ground, mouseConstraint])

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
              newBody = Bodies.rectangle(b.x, b.y, 150, 20, {
                id: b.id, isStatic: true, angle: b.angle,
                render: { fillStyle: '#eab308', strokeStyle: '#ca8a04', lineWidth: 2 }
              });
              newBody.isMotor = true;
            } else if (b.type === 'circle') {
              newBody = Bodies.circle(b.x, b.y, 30, {
                id: b.id, angle: b.angle, velocity: b.velocity, angularVelocity: b.angularVelocity,
                restitution: opts.restitution ?? 0.8, friction: opts.friction ?? 0.1, density: opts.density ?? 0.001,
                render: { fillStyle: '#22c55e', strokeStyle: '#4ade80', lineWidth: 2 }
              });
              Matter.Body.setVelocity(newBody, b.velocity || {x:0, y:0});
            } else {
              newBody = Bodies.rectangle(b.x, b.y, 60, 60, {
                id: b.id, angle: b.angle, velocity: b.velocity, angularVelocity: b.angularVelocity,
                restitution: opts.restitution ?? 0.6, friction: opts.friction ?? 0.1, density: opts.density ?? 0.001,
                render: { fillStyle: '#6366f1', strokeStyle: '#818cf8', lineWidth: 2 }
              });
              Matter.Body.setVelocity(newBody, b.velocity || {x:0, y:0});
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
                  id: c.id, bodyA: bodyA, pointA: { x: c.x - bodyA.position.x, y: c.y - bodyA.position.y },
                  pointB: { x: c.x, y: c.y }, stiffness: 1, length: 0,
                  render: { strokeStyle: '#f59e0b', lineWidth: 4 }
                });
                Composite.add(engine.world, pivot);
              } else if (c.type === 'spring') {
                const bodyB = Composite.get(engine.world, c.bodyBId, 'body');
                if (bodyA && bodyB) {
                  const spring = Constraint.create({
                    id: c.id, bodyA: bodyA, bodyB: bodyB, stiffness: 0.05,
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
    Runner.run(runner, engine)
    Render.run(render)

    // --- I. DB Save Hook ---
    const handleSave = async () => {
      // Serialize dynamic bodies and motors
      const bodiesToSave = engine.world.bodies
        .filter(b => (!b.isStatic || b.isMotor) && b.id !== 999)
        .map(b => ({
          id: b.id,
          type: b.isMotor ? 'motor' : (b.circleRadius ? 'circle' : 'box'),
          x: b.position.x,
          y: b.position.y,
          angle: b.angle,
          velocity: b.velocity,
          angularVelocity: b.angularVelocity,
          options: { restitution: b.restitution, friction: b.friction, density: b.density }
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
          y: c.pointB?.y
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

    // --- REAL-TIME MULTIPLAYER SYNC ---
    
    // Flag to prevent infinite broadcast loops
    let isApplyingRemoteUpdate = false

    // A. Receive updates from other users
    const onPhysicsUpdate = (data) => {
      isApplyingRemoteUpdate = true
      data.bodies.forEach((remoteBody) => {
        // Find the local body by ID
        const localBody = Composite.get(engine.world, remoteBody.id, 'body')
        if (localBody && !localBody.isStatic) {
          // Force set the local body's state to match the remote state
          Matter.Body.setPosition(localBody, remoteBody.position)
          Matter.Body.setAngle(localBody, remoteBody.angle)
          Matter.Body.setVelocity(localBody, remoteBody.velocity)
          Matter.Body.setAngularVelocity(localBody, remoteBody.angularVelocity)
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
        const dynamicBodies = engine.world.bodies.filter(b => !b.isStatic)
        
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

    // F. Run the motors every frame
    Matter.Events.on(engine, 'beforeUpdate', () => {
      engine.world.bodies.forEach(body => {
        if (body.isMotor) {
          Matter.Body.setAngle(body, body.angle + 0.05)
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
        if (clickedBody && !clickedBody.isStatic) {
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
        socket.emit('add-body', { roomId, body: { id: bodyId, type: currentTool, x, y, options: currentMaterial } })
        
      } else if (currentTool === 'motor') {
        const newBody = Bodies.rectangle(x, y, 150, 20, {
          id: bodyId,
          isStatic: true,
          render: { fillStyle: '#eab308', strokeStyle: '#ca8a04', lineWidth: 2 },
        })
        newBody.isMotor = true // Custom flag to identify motors
        Composite.add(engine.world, newBody)
        socket.emit('add-body', { roomId, body: { id: bodyId, type: currentTool, x, y } })

      } else if (currentTool === 'pivot') {
        if (clickedBody && !clickedBody.isStatic) {
          const pivot = Constraint.create({
            id: bodyId,
            bodyA: clickedBody,
            pointA: { x: x - clickedBody.position.x, y: y - clickedBody.position.y },
            pointB: { x, y },
            stiffness: 1,
            length: 0,
            render: { strokeStyle: '#f59e0b', lineWidth: 4 }
          })
          Composite.add(engine.world, pivot)
          socket.emit('add-constraint', { 
            roomId, 
            constraint: { id: bodyId, type: 'pivot', bodyAId: clickedBody.id, x, y } 
          })
        }
        
      } else if (currentTool === 'spring') {
        if (clickedBody && !clickedBody.isStatic) {
          if (!firstSelectedBodyRef.current) {
            // First body selected!
            firstSelectedBodyRef.current = clickedBody
            // Visual feedback (thicker border, red)
            clickedBody.render.lineWidth = 5
            clickedBody.render.strokeStyle = '#ef4444'
          } else {
            // Second body selected!
            if (firstSelectedBodyRef.current.id !== clickedBody.id) {
              const spring = Constraint.create({
                id: bodyId,
                bodyA: firstSelectedBodyRef.current,
                bodyB: clickedBody,
                stiffness: 0.05,
                render: { strokeStyle: '#ef4444', lineWidth: 3 }
              })
              Composite.add(engine.world, spring)
              socket.emit('add-constraint', { 
                roomId, 
                constraint: { id: bodyId, type: 'spring', bodyAId: firstSelectedBodyRef.current.id, bodyBId: clickedBody.id } 
              })
            }
            // Reset visual feedback
            firstSelectedBodyRef.current.render.lineWidth = 2
            firstSelectedBodyRef.current.render.strokeStyle = firstSelectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80'
            firstSelectedBodyRef.current = null
          }
        } else {
          // Clicked empty space, reset selection
          if (firstSelectedBodyRef.current) {
             firstSelectedBodyRef.current.render.lineWidth = 2
             firstSelectedBodyRef.current.render.strokeStyle = firstSelectedBodyRef.current.render.fillStyle === '#6366f1' ? '#818cf8' : '#4ade80'
             firstSelectedBodyRef.current = null
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
        newBody = Bodies.rectangle(data.body.x, data.body.y, 150, 20, {
          id: data.body.id,
          isStatic: true,
          render: { fillStyle: '#eab308', strokeStyle: '#ca8a04', lineWidth: 2 },
        })
        newBody.isMotor = true
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
          pointA: { x: c.x - bodyA.position.x, y: c.y - bodyA.position.y },
          pointB: { x: c.x, y: c.y },
          stiffness: 1,
          length: 0,
          render: { strokeStyle: '#f59e0b', lineWidth: 4 }
        })
        Composite.add(engine.world, pivot)
      } else if (c.type === 'spring') {
        const bodyB = Composite.get(engine.world, c.bodyBId, 'body')
        if (bodyA && bodyB) {
          const spring = Constraint.create({
            id: c.id,
            bodyA: bodyA,
            bodyB: bodyB,
            stiffness: 0.05,
            render: { strokeStyle: '#ef4444', lineWidth: 3 }
          })
          Composite.add(engine.world, spring)
        }
      }
    }
    socket.on('add-constraint', onAddConstraint)

    // 8. Handle window resize
    const handleResize = () => {
      const w = canvasRef.current.clientWidth
      const h = canvasRef.current.clientHeight
      render.canvas.width = w
      render.canvas.height = h
      render.options.width = w
      render.options.height = h
    }
    window.addEventListener('resize', handleResize)

    // 9. Cleanup on unmount
    return () => {
      socket.off('physics-update', onPhysicsUpdate)
      socket.off('add-body', onAddBody)
      socket.off('add-constraint', onAddConstraint)
      canvasContainer.removeEventListener('mousedown', handleCanvasClick)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('trigger-save', handleSave)
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
