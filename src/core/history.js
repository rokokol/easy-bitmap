// Undo and redo over whole-document snapshots. The caller records the state it is about to
// change; undo hands back the previous state and keeps the current one for redo
export function createHistory(limit = 200) {
  const past = []
  let future = []
  return {
    record(state) {
      past.push(state)
      if (past.length > limit) past.shift()
      future = []
    },
    undo(current) {
      if (!past.length) return undefined
      future.push(current)
      return past.pop()
    },
    redo(current) {
      if (!future.length) return undefined
      past.push(current)
      return future.pop()
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past.length = 0
      future = []
    },
  }
}
