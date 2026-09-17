// Weekly refresh manifest — add an import line when a new weekly file lands.
// (Bundlers can't readdir at runtime on Vercel, so this manifest is the registry.)
import w2026_38 from "./2026-38.json";

const weekly: Record<string, any> = {
  "2026-38": w2026_38,
};
export default weekly;
