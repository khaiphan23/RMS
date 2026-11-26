const FALLBACK = "Không thực hiện được thao tác. Vui lòng thử lại.";
const INTERNAL_DB_MESSAGE =
  /(constraint|violates|row-level security|permission denied|does not exist|syntax error|relation "|column ")/i;

function businessMessage(message?: string) {
  const trimmed = message?.trim();
  if (!trimmed || INTERNAL_DB_MESSAGE.test(trimmed)) return null;
  return trimmed;
}

export function friendlyDbError(error: unknown, fallback = FALLBACK): string {
  if (!error || typeof error !== "object") return fallback;

  const { code, message } = error as { code?: string; message?: string };

  switch (code) {
    case "42501":
      return businessMessage(message) ?? "Bạn không có quyền thực hiện thao tác này.";
    case "23505":
      return "Dữ liệu đã tồn tại (mã bị trùng).";
    case "23503":
      return "Dữ liệu đang được dùng ở nơi khác nên không thể xoá.";
    case "23514":
      return businessMessage(message) ?? "Dữ liệu không hợp lệ.";
    case "P0001":
      return businessMessage(message) ?? fallback;
    case "22P02":
      return "Dữ liệu không hợp lệ.";
    case "PGRST116":
      return "Không tìm thấy dữ liệu.";
    case "PGRST301":
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (message && /row-level security|permission denied/i.test(message)) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }

  return fallback;
}
