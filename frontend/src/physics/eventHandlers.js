import Matter from 'matter-js'
import { getRoomState } from './syncHandlers'
const { Composite } = Matter

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export const setupEventHandlers = (ctx) => {
  const { 
    engine, socket, roomId, actionHistoryRef,
    clearPendingSelections, clearSelectedBody, clearSelectedConstraint,
    deleteSelectedBody, deleteSelectedConstraint
  } = ctx;

  // Let users hit Delete/Backspace to delete selections, or Ctrl+Z to undo
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

    // Ctrl+Z undo flow starts here
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      // Don't hijack Ctrl+Z if they are typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      
      // Clear highlights before deleting so we don't hold onto dead refs
      clearPendingSelections()
      clearSelectedBody()
      clearSelectedConstraint()

      if (actionHistoryRef.current.length > 0) {
        const lastAction = actionHistoryRef.current.pop();
        
        if (lastAction.type === 'body') {
          const bodyToRemove = engine.world.bodies.find(b => b.id === lastAction.id);
          if (bodyToRemove) {
            Composite.remove(engine.world, bodyToRemove);
            socket.emit('remove-body', { roomId, id: lastAction.id });
            
            // Also sweep away constraints tied to this body so they don't dangle
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

  const handleDeleteSelected = () => {
    if (deleteSelectedBody()) return
    deleteSelectedConstraint()
  }
  window.addEventListener('trigger-delete-selected', handleDeleteSelected)

  // Dump the current canvas state back into MongoDB
  const handleSave = async () => {
    const state = getRoomState(engine);
    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomId}/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      if (res.ok) alert('Simulation saved securely to MongoDB Database!');
      else alert('Failed to save simulation.');
    } catch (err) {
      console.error(err);
      alert('Error saving simulation. Is backend running?');
    }
  };
  window.addEventListener('trigger-save', handleSave);

  // Wipe the board
  const handleClear = () => {
    // Remove all bodies/constraints but leave the floor (id 999) and mouse grabber
    const bodiesToRemove = engine.world.bodies.filter(b => b.id !== 999)
    const constraintsToRemove = engine.world.constraints.filter(c => c.label !== 'Mouse Constraint')

    Composite.remove(engine.world, bodiesToRemove)
    Composite.remove(engine.world, constraintsToRemove)

    clearSelectedBody()
    clearSelectedConstraint()
    clearPendingSelections()

    // Tell other players to clear their screens too
    socket.emit('clear-canvas', { roomId })
  };
  window.addEventListener('trigger-clear', handleClear);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('trigger-delete-selected', handleDeleteSelected);
    window.removeEventListener('trigger-save', handleSave);
    window.removeEventListener('trigger-clear', handleClear);
  }
}
