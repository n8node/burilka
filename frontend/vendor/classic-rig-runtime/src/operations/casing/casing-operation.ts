/** Операция «Обсадка»: подъезд флота и спуск эксплуатационной колонны. */
import type { ClassicRigOperationDefinition } from "../../types";
import type { OperationBehavior } from "../../simulation/OperationRegistry";
import { checkRequirements } from "../../simulation/OperationRegistry";
import { PhaseMachine } from "../../simulation/PhaseMachine";
import { CASING_PHASES } from "./casing-phases";
import { updateProgramState } from "./casing-program";

export const casingOperation: ClassicRigOperationDefinition = {
  id: "casing",
  title: "Обсадка: спуск эксплуатационной колонны",
  phases: CASING_PHASES,
  initialState: { operation: "casing", phase: "rigup" },
  requirements: [{ type: "casing_stage", stage: "string_out" }],
  // эталон: шаги идут подряд внутри одной операции «Обсадка и цемент»
  next: { operation: "cementing", always: true },
};

const machine = new PhaseMachine(casingOperation, {
  onUpdate: (ctx, _phase, p) => updateProgramState(ctx.state, ctx.well(), p),
});

export const casingBehavior: OperationBehavior = {
  definition: casingOperation,
  start(ctx) {
    machine.start(ctx);
  },
  update: (ctx, dt) => machine.update(ctx, dt),
  complete(ctx) {
    ctx.state.casing.stage = "casing_run";
    ctx.startOperation("cementing", "chain");
  },
  currentPhase: (ctx) => machine.current(ctx).id,
  phaseProgress: (ctx) => Math.min(1, ctx.state.stepP),
  operationProgress: (ctx) => machine.progress(ctx),
  pumpTarget: () => 0,
  selectPhase: (ctx, p) => machine.jumpTo(ctx, p),
  canStart: (ctx) => checkRequirements(ctx, casingOperation.requirements),
};
