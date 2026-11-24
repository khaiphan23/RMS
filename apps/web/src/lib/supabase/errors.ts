const FALLBACK = "Không thực hiện được thao tác. Vui lòng thử lại.";

export function friendlyDbError(error: unknown, fallback = FALLBACK): string {
  if (!error || typeof error !== "object") return fallback;

  const { code, message } = error as { code?: string; message?: string };

  switch (code) {
    case "42501":
      return "Bạn không có quyền thực hiện thao tác này.";
    case "23505":
      return "Dữ liệu đã tồn tại (mã bị trùng).";
    case "23503":
      return "Dữ liệu đang được dùng ở nơi khác nên không thể xoá.";
    case "23514":
      return "Dữ liệu không hợp lệ.";
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
