import type React from "react";
import { useChat } from "@ai-sdk/react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useCallback, useEffect, useRef } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
import ConnectTool from "./ConnectTool";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useAuth0 } from "@/lib/use-auth0";

const ChatApp: React.FC = () => {
  const { user, isLoading, fetch } = useAuth0();
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "http://localhost:3000/api/chat",
    fetch,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, messages]);

  return (
    <div className="w-full flex flex-col h-[calc(100vh-150px)] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-300 dark:border-gray-700">
      <ScrollArea.Root className="flex-1 overflow-hidden p-4">
        <ScrollArea.Viewport className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === "user" ? "self-end flex-row-reverse" : ""
              }`}
            >
              {message.role === "user" ? (
                <img
                  src={user?.picture || "/placeholder.svg"}
                  alt={user?.name || "User"}
                  className="w-9 h-9 rounded-full"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-300 flex items-center justify-center text-white">
                  <Bot size={24} />
                </div>
              )}
              <div
                className={`p-3 rounded-lg text-sm shadow-md transition-all duration-200 ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                }`}
              >
                {message.content}
                {message.toolInvocations?.map((tool) => (
                  <div
                    key={tool.toolCallId}
                    className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md text-xs font-mono"
                  >
                    <div className="font-bold text-blue-500">
                      {tool.toolName}
                    </div>
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(tool.args, null, 2)}
                    </pre>
                    {tool.state === "result" && (
                      <div className="mt-1 border-t border-gray-300 dark:border-gray-600 pt-1">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(tool.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
      <form
        onSubmit={handleSubmit}
        className="flex p-4 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 gap-3"
      >
        <ConnectTool />
        <Input
          value={input}
          placeholder="Type a message..."
          onChange={handleInputChange}
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          type="submit"
          // className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <><Loader2 className="animate-spin" size={18} /> Send</>
          ) : (
            <><Send size={18} /> Send</>
          )}
        </Button>
      </form>
    </div>
  );
};

export default ChatApp;
