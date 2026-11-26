import type { KeyboardEvent } from "react";

type View = "form" | "preview";

type Props = {
  view: View;
  onChange: (view: View) => void;
};

export function WorkspaceTabs({ view, onChange }: Props) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const next = view === "form" ? "preview" : "form";
      onChange(next);
      const targetId = next === "form" ? "tab-form" : "tab-preview";
      window.setTimeout(() => document.getElementById(targetId)?.focus(), 0);
    }
  };

  return (
    <div className="workspace-tabs" role="tablist" aria-label="Tampilan kerja">
      <button
        type="button"
        role="tab"
        id="tab-form"
        aria-selected={view === "form"}
        aria-controls="panel-form"
        tabIndex={view === "form" ? 0 : -1}
        className={`workspace-tab${view === "form" ? " is-active" : ""}`}
        onClick={() => onChange("form")}
        onKeyDown={onKeyDown}
      >
        Formulir
      </button>
      <button
        type="button"
        role="tab"
        id="tab-preview"
        aria-selected={view === "preview"}
        aria-controls="panel-preview"
        tabIndex={view === "preview" ? 0 : -1}
        className={`workspace-tab${view === "preview" ? " is-active" : ""}`}
        onClick={() => onChange("preview")}
        onKeyDown={onKeyDown}
      >
        Pratinjau
      </button>
    </div>
  );
}
