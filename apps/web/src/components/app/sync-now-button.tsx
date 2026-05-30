"use client";

import { useState, useTransition } from "react";

import { triggerWorkspaceSync } from "@/app/dashboard/settings/actions";

export function SyncNowButton({ workspaceId }: { workspaceId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await triggerWorkspaceSync(workspaceId);
            if (result.ok) {
              setMessage(result.queued ? "Sync started — refresh in a few minutes" : "Sync queued");
            } else {
              setMessage(result.error);
            }
          });
        }}
        className="rounded-lg border border-edge bg-panel px-3 py-1.5 text-xs font-semibold text-fg transition hover:border-profit/40 disabled:opacity-60"
      >
        {pending ? "Starting…" : "Sync now"}
      </button>
      {message ? <span className="max-w-[14rem] text-right text-[11px] text-faint">{message}</span> : null}
    </div>
  );
}
