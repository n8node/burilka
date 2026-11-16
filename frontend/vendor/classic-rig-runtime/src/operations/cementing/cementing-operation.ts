/** Операция «Цементирование» (эталон: шаги circ…woc + завершение qS() ветки casing). */
import type { ClassicRigOperationDefinition } from "../../types";
import type { OperationBehavior } from "../../simulation/OperationRegistry";
import { checkRequirements } from "../../simulation/OperationRegistry";
import { PhaseMachine } from "../../simulation/PhaseMachine";
import { TD_TOP } from "../../reference/constants";
import { setDrillPhase } from "../drilling/drilling-state";
import { updateProgramState } from "../casing/casing-program";
import { CEMENTING_PHASES } from "./cementing-phases";

export const cementingOperation: ClassicRigOperationDefinition = {
  id: "cementing",
  title: "Цементирование эксплуатационной колонны",
  phases: CEMENTING_PHASES,
  initialState: { operation: "cementing", phase: "circ" },
  requirements: [{ type: "casing_stage", stage: "casing_run" }],
  next: { operation: "drilling_complete", always: true },
};

const machine = new PhaseMachine(cementingOperation, {
  onUpdate: (ctx, _phase, p) => updateProgramState(ctx.state, ctx.well(), p),
});

export const cementingBehavior: OperationBehavior = {
  definition: cementingOperation,
  start(ctx) {
    machine.start(ctx);
  },
  update: (ctx, dt) => machine.update(ctx, dt),
  complete(ctx) {
    const s = ctx.state;
    const w = ctx.well();
    s.wellStatus[w.id] = "done"; // wS()
    s.casing.stage = "none";
    s.cement.plug = null;
    ctx.bus.emit({ type: "well_completed", wellId: w.id, timestamp: s.time });
    s.op = "drilling";
    setDrillPhase(s, "complete");
    s.drill.tdY = TD_TOP;
    ctx.phaseStarted("complete");
    if (s.auto) {
      const next = Math.round(s.moveX) + 10;
      if ([0, 10, 20, 30].includes(next)) ctx.startOperation("moving", "auto");
      else ctx.startOperation("drilling", "auto");
    }
  },
  currentPhase: (ctx) => machine.current(ctx).id,
  phaseProgress: (ctx) => Math.min(1, ctx.state.stepP),
  operationProgress: (ctx) => machine.progress(ctx),
  pumpTarget: (ctx) => (machine.current(ctx).id === "circ" ? 1 : 0),
  selectPhase: (ctx, p) => machine.jumpTo(ctx, p),
  canStart: (ctx) => checkRequirements(ctx, cementingOperation.requirements),
};
