import type React from "react"
import { useChat } from "@ai-sdk/react"
import * as ScrollArea from "@radix-ui/react-scroll-area"
import { useAuth0 } from "@auth0/auth0-react"
import { useCallback, useEffect, useRef } from "react"
import { Bot, Send, Loader2 } from "lucide-react"


const ChatApp: React.FC = () => {
  // const { messages, input, handleInputChange, handleSubmit } = useChat()
  const { user, getAccessTokenSilently, isLoading } = useAuth0()
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "http://localhost:3000/api/chat",
    async fetch(url, options) {
      // We can optionally make it optional and support anonoymous
      const token = await getAccessTokenSilently();
      return fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [scrollToBottom, messages])

  return (
    <div className="chat-container">
      <ScrollArea.Root className="chat-messages" type="auto">
        <ScrollArea.Viewport className="chat-viewport">
          <div className="messages-wrapper">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role === "user" ? "user" : "ai"} ${
                  message.role === "assistant" ? "ai-message" : ""
                }`}
              >
                {message.role === "user" ? (
                  <img src={user?.picture || "/placeholder.svg"} alt={user?.name || "User"} className="user-avatar" />
                ) : (
                  <div className="ai-avatar">
                    <Bot size={24} />
                  </div>
                )}
                <div className="message-content">
                  {message.content}
                  {message.toolInvocations?.map((tool) => (
                    <div key={tool.toolCallId} className="tool-call">
                      <div className="tool-name">{tool.toolName}</div>
                      <div className="tool-args">
                        <pre>{JSON.stringify(tool.args, null, 2)}</pre>
                      </div>
                      {tool.state === "result" && (
                        <div className="tool-result">
                          <pre>{JSON.stringify(tool.result, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="scrollbar" orientation="vertical">
          <ScrollArea.Thumb className="thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          className="chat-input"
          value={input}
          placeholder="Type a message..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button type="submit" className="send-button" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}

export default ChatApp

