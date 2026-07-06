import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startCopyTrading } from "../api/settings";
import { ConfirmModal } from "./ui/ConfirmModal";
import { useToast } from "./ui/Toast";
import { useT } from "../i18n/I18nProvider";

interface StartCopyTradingButtonProps {
  copyTradingEnabled: boolean;
  compact?: boolean;
}

export function StartCopyTradingButton({
  copyTradingEnabled,
  compact,
}: StartCopyTradingButtonProps) {
  const t = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const start = useMutation({
    mutationFn: startCopyTrading,
    onSuccess: () => {
      toast(t("risk.startCopyDone"), "success");
      queryClient.invalidateQueries({ queryKey: ["risk"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  if (copyTradingEnabled) return null;

  function onConfirm() {
    start.mutate(undefined, { onSettled: () => setConfirmOpen(false) });
  }

  return (
    <>
      <button
        type="button"
        className={compact ? "btn-success btn-sm" : "btn-success"}
        disabled={start.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {t("risk.startCopy")}
      </button>
      <ConfirmModal
        open={confirmOpen}
        title={t("risk.confirmStartTitle")}
        confirmLabel={t("risk.confirmStartBtn")}
        loading={start.isPending}
        description={
          <>
            {t("risk.confirmStartDesc")}
            <br />
            <span className="muted">{t("risk.confirmStartHint")}</span>
          </>
        }
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
