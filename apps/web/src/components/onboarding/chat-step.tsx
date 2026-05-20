import { ChatPreview } from "./chat-preview";

export function ChatStep() {
  return (
    <div className="flex w-full flex-col items-center gap-6 text-center">
      <h1 className="max-w-md font-semibold text-3xl leading-tight tracking-tight">
        Ask Cobalt anything about your money.
      </h1>
      <ChatPreview />
    </div>
  );
}
