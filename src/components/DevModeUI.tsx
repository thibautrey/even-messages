import { useState, useRef, useEffect } from "react";
import {
  BeeperAccount,
  BeeperChat,
  getBeeperConfig,
  getSpeechApiConfigSync,
  listSpeechProviderModels,
  type SpeechApiConfig,
  type SpeechProviderModel,
} from "../services";
import { PlatformIcon } from "./PlatformIcon";
import styles from "./DevModeUI.module.css";

// Debug logging system
interface LogEntry {
  id: number;
  timestamp: Date;
  type:
    | "api-request"
    | "api-response"
    | "api-error"
    | "console"
    | "info"
    | "cors";
  message: string;
  details?: string;
  status?: number;
  duration?: number;
}

let logIdCounter = 0;
const MAX_LOGS = 500;

// Global log storage
const globalLogs: LogEntry[] = [];

// Capture console.log, console.error, console.warn
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args: any[]) => {
  originalLog.apply(console, args);
  addLog("console", args.map((a) => formatValue(a)).join(" "));
};

console.error = (...args: any[]) => {
  originalError.apply(console, args);
  addLog("console", args.map((a) => formatValue(a)).join(" "), "error");
};

console.warn = (...args: any[]) => {
  originalWarn.apply(console, args);
  addLog("console", args.map((a) => formatValue(a)).join(" "), "warn");
};

function formatValue(val: any): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function addLog(
  type: LogEntry["type"],
  message: string,
  _subtype: "error" | "warn" | "info" = "info",
  details?: string,
  status?: number,
  duration?: number,
) {
  const entry: LogEntry = {
    id: ++logIdCounter,
    timestamp: new Date(),
    type,
    message,
    details,
    status,
    duration,
  };
  globalLogs.unshift(entry);
  if (globalLogs.length > MAX_LOGS) {
    globalLogs.pop();
  }
  // Trigger re-render if listener is set
  if (onNewLog) onNewLog(entry);
}

let onNewLog: ((entry: LogEntry) => void) | null = null;

function getRequestUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getRequestMethod(
  input: Request | URL | string,
  init?: RequestInit,
): string {
  if (init?.method) return init.method;
  if (input instanceof Request) return input.method;
  return "GET";
}

