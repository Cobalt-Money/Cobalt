import { useRef } from "react";

interface EditableNameProps {
  displayName: string;
  onSubmit: (name: string) => void;
}

export function EditableName({ displayName, onSubmit }: EditableNameProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function commit() {
    const next = inputRef.current?.value.trim() ?? "";
    if (!next || next === displayName) {
      if (inputRef.current) {
        inputRef.current.value = displayName;
      }
      return;
    }
    onSubmit(next);
  }

  return (
    <input
      aria-label="Transaction name"
      className="w-full min-w-0 cursor-text bg-transparent font-medium text-2xl text-foreground leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50 sm:text-3xl"
      defaultValue={displayName}
      key={displayName}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          if (inputRef.current) {
            inputRef.current.value = displayName;
          }
          inputRef.current?.blur();
        }
      }}
      ref={inputRef}
      spellCheck={false}
    />
  );
}
