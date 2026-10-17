import { defineTool } from "eve/tools";
import { z } from "zod";
// Engine is shared with the local customer interface. It performs no code execution.
// @ts-expect-error Plain ESM core is checked by the Node test suite.
import { Engine } from "../../src/engine.mjs";
// @ts-expect-error Plain ESM core is checked by the Node test suite.
import { Store } from "../../src/store.mjs";
// @ts-expect-error Plain ESM core is checked by the Node test suite.
import { LiveProviders } from "../../src/providers.mjs";

const store = new Store(".data");
const engine = new Engine(store, new LiveProviders());
export default defineTool({
  description: "Investigate public or redacted information with bounded recursive research. Requires explicit user consent. To resume an existing mission, provide missionId instead of creating another.",
  inputSchema: z.object({ objective: z.string().min(12).max(8000), publicDataConsent: z.literal(true), missionId: z.string().uuid().optional(), injectFailure: z.boolean().default(false) }),
  async execute(input) {
    const mission = input.missionId ? await store.get(input.missionId) : await engine.create(input.objective, { injectFailure: input.injectFailure });
    const result = await engine.run(mission.id);
    return { missionId: mission.id, status: result?.status, report: result?.report, error: result?.error, usage: result?.calls };
  },
});