function isCrossOriginRequest(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

const patchedWindow = window as Window & {
  __evenMessagesFetchPatched__?: boolean;
  __evenMessagesOriginalFetch__?: typeof window.fetch;
};

// Patched fetch to capture API requests/responses and likely CORS failures.
// Important: successful CORS responses do not guarantee that ACAO headers are readable from JS,
// so "missing Access-Control-Allow-Origin" is not reliable evidence of a CORS problem.
if (!patchedWindow.__evenMessagesFetchPatched__) {
  const originalFetch =
    patchedWindow.__evenMessagesOriginalFetch__ || window.fetch;
  patchedWindow.__evenMessagesOriginalFetch__ = originalFetch;
  patchedWindow.__evenMessagesFetchPatched__ = true;

  window.fetch = async (...args) => {
    const [input, init = {}] = args;
    const url = getRequestUrl(input as string | URL | Request);
    const method = getRequestMethod(input as string | URL | Request, init);
    const crossOrigin = isCrossOriginRequest(url);
    const startTime = Date.now();

    try {
      const response = await originalFetch.apply(window, args);
      const duration = Date.now() - startTime;
      const status = response.status;
      const readableHeaders = [
        "content-type",
        "content-length",
        "access-control-allow-origin",
      ]
        .map(
          (header) =>
            `${header}: ${response.headers.get(header) || "NOT EXPOSED"}`,
        )
        .join(", ");

      if (
        response.type === "opaque" ||
        response.type === "opaqueredirect" ||
        status === 0
      ) {
        addLog(
          "cors",
          `Browser returned an opaque response`,
          "error",
          `Request: ${method} ${url}\nCross-origin: ${crossOrigin}\nResponse type: ${response.type}\nReadable headers: ${readableHeaders}`,
        );
      } else if (!response.ok) {
        addLog(
          "api-error",
          `${method} ${url} - ${status} (${duration}ms)`,
          "error",
          `Cross-origin: ${crossOrigin}\nResponse type: ${response.type}\nReadable headers: ${readableHeaders}`,
          status,
          duration,
        );
      } else {
        return response;
      }

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || String(error);
      const errorName = error.name || "";
      const errorDetails = error.toString();

      // Fetch rejects before a response is available for actual CORS/network failures.
      if (
        error instanceof TypeError &&
        (errorMessage === "Failed to fetch" ||
          errorMessage.includes("Load failed"))
      ) {
        addLog(
          "cors",
          `Request failed before a response was available`,
          "error",
          `Request: ${method} ${url}\nDuration: ${duration}ms\nCross-origin: ${crossOrigin}\n\nError type: ${errorName}\nError: ${errorDetails}\n\nLikely causes:\n1. Browser/WebView blocked the request before it reached the app\n2. CORS preflight failed\n3. Local network access to Beeper is restricted\n4. The Beeper Desktop API is not reachable`,
        );
      } else {
        addLog(
          "api-error",
          `${method} ${url} - ERROR: ${errorMessage}`,
          "error",
          `Duration: ${duration}ms\nCross-origin: ${crossOrigin}\nError type: ${errorName}\nDetails: ${errorDetails}`,
        );
      }

      throw error;
    }
  };
}

// Utility to format timestamp
function formatTimestamp(date: Date): string {
  return (
    date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) +
    "." +
    String(date.getMilliseconds()).padStart(3, "0")
  );
}

interface DevModeUIProps {
  isGlassesConnected: boolean;
  currentView: "accounts" | "chats" | "messages";
  selectedChannel: string | null;
  selectedConversation: string | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
  accounts?: BeeperAccount[];
  chats?: BeeperChat[];
  error?: string | null;
  showSettings?: boolean;
  isSettingsDefaultOpen?: boolean;
  speechConfig?: SpeechApiConfig | null;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onCloseSettings?: () => void;
  onSaveSettings?: (baseUrl: string, token: string) => void;
  onSaveSpeechSettings?: (
    baseUrl: string,
    token: string,
    model: string,
  ) => void;
  onChannelSelect: (id: string) => void;
  onConversationSelect: (id: string) => void;
  onBack: () => void;
  onSendMessage: (content: string) => void;
  // Expose scroll-to-bottom ref for parent to trigger
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>;
}

