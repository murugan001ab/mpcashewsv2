// src/utils/apiError.ts
// FastAPI returns `detail` as a plain string for most errors, but as an
// array of Pydantic validation-error objects ({ type, loc, msg, input, ctx })
// for 422s. The old frontend's error handlers assumed `detail` was always a
// string and rendered it directly — which throws "Objects are not valid as a
// React child" the moment a 422 comes back. This normalizes either shape
// into a plain string that's always safe to render.
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const detail = (
    err as {
      response?: { data?: { detail?: unknown; message?: string } };
    }
  )?.response?.data;

  const d = detail?.detail;

  if (typeof d === "string") return d;

  if (Array.isArray(d)) {
    return d
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const loc = Array.isArray(item.loc) ? item.loc.filter((l) => l !== "body").join(".") : "";
          return loc ? `${loc}: ${item.msg}` : String(item.msg);
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }

  if (typeof detail?.message === "string") return detail.message;

  return fallback;
}
