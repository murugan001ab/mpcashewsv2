// src/utils/apiError.ts

type ValidationError = {
  type?: string;
  loc?: (string | number)[];
  msg: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
};

type ErrorResponse = {
  detail?: string | ValidationError[];
  message?: string;
};

export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong"
): string {
  const response = (
    err as {
      response?: {
        data?: ErrorResponse;
      };
    }
  )?.response?.data;

  if (!response) {
    return fallback;
  }

  const { detail, message } = response;

  // FastAPI: {"detail": "Some error"}
  if (typeof detail === "string") {
    return detail;
  }

  // FastAPI validation error (422)
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const loc = Array.isArray(item.loc)
            ? item.loc
                .filter((part) => part !== "body")
                .map(String)
                .join(".")
            : "";

          return loc ? `${loc}: ${item.msg}` : item.msg;
        }

        return String(item);
      })
      .join("; ");
  }

  // Other APIs
  if (typeof message === "string") {
    return message;
  }

  return fallback;
}