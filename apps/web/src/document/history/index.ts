// document/history — undo/redo (PRD-C2) 공개 엔트리.
export type { Command, HistoryState } from './types';
export { createCommandStack, type CommandStack } from './commandStack';
