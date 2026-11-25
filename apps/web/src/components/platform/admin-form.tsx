"use client";

import { startTransition, useActionState, useRef, type ReactNode } from "react";
import type { ActionResult } from "@/lib/supabase/types";
import styles from "./admin.module.css";

export function AdminForm({ action, children, button = "Lưu thay đổi", resetOnSuccess = false }: {
  action: (data: FormData) => Promise<ActionResult>;
  children: ReactNode;
  button?: string;
  resetOnSuccess?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, submit, pending] = useActionState<ActionResult | null, FormData>(
    async (_previous, data) => {
      const result = await action(data);
      if (result.ok && resetOnSuccess) formRef.current?.reset();
      return result;
    }, null,
  );

  return (
    <form ref={formRef} onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const data = new FormData(event.currentTarget);
      startTransition(() => submit(data));
    }}>
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className={styles.fields}>{children}</div>
        <button type="submit">{pending ? "Đang lưu…" : button}</button>
      </fieldset>
      {result?.ok && <p role="status">Đã lưu.</p>}
      {result?.ok === false && <p className={styles.error} role="alert">{result.error}</p>}
    </form>
  );
}
