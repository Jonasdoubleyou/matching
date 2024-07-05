import { matchers, run, verifyMatching } from "../algo";
import { missions } from "./missions";

(async function () {
for (const mission of missions) {
    for(const [matcherName, matcher] of Object.entries(matchers)) {
        const { matching, steps } = await run(mission.input, matcher);
        verifyMatching(mission.input, matching);

        
    }
}
})();

