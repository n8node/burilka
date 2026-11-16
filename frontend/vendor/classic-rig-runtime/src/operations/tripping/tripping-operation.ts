/** Операция «СПО: подъём колонны» (эталон: начало lo("casing") + шаг pooh). */
import type { ClassicRigOperationDefinition } from "../../types";
import type { OperationBehavior } from "../../simulation/OperationRegistry";
import { checkRequirements } from "../../simulation/OperationRegistry";
import { PhaseMachine } from "../../simulation/PhaseMachine";
import { START_MD } from "../../reference/constants";
import { DRILLING_CONFIG } from "../drilling/drilling-config";
import { returnStandToSetback } from "../drilling/drilling-state";
import { updateProgramState } from "../casing/casing-program";
import { TRIPPING_PHASES } from "./tripping-phases";

export const trippingOperation: ClassicRigOperationDefinition = {
  id: "tripping",
  title: "СПО: подъём бурильной колонны",
  phases: TRIPPING_PHASES,
  initialState: { operation: "tripping", phase: "pooh" },
  // эталон fh("casing"): op === drill && (phase drill | td) && md > ws + 8
  requirements: [
    { type: "operation", operation: "drilling", phases: ["drill", "td"] },
    { type: "min_depth", meters: START_MD + DRILLING_CONFIG.minExtraDepthForCasing },
  ],
  next: { operation: "casing", always: true },
};

const machine = new PhaseMachine(trippingOperation, {
  onUpdate: (ctx, _phase, p) => updateProgramState(ctx.state, ctx.well(), p),
});

export const trippingBehavior: OperationBehavior = {
  definition: trippingOperation,
  start(ctx) {
    const s = ctx.state;
    s.casing.casTD = s.drill.md;
    s.casing.md0 = s.drill.md;
    s.casing.stage = "none";
    returnStandToSetback(s);
    machine.start(ctx);
  },
  update: (ctx, dt) => machine.update(ctx, dt),
  complete(ctx) {
    ctx.state.casing.stage = "string_out";
    ctx.startOperation("casing", "chain");
  },
  currentPhase: (ctx) => machine.current(ctx).id,
  phaseProgress: (ctx) => Math.min(1, ctx.state.stepP),
  operationProgress: (ctx) => machine.progress(ctx),
  pumpTarget: () => 0,
  selectPhase: (ctx, p) => machine.jumpTo(ctx, p),
  canStart: (ctx) => checkRequirements(ctx, trippingOperation.requirements),
};
