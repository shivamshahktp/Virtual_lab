import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import socket from '../socket'

import { setupMatterEngine } from '../physics/engineSetup'
import { loadRoomState } from '../physics/syncHandlers'
import { createSelectionHandlers } from '../physics/selectionHandlers'
import { setupEventHandlers } from '../physics/eventHandlers'
import { setupMouseHandlers } from '../physics/mouseHandlers'
import { setupSocketListeners } from '../physics/socketListeners'
import { setupRenderLoop } from '../physics/renderLoop'
import { resetBodyHighlight, applyConstraintRender, getConstraintType } from '../physics/helpers'

const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export default function PhysicsCanvas({ roomId, activeTool, material, isPaused, vectorSettings, simSpeed }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const runnerRef = useRef(null)
  const renderRef = useRef(null)

  const activeToolRef = useRef(activeTool)
  const firstSelectedBodyRef = useRef(null)
  const firstSelectedPointRef = useRef(null)
  const firstSelectedAnchorRef = useRef(null)
  const selectedBodyRef = useRef(null)
  const selectedConstraintRef = useRef(null)
  const pivotAnchorRef = useRef(null)
  const materialRef = useRef(material || { restitution: 0.6, friction: 0.1, density: 0.001 })
  const vectorSettingsRef = useRef(vectorSettings || {})
  const simSpeedRef = useRef(simSpeed || 1)
  const actionHistoryRef = useRef([])

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

    const nextLength = type === 'rod' ? material?.rodLength :
                       type === 'spring' ? material?.springLength :
                       material?.ropeLength
                       
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
    const engine = Engine.create({
      positionIterations: 32,
      velocityIterations: 32,
      constraintIterations: 16
    })
    engineRef.current = engine
    setupMatterEngine(engine)

    const rect = canvasRef.current.getBoundingClientRect()
    const canvasWidth = rect.width || window.innerWidth
    const canvasHeight = rect.height || (window.innerHeight - 48)

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

    const ground = Bodies.rectangle(canvasWidth / 2, canvasHeight - 25, Math.max(canvasWidth, 4000), 50, {
      id: 999,
      isStatic: true,
      restitution: 0,
      render: { fillStyle: '#e2e8f0', strokeStyle: '#cbd5e0', lineWidth: 1 },
    })

    const mouse = Mouse.create(render.canvas)
    mouse.pixelRatio = window.devicePixelRatio || 1
    Mouse.setScale(mouse, { x: 1, y: 1 })

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    })
    render.mouse = mouse

    Composite.add(engine.world, [ground, mouseConstraint])

    // Orchestrate Modules
    const ctx = {
      engine, render, socket, roomId, mouseConstraint, width: canvasWidth,
      activeToolRef, materialRef, actionHistoryRef, vectorSettingsRef,
      selectedBodyRef, selectedConstraintRef, firstSelectedBodyRef, firstSelectedPointRef,
      firstSelectedAnchorRef, pivotAnchorRef,
      canvasContainer: canvasRef.current
    };

    const selectionHandlers = createSelectionHandlers(ctx);
    Object.assign(ctx, selectionHandlers); // Inject selection methods for other handlers

    const cleanupEvents = setupEventHandlers(ctx);
    const cleanupMouse = setupMouseHandlers(ctx);
    const socketListeners = setupSocketListeners(ctx);
    
    // Inject the sync status checker to the render loop
    ctx.checkApplyingRemoteUpdate = socketListeners.checkApplyingRemoteUpdate;
    const cleanupRender = setupRenderLoop(ctx);

    // Initial State Fetch
    fetch(`${API_URL}/api/rooms/${roomId}`)
      .then(res => res.json())
      .then(roomData => {
        if (!socketListeners.hasReceivedLiveSync()) {
          loadRoomState(engine, roomData, canvasWidth, true);
        }
      })
      .catch(err => console.error("Failed to load room from DB:", err));

    const runner = Runner.create()
    runnerRef.current = runner
    runner.enabled = !isPaused
    Runner.run(runner, engine)
    Render.run(render)

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

      mouse.pixelRatio = pr
      Mouse.setScale(mouse, { x: 1, y: 1 })

      const g = engine.world.bodies.find(b => b.id === 999)
      if (g) {
        Matter.Body.setPosition(g, { x: w / 2, y: h - 25 })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cleanupEvents();
      cleanupMouse();
      socketListeners.cleanup();
      cleanupRender();
      window.removeEventListener('resize', handleResize)

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