export function DevModeUI({
  isGlassesConnected,
  currentView,
  selectedChannel,
  selectedConversation,
  isAuthenticated = false,
  isLoading = false,
  accounts = [],
  chats = [],
  error,
  showSettings = false,
  speechConfig = null,
  onLogout,
  onOpenSettings,
  onCloseSettings,
  onSaveSettings,
  onSaveSpeechSettings,
  onChannelSelect,
  onConversationSelect,
  onBack,
  onSendMessage,
}: DevModeUIProps) {
  // Format chat for display
  const formatChat = (chat: BeeperChat) => {
    const unread = chat.unreadCount > 0 ? ` (${chat.unreadCount})` : "";
    const title =
      chat.title.length > 25 ? chat.title.slice(0, 25) + "..." : chat.title;
    return { ...chat, displayName: `${title}${unread}` };
  };

  const displayedChats = chats.map(formatChat);

  // Debug logs state
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newLogCount, setNewLogCount] = useState(0);

  // Subscribe to new logs
  useEffect(() => {
    onNewLog = (_entry: LogEntry) => {
      setLogs([...globalLogs]);
      if (!showDebugLogs) {
        setNewLogCount((c) => c + 1);
      }
    };
    // Load existing logs
    setLogs([...globalLogs]);

    // Add initial info
    addLog(
      "info",
      `Even Messages Debug Console Initialized`,
      "info",
      `Origin: ${window.location.origin}\nBase API: ${getBeeperConfig()?.baseUrl || "not configured"}`,
    );

    return () => {
      onNewLog = null;
    };
  }, []);

  // Reset new log count when opening logs
  const handleToggleLogs = () => {
    setShowDebugLogs(!showDebugLogs);
    if (!showDebugLogs) {
      setNewLogCount(0);
    }
  };

  const getLogTypeClass = (type: LogEntry["type"]) => {
    switch (type) {
      case "api-request":
        return styles.logRequest;
      case "api-response":
        return styles.logResponse;
      case "api-error":
      case "cors":
        return styles.logError;
      case "console":
        return styles.logConsole;
      default:
        return styles.logInfo;
    }
  };

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "api-request":
        return ">";
      case "api-response":
        return "<";
      case "api-error":
        return "!";
      case "cors":
        return "[X]";
      default:
        return "*";
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1>Even Messages</h1>
      </header>

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorDismiss} onClick={() => {}}>
            Dismiss
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onSave={onSaveSettings!}
          onSaveSpeech={onSaveSpeechSettings!}
          speechConfig={speechConfig}
          onClose={onCloseSettings!}
        />
      )}

      {/* Main Content */}
      <main className={styles.main}>
        {!isAuthenticated && !isLoading && (
          /* Settings Form - always visible when not authenticated */
          <div className={styles.loginSection}>
            <div className={styles.loginCard}>
              <h2>API Configuration</h2>
              <p>
                Enter your API base URL and token to connect to your messaging
                service.
              </p>
              <div className={styles.instructions}>
                <p>
                  <strong>To get your token:</strong>
                </p>
                <ol>
                  <li>
                    Open the <strong>Beeper Desktop App</strong>
                  </li>
                  <li>
                    Go to <strong>Settings</strong> →{" "}
                    <strong>Developer Mode</strong>
                  </li>
                  <li>
                    Start the <strong>Development Server</strong>
                  </li>
                  <li>
                    Scroll to the bottom of the developer page and{" "}
                    <strong>create a token</strong>
                  </li>
                </ol>
              </div>
              <SettingsForm onSave={onSaveSettings!} />
            </div>
          </div>
        )}

        {isLoading && (
          <div className={styles.loginSection}>
            <div className={styles.loginCard}>
              <h2>Loading...</h2>
              <p>Checking for saved configuration...</p>
            </div>
          </div>
        )}

        {isAuthenticated && (
          <>
            {/* Navigation */}
            <nav className={styles.breadcrumb}>
              <button
                onClick={() => onChannelSelect("")}
                className={currentView === "accounts" ? styles.active : ""}
              >
                Accounts
              </button>
              {selectedChannel && (
                <>
                  <span className={styles.separator}>/</span>
                  <button
                    onClick={() => onConversationSelect("")}
                    className={currentView === "chats" ? styles.active : ""}
                  >
                    {selectedChannel === "all"
                      ? "All Chats"
                      : accounts.find((a) => a.accountID === selectedChannel)
                          ?.user.fullName ||
                        accounts.find((a) => a.accountID === selectedChannel)
                          ?.user.username ||
                        "Chats"}
                  </button>
                </>
              )}
              {selectedConversation && (
                <>
                  <span className={styles.separator}>/</span>
                  <span className={styles.active}>
                    {displayedChats.find((c) => c.id === selectedConversation)
                      ?.title || "Chat"}
                  </span>
                </>
              )}
              <button className={styles.logoutButton} onClick={onLogout}>
                Logout
              </button>
            </nav>

            {/* Accounts View */}
            {currentView === "accounts" && (
              <div className={styles.list}>
                <h2>Select an Account</h2>
                <p className={styles.countInfo}>
                  {accounts.length} connected accounts
                </p>

                {accounts.map((account) => (
                  <button
                    key={account.accountID}
                    className={styles.listItem}
                    onClick={() => onChannelSelect(account.accountID)}
                  >
                    <PlatformIcon
                      platformId={account.accountID}
                      size={20}
                      className={styles.icon}
                    />
                    <div className={styles.accountInfo}>
                      <span className={styles.name}>
                        {account.user.fullName ||
                          account.user.username ||
                          "Unknown"}
                      </span>
                      <span className={styles.accountId}>
                        {account.user.username
                          ? `@${account.user.username}`
                          : account.accountID}
                      </span>
                    </div>
                  </button>
                ))}

                <button
                  className={`${styles.listItem} ${styles.allChats}`}
                  onClick={() => onChannelSelect("all")}
                >
                  <PlatformIcon
                    platformId="beeper"
                    size={20}
                    className={styles.icon}
                  />
                  <div className={styles.accountInfo}>
                    <span className={styles.name}>All Chats</span>
                    <span className={styles.accountId}>
                      {chats.length} conversations
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Chats View */}
            {currentView === "chats" && (
              <div className={styles.list}>
                <button className={styles.backButton} onClick={onBack}>
                  Back to Accounts
                </button>
                <h2>Conversations</h2>
                <p className={styles.countInfo}>
                  {displayedChats.length} chats
                </p>

                {displayedChats.length === 0 ? (
                  <p className={styles.emptyState}>No conversations found</p>
                ) : (
                  displayedChats.map((chat) => (
                    <button
                      key={chat.id}
                      className={styles.listItem}
                      onClick={() => onConversationSelect(chat.id)}
                    >
                      <PlatformIcon
                        platformId={chat.accountID}
                        size={20}
                        className={styles.icon}
                      />
                      <div className={styles.convInfo}>
                        <span className={styles.name}>{chat.title}</span>
                        <span className={styles.preview}>
                          {chat.participants.total} participants
                        </span>
                      </div>
                      {chat.unreadCount > 0 && (
                        <span className={styles.badge}>{chat.unreadCount}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Messages View */}
            {currentView === "messages" && (
              <MessagesView
                chatId={selectedConversation}
                onBack={onBack}
                onSendMessage={onSendMessage}
                scrollToBottomRef={undefined}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerTopRow}>
          <p>Even Messages - Development Mode</p>
          <button className={styles.settingsButton} onClick={onOpenSettings}>
            Settings
          </button>
        </div>
        <div className={styles.footerStatus}>
          <span className={styles.statusBadge}>
            <span
              className={`${styles.statusDot} ${isGlassesConnected ? styles.statusOnline : styles.statusOffline}`}
            />
            Glasses
          </span>
          <span className={styles.statusBadge}>
            <span
              className={`${styles.statusDot} ${
                isAuthenticated
                  ? styles.statusOnline
                  : isLoading
                    ? styles.statusPending
                    : styles.statusOffline
              }`}
            />
            Beeper
          </span>
          <span className={styles.statusBadge}>
            <span
              className={`${styles.statusDot} ${
                speechConfig?.baseUrl && speechConfig?.model
                  ? styles.statusOnline
                  : styles.statusOffline
              }`}
            />
            Speech
          </span>
        </div>
        <p className={styles.apiInfo}>
          Beeper API: {getBeeperConfig()?.baseUrl || "http://localhost:23373"}
        </p>
        <p className={styles.apiInfo}>
          Speech API:{" "}
          {speechConfig?.baseUrl ||
            getSpeechApiConfigSync()?.baseUrl ||
            "not configured"}
        </p>
        <button className={styles.showLogsButton} onClick={handleToggleLogs}>
          {showDebugLogs
            ? "Hide logs"
            : `Show logs${newLogCount > 0 ? ` (${newLogCount} new)` : ""}`}
        </button>
      </footer>

      {/* Debug Logs Panel */}
      {showDebugLogs && (
        <DebugLogsPanel
          logs={logs}
          onClose={() => setShowDebugLogs(false)}
          getLogTypeClass={getLogTypeClass}
          getLogIcon={getLogIcon}
        />
      )}
    </div>
  );
}

// Settings Form Component (for inline use)
function SettingsForm({
  onSave,
}: {
  onSave: (baseUrl: string, token: string) => void;
  defaultOpen?: boolean;
}) {
  const savedConfig = getBeeperConfig();
  const [baseUrl, setBaseUrl] = useState(
    savedConfig?.baseUrl || "http://localhost:23373",
  );
  const [token, setToken] = useState(savedConfig?.token || "");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (baseUrl.trim() && token.trim()) {
      onSave(baseUrl.trim(), token.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.settingsForm}>
      <div className={styles.formGroup}>
        <label htmlFor="baseUrl">API Base URL</label>
        <input
          id="baseUrl"
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:23373"
          required
        />
        <span className={styles.hint}>
          The base URL of your messaging API server
        </span>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="token">API Token</label>
        <div className={styles.tokenInputWrapper}>
          <input
            id="token"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your API token"
            required
          />
          <button
            type="button"
            className={styles.toggleToken}
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? "Hide" : "Show"}
          </button>
        </div>
        <span className={styles.hint}>
          Paste your API token from Beeper's Developer Mode
        </span>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.loginButton}>
          Connect
        </button>
      </div>
    </form>
  );
}

type SettingsTab = "beeper" | "speech";

function BeeperSettingsPane({
  onSave,
}: {
  onSave: (baseUrl: string, token: string) => void;
}) {
  const savedConfig = getBeeperConfig();
  const [baseUrl, setBaseUrl] = useState(
    savedConfig?.baseUrl || "http://localhost:23373",
  );
  const [token, setToken] = useState(savedConfig?.token || "");
  const [showToken, setShowToken] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (baseUrl.trim() && token.trim()) {
      onSave(baseUrl.trim(), token.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.modalBody}>
      <div className={styles.formGroup}>
        <label htmlFor="beeperBaseUrl">API Base URL</label>
        <input
          id="beeperBaseUrl"
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:23373"
          required
        />
        <span className={styles.hint}>
          The base URL of your messaging API server
        </span>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="beeperToken">API Token</label>
        <div className={styles.tokenInputWrapper}>
          <input
            id="beeperToken"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your API token"
            required
          />
          <button
            type="button"
            className={styles.toggleToken}
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? "Hide" : "Show"}
          </button>
        </div>
        <span className={styles.hint}>
          Paste your API token from Beeper's Developer Mode
        </span>
      </div>

      <div className={styles.modalActions}>
        <button type="submit" className={styles.saveButton}>
          Save & Connect
        </button>
      </div>
    </form>
  );
}

function SpeechSettingsPane({
  onSave,
  speechConfig,
}: {
  onSave: (baseUrl: string, token: string, model: string) => void;
  speechConfig: SpeechApiConfig | null;
}) {
  const savedConfig = speechConfig || getSpeechApiConfigSync();
  const [baseUrl, setBaseUrl] = useState(savedConfig?.baseUrl || "");
  const [token, setToken] = useState(savedConfig?.token || "");
  const [selectedModel, setSelectedModel] = useState(savedConfig?.model || "");
  const [showToken, setShowToken] = useState(false);
  const [models, setModels] = useState<SpeechProviderModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const handleLoadModels = async () => {
    if (!baseUrl.trim() || !token.trim()) {
      setModelsError("Enter a base URL and token first.");
      return;
    }

    setIsLoadingModels(true);
    setModelsError(null);

    try {
      const nextModels = await listSpeechProviderModels({
        baseUrl: baseUrl.trim(),
        token: token.trim(),
      });
      setModels(nextModels);

      if (nextModels.length === 0) {
        setModelsError("No models were returned by this provider.");
      } else if (!nextModels.some((model) => model.id === selectedModel)) {
        setSelectedModel("");
      }
    } catch (error: any) {
      setModels([]);
      setModelsError(error?.message || "Failed to load models.");
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    onSave(baseUrl.trim(), token.trim(), modelId);
  };

  return (
    <div className={styles.modalBody}>
      <div className={styles.formGroup}>
        <label htmlFor="speechBaseUrl">Speech API Base URL</label>
        <input
          id="speechBaseUrl"
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.example.com/v1"
          required
        />
        <span className={styles.hint}>
          OpenAI-compatible API root. Models are loaded from `/models`.
        </span>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="speechToken">Speech API Token</label>
        <div className={styles.tokenInputWrapper}>
          <input
            id="speechToken"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter provider token"
            required
          />
          <button
            type="button"
            className={styles.toggleToken}
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? "Hide" : "Show"}
          </button>
        </div>
        <span className={styles.hint}>
          Used to fetch available models and for later transcription requests.
        </span>
      </div>

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.saveButton}
          onClick={handleLoadModels}
          disabled={isLoadingModels}
        >
          {isLoadingModels ? "Loading Models..." : "Load Models"}
        </button>
      </div>

      <div className={styles.modelSection}>
        <div className={styles.modelSectionHeader}>
          <h3>Available Models</h3>
          {selectedModel && (
            <span className={styles.selectedModel}>Selected: {selectedModel}</span>
          )}
        </div>

        {modelsError && <p className={styles.inlineError}>{modelsError}</p>}

        {models.length === 0 && !modelsError && (
          <p className={styles.emptyState}>
            Load models to choose the speech-to-text model.
          </p>
        )}

        {models.length > 0 && (
          <div className={styles.modelList}>
            {models.map((model) => (
              <button
                key={model.id}
                type="button"
                className={`${styles.modelItem} ${
                  selectedModel === model.id ? styles.modelItemSelected : ""
                }`}
                onClick={() => handleModelSelect(model.id)}
              >
                <span className={styles.modelName}>{model.id}</span>
                <span className={styles.modelMeta}>
                  {model.owned_by || "provider model"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Settings Modal Component (for modal overlay use)
function SettingsModal({
  onSave,
  onSaveSpeech,
  speechConfig,
  onClose,
}: {
  onSave: (baseUrl: string, token: string) => void;
  onSaveSpeech: (baseUrl: string, token: string, model: string) => void;
  speechConfig: SpeechApiConfig | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("beeper");

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalWide} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Settings</h2>
          <button className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.settingsTabs}>
          <button
            type="button"
            className={`${styles.settingsTab} ${
              activeTab === "beeper" ? styles.settingsTabActive : ""
            }`}
            onClick={() => setActiveTab("beeper")}
          >
            Beeper
          </button>
          <button
            type="button"
            className={`${styles.settingsTab} ${
              activeTab === "speech" ? styles.settingsTabActive : ""
            }`}
            onClick={() => setActiveTab("speech")}
          >
            Speech
          </button>
        </div>

        {activeTab === "beeper" ? (
          <BeeperSettingsPane onSave={onSave} />
        ) : (
          <SpeechSettingsPane onSave={onSaveSpeech} speechConfig={speechConfig} />
        )}

        <div className={styles.modalFooterActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Messages View Component
function MessagesView({
  chatId,
  onBack,
  onSendMessage,
  scrollToBottomRef,
}: {
  chatId: string | null;
  onBack: () => void;
  onSendMessage: (content: string) => void;
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Auto-scroll to bottom when messages load
  const scrollToBottom = (smooth = false) => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      setHasNewMessages(false);
    }
  };

  // Expose scroll function to parent via ref
  useEffect(() => {
    if (scrollToBottomRef) {
      scrollToBottomRef.current = () => scrollToBottom(true);
    }
    return () => {
      if (scrollToBottomRef) {
        scrollToBottomRef.current = null;
      }
    };
  }, [scrollToBottomRef]);

  // Load messages
  useEffect(() => {
    if (chatId) {
      loadMessages();
      prevMessagesLengthRef.current = 0;
      setHasNewMessages(false);
    }
  }, [chatId]);

  // Auto-scroll to bottom when messages change and we're at the bottom
  useEffect(() => {
    if (messages.length === 0) return;

    // Check if we were already at the bottom or if this is first load
    const isAtBottom =
      messageListRef.current &&
      messageListRef.current.scrollHeight -
        messageListRef.current.scrollTop -
        messageListRef.current.clientHeight <
        100;

    if (isAtBottom || prevMessagesLengthRef.current === 0) {
      // Scroll to bottom on initial load or if we were at bottom
      setTimeout(() => scrollToBottom(), 100);
    } else if (messages.length > prevMessagesLengthRef.current) {
      // New message arrived while scrolled up - show badge
      setHasNewMessages(true);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  async function loadMessages() {
    if (!chatId) return;

    setIsLoading(true);
    setError(null);

    try {
      const config = getBeeperConfig();
      if (!config?.token) {
        setError("Not authenticated");
        return;
      }

      const { BeeperClient } = await import("../services");
      const client = new BeeperClient(config);
      const result = await client.listMessages(chatId);
      setMessages(result.messages.reverse()); // Oldest first for display
    } catch (err) {
      console.error("Failed to load messages:", err);
      setError("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem(
      "message",
    ) as HTMLInputElement;
    if (input.value.trim()) {
      onSendMessage(input.value.trim());
      input.value = "";
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get message preview text based on type
  const getMessageContent = (msg: any) => {
    const config = getBeeperConfig();
    const baseUrl = config?.baseUrl || "http://localhost:23373";

    // Text message
    if (msg.text && msg.text.trim()) {
      return msg.text;
    }

    // Media message - show type indicator
    const attachment = msg.attachments?.[0];
    if (attachment) {
      switch (msg.type) {
        case "IMAGE":
        case "VIDEO":
          if (attachment.srcURL) {
            // For images, return the URL to load via assets/serve
            const encodedUrl = encodeURIComponent(attachment.srcURL);
            return `::image:${baseUrl}/v1/assets/serve?url=${encodedUrl}`;
          }
          return "[Image]";
        case "VOICE":
        case "AUDIO":
          if (attachment.isVoiceNote) {
            return "[Voice note]";
          }
          return "[Audio]";
        case "FILE":
          return `[File: ${attachment.filename || "attachment"}]`;
        case "STICKER":
          return "[Sticker]";
        case "LOCATION":
          return "[Location]";
        default:
          return "[Media]";
      }
    }

    // Notice/system message
    if (msg.type === "NOTICE") {
      return msg.text || "[Notice]";
    }

    // Reaction
    if (msg.type === "REACTION") {
      return "[Reaction]";
    }

    return "[Media]";
  };

  return (
    <div className={styles.messages}>
      <button className={styles.backButton} onClick={onBack}>
        Back to Conversations
      </button>

      {isLoading ? (
        <div className={styles.loading}>Loading messages...</div>
      ) : error ? (
        <div className={styles.errorState}>{error}</div>
      ) : (
        <>
          {/* New messages badge */}
          {hasNewMessages && (
            <button
              className={styles.newMessagesBadge}
              onClick={() => scrollToBottom(true)}
            >
              New messages ▼
            </button>
          )}

          <div className={styles.messageList} ref={messageListRef}>
            {messages.length === 0 ? (
              <p className={styles.emptyState}>No messages yet</p>
            ) : (
              messages.map((msg) => {
                const content = getMessageContent(msg);
                const isImage = content.startsWith("::image:");

                return (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.isSender ? styles.outgoing : styles.incoming}`}
                  >
                    {!msg.isSender && (
                      <span className={styles.sender}>{msg.senderName}</span>
                    )}
                    {isImage ? (
                      <img
                        src={content.replace("::image:", "")}
                        alt="Shared image"
                        className={styles.messageImage}
                      />
                    ) : (
                      <p className={styles.content}>{content}</p>
                    )}
                    <span className={styles.time}>
                      {formatTime(msg.timestamp)}
                      {msg.isSender && (
                        <span className={styles.msgStatus}>
                          {msg.reactions?.length ? " +reactions" : ""}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <form className={styles.inputArea} onSubmit={handleSubmit}>
            <input
              name="message"
              type="text"
              placeholder="Type a message..."
              className={styles.input}
            />
            <button type="submit" className={styles.sendButton}>
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// Format logs for clipboard copy
function formatLogsForClipboard(logs: LogEntry[]): string {
  return logs
    .map((log) => {
      const timestamp = formatTimestamp(log.timestamp);
      const icon = getLogIconStatic(log.type);
      let line = `${timestamp} ${icon} ${log.message}`;
      if (log.details) {
        line += `\n${log.details}`;
      }
      return line;
    })
    .join("\n");
}

function getLogIconStatic(type: LogEntry["type"]): string {
  switch (type) {
    case "api-request":
      return ">";
    case "api-response":
      return "<";
    case "api-error":
      return "!";
    case "cors":
      return "[X]";
    default:
      return "*";
  }
}

// Debug Logs Panel Component
function DebugLogsPanel({
  logs,
  onClose,
  getLogTypeClass,
  getLogIcon,
}: {
  logs: LogEntry[];
  onClose: () => void;
  getLogTypeClass: (type: LogEntry["type"]) => string;
  getLogIcon: (type: LogEntry["type"]) => string;
}) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const debugContentRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const scrollToBottom = (smooth = false) => {
    logsEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const handleScroll = () => {
    if (!debugContentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = debugContentRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setAutoScroll(isAtBottom);
  };

  const handleCopy = async () => {
    const text = formatLogsForClipboard(logs);
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom(true);
    }
  }, [logs.length, autoScroll]);

  return (
    <div className={styles.debugPanel}>
      <div className={styles.debugHeader}>
        <span className={styles.debugTitle}>Debug Console</span>
        <div className={styles.debugActions}>
          <button
            className={`${styles.debugCopy} ${copySuccess ? styles.debugCopySuccess : ""}`}
            onClick={handleCopy}
            title="Copy all logs to clipboard"
          >
            {copySuccess ? "✓ Copied" : "Copy all"}
          </button>
          {!autoScroll && (
            <button
              className={styles.debugScrollBtn}
              onClick={() => {
                setAutoScroll(true);
                scrollToBottom(true);
              }}
              title="Resume auto-scroll"
            >
              ↓ Auto
            </button>
          )}
          <button
            className={styles.debugClear}
            onClick={() => (globalLogs.length = 0)}
          >
            Clear
          </button>
          <button className={styles.debugClose} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div
        className={styles.debugContent}
        ref={debugContentRef}
        onScroll={handleScroll}
      >
        {logs.length === 0 ? (
          <div className={styles.debugEmpty}>No logs yet</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`${styles.debugEntry} ${getLogTypeClass(log.type)}`}
            >
              <span className={styles.logTime}>
                {formatTimestamp(log.timestamp)}
              </span>
              <span className={styles.logIcon}>{getLogIcon(log.type)}</span>
              <span className={styles.logMessage}>{log.message}</span>
              {log.details && (
                <pre className={styles.logDetails}>{log.details}</pre>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
      <div className={styles.debugFooter}>
        <span>{logs.length} log entries</span>
        <span>{autoScroll ? "Auto-scrolling" : "Scroll paused"}</span>
      </div>
    </div>
  );
}
