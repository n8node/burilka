/** Операция «Переезд по кусту» (эталон: lo("move"), H1 шаг move, qS() ветка move). */
import type { ClassicRigOperationDefinition } from "../../types";
import type { OperationBehavior } from "../../simulation/OperationRegistry";
import { checkRequirements } from "../../simulation/OperationRegistry";
import { PhaseMachine } from "../../simulation/PhaseMachine";
import { START_MD, TD_TOP, WELLS } from "../../reference/constants";
import { easeInOut } from "../../util/math";
import { setDrillPhase } from "../drilling/drilling-state";
import { MOVING_CONFIG } from "./moving-config";
import { MOVING_PHASES } from "./moving-phases";

export const movingOperation: ClassicRigOperationDefinition = {
  id: "moving",
  title: "Переезд на соседнее устье куста",
  phases: MOVING_PHASES,
  initialState: { operation: "moving", phase: "prep" },
  requirements: [{ type: "operation", operation: "drilling", phases: ["complete"] }, { type: "next_well_available" }],
  next: { operation: "drilling_new_well", always: true },
};

const machine = new PhaseMachine(movingOperation, {
  onUpdate(ctx, phase, p) {
    if (phase.id === "move") ctx.state.moveX = ctx.state.x0 + MOVING_CONFIG.step * easeInOut(Math.min(1, p));
  },
});

export const movingBehavior: OperationBehavior = {
  definition: movingOperation,
  start(ctx) {
    ctx.state.x0 = ctx.state.moveX;
    machine.start(ctx);
  },
  update: (ctx, dt) => machine.update(ctx, dt),
  complete(ctx) {
    const s = ctx.state;
    const from = Math.round(s.x0);
    if (!s.completedWellheads.includes(from)) s.completedWellheads.push(from); // Cf(Y, x0, true)
    s.moveX = s.x0 + MOVING_CONFIG.step;
    const x = Math.round(s.moveX);
    s.wi = WELLS.findIndex((w) => w.x === x);
    s.op = "drilling";
    s.drill.md = s.drill.holeMD = START_MD;
    s.drill.tdY = TD_TOP;
    setDrillPhase(s, "drill");
    ctx.bus.emit({ type: "rig_moved", toX: x, timestamp: s.time });
    ctx.phaseStarted("drill");
    ctx.notify(`Скважина ${WELLS[s.wi].id}: начато бурение под эксплуатационную колонну`);
  },
  currentPhase: (ctx) => machine.current(ctx).id,
  phaseProgress: (ctx) => Math.min(1, ctx.state.stepP),
  operationProgress: (ctx) => machine.progress(ctx),
  pumpTarget: () => 0,
  selectPhase: (ctx, p) => machine.jumpTo(ctx, p),
  canStart: (ctx) => checkRequirements(ctx, movingOperation.requirements),
};
