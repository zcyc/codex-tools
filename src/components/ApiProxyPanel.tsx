import { useEffect, useState } from "react";

import { useI18n } from "../i18n/I18nProvider";
import { EditorMultiSelect, type MultiSelectOption } from "./EditorMultiSelect";
import type {
  ApiProxyStatus,
  CloudflaredStatus,
  CloudflaredTunnelMode,
  RemoteAuthMode,
  RemoteProxyStatus,
  RemoteServerConfig,
  StartCloudflaredTunnelInput,
} from "../types/app";

const DEFAULT_PROXY_PORT = "8787";
const DEFAULT_REMOTE_SSH_PORT = "22";
const DEFAULT_REMOTE_LISTEN_PORT = "8787";

type RemoteServerDraft = {
  id: string;
  label: string;
  host: string;
  sshPort: string;
  sshUser: string;
  authMode: RemoteAuthMode;
  identityFile: string;
  privateKey: string;
  password: string;
  remoteDir: string;
  listenPort: string;
};

type ApiProxyPanelProps = {
  status: ApiProxyStatus;
  cloudflaredStatus: CloudflaredStatus;
  accountCount: number;
  autoStartEnabled: boolean;
  remoteServers: RemoteServerConfig[];
  remoteStatuses: Record<string, RemoteProxyStatus>;
  remoteLogs: Record<string, string>;
  savingSettings: boolean;
  starting: boolean;
  stopping: boolean;
  refreshingApiKey: boolean;
  refreshingRemoteId: string | null;
  deployingRemoteId: string | null;
  startingRemoteId: string | null;
  stoppingRemoteId: string | null;
  readingRemoteLogsId: string | null;
  installingDependencyName: string | null;
  installingDependencyTargetId: string | null;
  installingCloudflared: boolean;
  startingCloudflared: boolean;
  stoppingCloudflared: boolean;
  onStart: (port: number | null) => void;
  onStop: () => void;
  onRefreshApiKey: () => void;
  onRefresh: () => void;
  onToggleAutoStart: (enabled: boolean) => void;
  onUpdateRemoteServers: (servers: RemoteServerConfig[]) => void;
  onRefreshRemoteStatus: (server: RemoteServerConfig) => void;
  onDeployRemote: (server: RemoteServerConfig) => void;
  onStartRemote: (server: RemoteServerConfig) => void;
  onStopRemote: (server: RemoteServerConfig) => void;
  onReadRemoteLogs: (server: RemoteServerConfig) => void;
  onPickLocalIdentityFile: () => Promise<string | null>;
  onRefreshCloudflared: () => void;
  onInstallCloudflared: () => void;
  onStartCloudflared: (input: StartCloudflaredTunnelInput) => void;
  onStopCloudflared: () => void;
};

function copyText(value: string | null) {
  if (!value) {
    return;
  }
  void navigator.clipboard?.writeText(value).catch(() => {});
}

function createRemoteServerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `remote-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createRemoteDraft(): RemoteServerDraft {
  return {
    id: createRemoteServerId(),
    label: "",
    host: "",
    sshPort: DEFAULT_REMOTE_SSH_PORT,
    sshUser: "root",
    authMode: "keyPath",
    identityFile: "",
    privateKey: "",
    password: "",
    remoteDir: "/opt/codex-tools",
    listenPort: DEFAULT_REMOTE_LISTEN_PORT,
  };
}

function configToDraft(server: RemoteServerConfig): RemoteServerDraft {
  return {
    id: server.id,
    label: server.label,
    host: server.host,
    sshPort: String(server.sshPort),
    sshUser: server.sshUser,
    authMode: server.authMode,
    identityFile: server.identityFile ?? "",
    privateKey: server.privateKey ?? "",
    password: server.password ?? "",
    remoteDir: server.remoteDir,
    listenPort: String(server.listenPort),
  };
}

function draftToConfig(draft: RemoteServerDraft): RemoteServerConfig {
  return {
    id: draft.id,
    label: draft.label.trim(),
    host: draft.host.trim(),
    sshPort: Number.parseInt(draft.sshPort, 10) || 0,
    sshUser: draft.sshUser.trim(),
    authMode: draft.authMode,
    identityFile: draft.identityFile.trim() || null,
    privateKey: draft.privateKey.trim() || null,
    password: draft.password.trim() || null,
    remoteDir: draft.remoteDir.trim(),
    listenPort: Number.parseInt(draft.listenPort, 10) || 0,
  };
}

function buildRemoteBaseUrl(draft: RemoteServerDraft) {
  const host = draft.host.trim();
  const port = draft.listenPort.trim();
  if (!host || !port) {
    return "--";
  }
  return `http://${host}:${port}/v1`;
}

const REMOTE_AUTH_OPTIONS: MultiSelectOption<RemoteAuthMode>[] = [
  { id: "keyContent", label: "keyContent" },
  { id: "keyFile", label: "keyFile" },
  { id: "keyPath", label: "keyPath" },
  { id: "password", label: "password" },
];

export function ApiProxyPanel({
  status,
  cloudflaredStatus,
  accountCount,
  autoStartEnabled,
  remoteServers,
  remoteStatuses,
  remoteLogs,
  savingSettings,
  starting,
  stopping,
  refreshingApiKey,
  refreshingRemoteId,
  deployingRemoteId,
  startingRemoteId,
  stoppingRemoteId,
  readingRemoteLogsId,
  installingDependencyName,
  installingDependencyTargetId,
  installingCloudflared,
  startingCloudflared,
  stoppingCloudflared,
  onStart,
  onStop,
  onRefreshApiKey,
  onRefresh,
  onToggleAutoStart,
  onUpdateRemoteServers,
  onRefreshRemoteStatus,
  onDeployRemote,
  onStartRemote,
  onStopRemote,
  onReadRemoteLogs,
  onPickLocalIdentityFile,
  onRefreshCloudflared,
  onInstallCloudflared,
  onStartCloudflared,
  onStopCloudflared,
}: ApiProxyPanelProps) {
  const { copy } = useI18n();
  const proxyCopy = copy.apiProxy;
  const remoteAuthOptions = REMOTE_AUTH_OPTIONS.map((option) => ({
    ...option,
    label:
      option.id === "keyContent"
        ? proxyCopy.remoteAuthKeyContent
        : option.id === "keyFile"
          ? proxyCopy.remoteAuthKeyFile
          : option.id === "keyPath"
            ? proxyCopy.remoteAuthKeyPath
            : proxyCopy.remoteAuthPassword,
  }));
  const busy = starting || stopping;
  const cloudflaredBusy = installingCloudflared || startingCloudflared || stoppingCloudflared;
  const [portInput, setPortInput] = useState(DEFAULT_PROXY_PORT);
  const [publicAccessEnabled, setPublicAccessEnabled] = useState(cloudflaredStatus.running);
  const [tunnelMode, setTunnelMode] = useState<CloudflaredTunnelMode>(
    cloudflaredStatus.tunnelMode ?? "quick",
  );
  const [useHttp2, setUseHttp2] = useState(cloudflaredStatus.useHttp2);
  const [remoteDrafts, setRemoteDrafts] = useState<RemoteServerDraft[]>(() =>
    remoteServers.map(configToDraft),
  );
  const [namedInput, setNamedInput] = useState({
    apiToken: "",
    accountId: "",
    zoneId: "",
    hostname: cloudflaredStatus.customHostname ?? "",
  });
  const cloudflaredEnabled = publicAccessEnabled || cloudflaredStatus.running;

  useEffect(() => {
    setRemoteDrafts(remoteServers.map(configToDraft));
  }, [remoteServers]);

  const rawPort = portInput.trim();
  const effectivePort = !rawPort
    ? 8787
    : Number.isInteger(Number(rawPort)) && Number(rawPort) >= 1 && Number(rawPort) <= 65535
      ? Number(rawPort)
      : null;

  const namedReady =
    namedInput.apiToken.trim() !== "" &&
    namedInput.accountId.trim() !== "" &&
    namedInput.zoneId.trim() !== "" &&
    namedInput.hostname.trim() !== "";

  const canStartCloudflared =
    status.running &&
    status.port !== null &&
    cloudflaredStatus.installed &&
    !cloudflaredBusy &&
    (tunnelMode === "quick" || namedReady);

  const cloudflaredInput: StartCloudflaredTunnelInput | null =
    status.port === null
      ? null
      : {
          apiProxyPort: status.port,
          useHttp2,
          mode: tunnelMode,
          named:
            tunnelMode === "named"
              ? {
                  apiToken: namedInput.apiToken.trim(),
                  accountId: namedInput.accountId.trim(),
                  zoneId: namedInput.zoneId.trim(),
                  hostname: namedInput.hostname.trim(),
                }
              : null,
        };

  const persistRemoteDrafts = (drafts: RemoteServerDraft[]) => {
    onUpdateRemoteServers(drafts.map(draftToConfig));
  };

  const updateRemoteDraft = (
    id: string,
    key: keyof Omit<RemoteServerDraft, "id">,
    value: string | RemoteAuthMode,
  ) => {
    setRemoteDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== id) {
          return draft;
        }
        const next = { ...draft, [key]: value } as RemoteServerDraft;
        if (key === "authMode") {
          if (value !== "keyContent") {
            next.privateKey = "";
          }
          if (value !== "password") {
            next.password = "";
          }
          if (value === "keyContent" || value === "password") {
            next.identityFile = "";
          }
        }
        return next;
      }),
    );
  };

  const addRemoteDraft = () => {
    setRemoteDrafts((current) => [...current, createRemoteDraft()]);
  };

  const removeRemoteDraft = (id: string) => {
    const next = remoteDrafts.filter((draft) => draft.id !== id);
    setRemoteDrafts(next);
    persistRemoteDrafts(next);
  };

  return (
    <section className="proxyPage">
      <div className="proxyShell">
        <header className="proxyPageHeader">
          <div className="proxyPageTitle">
            <p className="proxyKicker">{proxyCopy.kicker}</p>
            <h2>{proxyCopy.title}</h2>
            <p className="proxyPageDescription">{proxyCopy.hint}</p>
          </div>

          <div className="proxyHeaderStats">
            <span className="proxyHeaderStat">
              <span className={`proxyStatusDot${status.running ? " isRunning" : ""}`} aria-hidden="true" />
              <span>{proxyCopy.statusLabel}</span>
              <strong>{status.running ? proxyCopy.statusRunning : proxyCopy.statusStopped}</strong>
            </span>
            <span className="proxyHeaderStat">
              <span>{proxyCopy.portLabel}</span>
              <strong>{status.port ?? "--"}</strong>
            </span>
            <span className="proxyHeaderStat">
              <span>{proxyCopy.accountCountLabel}</span>
              <strong>{accountCount}</strong>
            </span>
          </div>
        </header>

        <section className="proxySectionCard">
          <div className="proxyControlRow">
            <label className="proxyCompactField">
              <span>{proxyCopy.portLabel}</span>
              <input
                className="proxyPortInput"
                inputMode="numeric"
                aria-label={proxyCopy.portInputAriaLabel}
                placeholder={DEFAULT_PROXY_PORT}
                value={portInput}
                onChange={(event) => setPortInput(event.target.value)}
                disabled={busy || status.running}
              />
            </label>

            <div className="proxyInlineSetting">
              <span className="proxyInlineLabel">{proxyCopy.defaultStartLabel}</span>
              <label className="themeSwitch" aria-label={proxyCopy.defaultStartLabel}>
                <input
                  type="checkbox"
                  checked={autoStartEnabled}
                  disabled={savingSettings}
                  onChange={(event) => onToggleAutoStart(event.target.checked)}
                />
                <span className="themeSwitchTrack" aria-hidden="true">
                  <span className="themeSwitchThumb" />
                </span>
                <span className="themeSwitchText">
                  {autoStartEnabled
                    ? proxyCopy.defaultStartEnabled
                    : proxyCopy.defaultStartDisabled}
                </span>
              </label>
            </div>

            <div className="proxyControlActions">
              <button className="ghost" onClick={onRefresh} disabled={busy}>
                {proxyCopy.refreshStatus}
              </button>
              {status.running ? (
                <button className="danger" onClick={onStop} disabled={busy}>
                  {stopping ? proxyCopy.stopping : proxyCopy.stop}
                </button>
              ) : (
                <button
                  className="primary"
                  onClick={() => onStart(effectivePort)}
                  disabled={busy || accountCount === 0 || effectivePort === null}
                >
                  {starting ? proxyCopy.starting : proxyCopy.start}
                </button>
              )}
            </div>
          </div>

          <div className="proxyDetailGrid">
            <article className="proxyDetailCard">
              <div className="proxyDetailHeader">
                <span className="proxyLabel">{proxyCopy.baseUrlLabel}</span>
                <button
                  className="ghost proxyCopyButton"
                  onClick={() => copyText(status.baseUrl)}
                  disabled={!status.baseUrl}
                >
                  {proxyCopy.copy}
                </button>
              </div>
              <code>{status.baseUrl ?? proxyCopy.baseUrlPlaceholder}</code>
            </article>

            <article className="proxyDetailCard">
              <div className="proxyDetailHeader">
                <span className="proxyLabel">{proxyCopy.apiKeyLabel}</span>
                <div className="proxyDetailActions">
                  <button
                    className="ghost proxyCopyButton"
                    onClick={onRefreshApiKey}
                    disabled={refreshingApiKey}
                  >
                    {refreshingApiKey ? proxyCopy.refreshingKey : proxyCopy.refreshKey}
                  </button>
                  <button
                    className="ghost proxyCopyButton"
                    onClick={() => copyText(status.apiKey)}
                    disabled={!status.apiKey}
                  >
                    {proxyCopy.copy}
                  </button>
                </div>
              </div>
              <code>{status.apiKey ?? proxyCopy.apiKeyPlaceholder}</code>
            </article>

            <article className="proxyDetailCard">
              <span className="proxyLabel">{proxyCopy.activeAccountLabel}</span>
              <strong>{status.activeAccountLabel ?? proxyCopy.activeAccountEmptyTitle}</strong>
              <p>{status.activeAccountId ?? proxyCopy.activeAccountEmptyDescription}</p>
            </article>

            <article className="proxyDetailCard">
              <span className="proxyLabel">{proxyCopy.lastErrorLabel}</span>
              <p className="proxyErrorText">{status.lastError ?? proxyCopy.none}</p>
            </article>
          </div>
        </section>

        <section className="proxySectionCard">
          <div className="proxySectionHeader">
            <div>
              <p className="proxyKicker">{proxyCopy.remoteKicker}</p>
              <h3>{proxyCopy.remoteTitle}</h3>
              <p className="proxySectionDescription">{proxyCopy.remoteDescription}</p>
            </div>
            <button className="primary" onClick={addRemoteDraft}>
              {proxyCopy.remoteAddServer}
            </button>
          </div>

          {remoteDrafts.length === 0 ? (
            <article className="remoteEmptyCard">
              <strong>{proxyCopy.remoteEmptyTitle}</strong>
              <p>{proxyCopy.remoteEmptyDescription}</p>
            </article>
          ) : (
            <div className="remoteServerList">
              {remoteDrafts.map((draft) => {
                const remoteStatus = remoteStatuses[draft.id];
                const remoteConfig = draftToConfig(draft);
                const remoteLog = remoteLogs[draft.id];
                const refreshingRemote = refreshingRemoteId === draft.id;
                const deployingRemote = deployingRemoteId === draft.id;
                const startingRemote = startingRemoteId === draft.id;
                const stoppingRemote = stoppingRemoteId === draft.id;
                const readingRemoteLogs = readingRemoteLogsId === draft.id;
                const installingRemoteDependency =
                  installingDependencyName === "sshpass" &&
                  installingDependencyTargetId === draft.id;
                const remoteBusy =
                  refreshingRemote ||
                  deployingRemote ||
                  startingRemote ||
                  stoppingRemote ||
                  installingRemoteDependency;
                const remoteStateText = remoteStatus
                  ? remoteStatus.running
                    ? proxyCopy.statusRunning
                    : proxyCopy.statusStopped
                  : proxyCopy.remoteStatusUnknown;
                const remoteIdentity = draft.label.trim() || draft.host.trim() || proxyCopy.remoteTitle;

                return (
                  <article className="remoteServerCard" key={draft.id}>
                    <div className="remoteServerCardHeader">
                      <div className="remoteServerIdentity">
                        <strong>{remoteIdentity}</strong>
                        <span>{buildRemoteBaseUrl(draft)}</span>
                      </div>
                      <span className={`remoteServerState${remoteStatus?.running ? " isRunning" : ""}`}>
                        <span
                          className={`proxyStatusDot${remoteStatus?.running ? " isRunning" : ""}`}
                          aria-hidden="true"
                        />
                        {remoteStateText}
                      </span>
                    </div>

                    <div className="remoteServerPanel">
                      <div className="remoteServerGrid">
                        <label className="remoteServerField">
                          <span>{proxyCopy.remoteNameLabel}</span>
                          <input
                            value={draft.label}
                            onChange={(event) =>
                              updateRemoteDraft(draft.id, "label", event.target.value)
                            }
                            placeholder="tokyo-01"
                          />
                        </label>
                        <label className="remoteServerField">
                          <span>{proxyCopy.remoteHostLabel}</span>
                          <input
                            value={draft.host}
                            onChange={(event) =>
                              updateRemoteDraft(draft.id, "host", event.target.value)
                            }
                            placeholder="1.2.3.4"
                          />
                        </label>
                        <label className="remoteServerField">
                          <span>{proxyCopy.remoteSshPortLabel}</span>
                          <input
                            inputMode="numeric"
                            value={draft.sshPort}
                            onChange={(event) =>
                              updateRemoteDraft(draft.id, "sshPort", event.target.value)
                            }
                            placeholder={DEFAULT_REMOTE_SSH_PORT}
                          />
                        </label>
                        <label className="remoteServerField">
                          <span>{proxyCopy.remoteUserLabel}</span>
                          <input
                            value={draft.sshUser}
                            onChange={(event) =>
                              updateRemoteDraft(draft.id, "sshUser", event.target.value)
                            }
                            placeholder="root"
                          />
                        </label>
                        <label className="remoteServerField">
                          <span>{proxyCopy.remoteDirLabel}</span>
                          <input
                            value={draft.remoteDir}
                            onChange={(event) =>
                              updateRemoteDraft(draft.id, "remoteDir", event.target.value)
                            }
                            placeholder="/opt/codex-tools"
                          />
                        </label>
                        <label className="remoteServerField">
                          <span>{proxyCopy.remoteListenPortLabel}</span>
                          <input
                            inputMode="numeric"
                            value={draft.listenPort}
                            onChange={(event) =>
                              updateRemoteDraft(draft.id, "listenPort", event.target.value)
                            }
                            placeholder={DEFAULT_REMOTE_LISTEN_PORT}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="remoteServerPanel">
                      <div className="remoteAuthRow">
                        <label className="remoteServerField remoteAuthSelectField">
                          <span>{proxyCopy.remoteAuthLabel}</span>
                          <EditorMultiSelect
                            className="remoteAuthPicker"
                            ariaLabel={proxyCopy.remoteAuthLabel}
                            options={remoteAuthOptions}
                            value={draft.authMode}
                            onChange={(next) => updateRemoteDraft(draft.id, "authMode", next)}
                          />
                        </label>

                        <div className="remoteAuthInputArea">
                          {draft.authMode === "keyContent" ? (
                            <label className="remoteServerField">
                              <span>{proxyCopy.remotePrivateKeyLabel}</span>
                              <textarea
                                className="remoteServerTextarea"
                                value={draft.privateKey}
                                onChange={(event) =>
                                  updateRemoteDraft(draft.id, "privateKey", event.target.value)
                                }
                                placeholder={proxyCopy.remotePrivateKeyPlaceholder}
                              />
                            </label>
                          ) : null}

                          {draft.authMode === "password" ? (
                            <label className="remoteServerField">
                              <span>{proxyCopy.remotePasswordLabel}</span>
                              <input
                                type="password"
                                value={draft.password}
                                onChange={(event) =>
                                  updateRemoteDraft(draft.id, "password", event.target.value)
                                }
                                placeholder={proxyCopy.remotePasswordPlaceholder}
                              />
                            </label>
                          ) : null}

                          {draft.authMode === "keyFile" || draft.authMode === "keyPath" ? (
                            <div className="remoteIdentityRow">
                              <label className="remoteServerField">
                                <span>{proxyCopy.remoteIdentityFileLabel}</span>
                                <input
                                  value={draft.identityFile}
                                  onChange={(event) =>
                                    updateRemoteDraft(draft.id, "identityFile", event.target.value)
                                  }
                                  placeholder={proxyCopy.remoteIdentityFilePlaceholder}
                                />
                              </label>
                              {draft.authMode === "keyFile" ? (
                                <button
                                  className="ghost"
                                  type="button"
                                  onClick={() => {
                                    void onPickLocalIdentityFile().then((value) => {
                                      if (value) {
                                        updateRemoteDraft(draft.id, "identityFile", value);
                                      }
                                    });
                                  }}
                                >
                                  {proxyCopy.remotePickIdentityFile}
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {installingRemoteDependency ? (
                      <div
                        className="remoteDependencyInstall"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <div className="remoteDependencyInstallHeader">
                          <strong>{copy.notices.installingDependency("sshpass")}</strong>
                        </div>
                        <div className="remoteDependencyInstallTrack" aria-hidden="true">
                          <span className="remoteDependencyInstallFill" />
                        </div>
                      </div>
                    ) : null}

                    <div className="remoteServerFooter">
                      <div className="remoteServerActions">
                        <button
                          className="ghost"
                          onClick={() => persistRemoteDrafts(remoteDrafts)}
                          disabled={remoteBusy}
                        >
                          {proxyCopy.remoteSave}
                        </button>
                        <button
                          className="ghost"
                          onClick={() => removeRemoteDraft(draft.id)}
                          disabled={remoteBusy}
                        >
                          {proxyCopy.remoteRemove}
                        </button>
                        <button
                          className="primary"
                          onClick={() => onDeployRemote(remoteConfig)}
                          disabled={remoteBusy}
                        >
                          {deployingRemote ? proxyCopy.remoteDeploying : proxyCopy.remoteDeploy}
                        </button>
                        <button
                          className="ghost"
                          onClick={() => onRefreshRemoteStatus(remoteConfig)}
                          disabled={remoteBusy}
                        >
                          {refreshingRemote ? proxyCopy.remoteRefreshing : proxyCopy.remoteRefresh}
                        </button>
                        {remoteStatus?.running ? (
                          <button
                            className="danger"
                            onClick={() => onStopRemote(remoteConfig)}
                            disabled={remoteBusy}
                          >
                            {stoppingRemote ? proxyCopy.remoteStopping : proxyCopy.remoteStop}
                          </button>
                        ) : (
                          <button
                            className="primary"
                            onClick={() => onStartRemote(remoteConfig)}
                            disabled={remoteBusy}
                          >
                            {startingRemote ? proxyCopy.remoteStarting : proxyCopy.remoteStart}
                          </button>
                        )}
                        <button
                          className="ghost"
                          onClick={() => onReadRemoteLogs(remoteConfig)}
                          disabled={readingRemoteLogs}
                        >
                          {readingRemoteLogs ? proxyCopy.remoteReadingLogs : proxyCopy.remoteReadLogs}
                        </button>
                      </div>

                      <div className="remoteServerStatus">
                        <div className="remoteServerMeta">
                          <span>{proxyCopy.remoteInstalledLabel}</span>
                          <strong>
                            {remoteStatus
                              ? remoteStatus.installed
                                ? proxyCopy.remoteInstalledYes
                                : proxyCopy.remoteInstalledNo
                              : proxyCopy.remoteStatusUnknown}
                          </strong>
                        </div>
                        <div className="remoteServerMeta">
                          <span>{proxyCopy.remoteSystemdLabel}</span>
                          <strong>
                            {remoteStatus
                              ? remoteStatus.serviceInstalled
                                ? proxyCopy.remoteInstalledYes
                                : proxyCopy.remoteInstalledNo
                              : proxyCopy.remoteStatusUnknown}
                          </strong>
                        </div>
                        <div className="remoteServerMeta">
                          <span>{proxyCopy.remoteEnabledLabel}</span>
                          <strong>
                            {remoteStatus
                              ? remoteStatus.enabled
                                ? proxyCopy.remoteInstalledYes
                                : proxyCopy.remoteInstalledNo
                              : proxyCopy.remoteStatusUnknown}
                          </strong>
                        </div>
                        <div className="remoteServerMeta">
                          <span>{proxyCopy.remoteRunningLabel}</span>
                          <strong>{remoteStateText}</strong>
                        </div>
                        <div className="remoteServerMeta">
                          <span>{proxyCopy.remotePidLabel}</span>
                          <strong>{remoteStatus?.pid ?? "--"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="proxyDetailGrid remoteProxyDetailGrid">
                      <article className="proxyDetailCard">
                        <div className="proxyDetailHeader">
                          <span className="proxyLabel">{proxyCopy.remoteBaseUrlLabel}</span>
                          <button
                            className="ghost proxyCopyButton"
                            onClick={() => copyText(remoteStatus?.baseUrl ?? buildRemoteBaseUrl(draft))}
                          >
                            {proxyCopy.copy}
                          </button>
                        </div>
                        <code>{remoteStatus?.baseUrl ?? buildRemoteBaseUrl(draft)}</code>
                      </article>

                      <article className="proxyDetailCard">
                        <div className="proxyDetailHeader">
                          <span className="proxyLabel">{proxyCopy.remoteApiKeyLabel}</span>
                          <button
                            className="ghost proxyCopyButton"
                            onClick={() => copyText(remoteStatus?.apiKey ?? null)}
                            disabled={!remoteStatus?.apiKey}
                          >
                            {proxyCopy.copy}
                          </button>
                        </div>
                        <code>{remoteStatus?.apiKey ?? proxyCopy.apiKeyPlaceholder}</code>
                      </article>

                      <article className="proxyDetailCard">
                        <span className="proxyLabel">{proxyCopy.remoteServiceLabel}</span>
                        <code>{remoteStatus?.serviceName ?? proxyCopy.remoteStatusUnknown}</code>
                      </article>
                    </div>

                    <div className="remoteDiagnosticsGrid">
                      <article className="proxyDetailCard remoteLogCard">
                        <div className="proxyDetailHeader">
                          <span className="proxyLabel">{proxyCopy.remoteLogsLabel}</span>
                          <button
                            className="ghost proxyCopyButton"
                            onClick={() => copyText(remoteLog ?? null)}
                            disabled={!remoteLog}
                          >
                            {proxyCopy.copy}
                          </button>
                        </div>
                        <code className="remoteLogCode">{remoteLog ?? proxyCopy.remoteLogsEmpty}</code>
                      </article>

                      <article className="proxyDetailCard remoteErrorCard">
                        <span className="proxyLabel">{proxyCopy.remoteLastErrorLabel}</span>
                        <p className="proxyErrorText">{remoteStatus?.lastError ?? proxyCopy.none}</p>
                      </article>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="proxySectionCard">
          <div className="proxySectionHeader">
            <div>
              <p className="proxyKicker">{proxyCopy.cloudflaredKicker}</p>
              <h3>{proxyCopy.cloudflaredTitle}</h3>
              <p className="proxySectionDescription">{proxyCopy.cloudflaredDescription}</p>
            </div>
            <div className="proxySectionToggle">
              <span className="proxyInlineLabel">{proxyCopy.cloudflaredToggle}</span>
              <label className="themeSwitch" aria-label={proxyCopy.cloudflaredToggle}>
                <input
                  type="checkbox"
                  checked={publicAccessEnabled}
                  onChange={(event) => setPublicAccessEnabled(event.target.checked)}
                />
                <span className="themeSwitchTrack" aria-hidden="true">
                  <span className="themeSwitchThumb" />
                </span>
                <span className="themeSwitchText">
                  {publicAccessEnabled
                    ? proxyCopy.defaultStartEnabled
                    : proxyCopy.defaultStartDisabled}
                </span>
              </label>
            </div>
          </div>

          {cloudflaredEnabled ? (
            <div className="cloudflaredContent">
              {!status.running ? (
                <article className="cloudflaredCallout">
                  <strong>{proxyCopy.startLocalProxyFirstTitle}</strong>
                  <p>{proxyCopy.startLocalProxyFirstDescription}</p>
                </article>
              ) : null}

              {!cloudflaredStatus.installed ? (
                <article className="cloudflaredInstallCard">
                  <div>
                    <span className="proxyLabel">{proxyCopy.notInstalledLabel}</span>
                    <strong>{proxyCopy.installTitle}</strong>
                    <p>{proxyCopy.installDescription}</p>
                  </div>
                  <button
                    className="primary"
                    onClick={onInstallCloudflared}
                    disabled={installingCloudflared}
                  >
                    {installingCloudflared ? proxyCopy.installing : proxyCopy.installButton}
                  </button>
                </article>
              ) : (
                <>
                  <div className="cloudflaredModeGrid">
                    <button
                      className={`cloudflaredModeCard${tunnelMode === "quick" ? " isActive" : ""}`}
                      onClick={() => setTunnelMode("quick")}
                      disabled={cloudflaredBusy || cloudflaredStatus.running}
                    >
                      <span className="proxyLabel">{proxyCopy.quickModeLabel}</span>
                      <strong>{proxyCopy.quickModeTitle}</strong>
                      <p>{proxyCopy.quickModeDescription}</p>
                    </button>
                    <button
                      className={`cloudflaredModeCard${tunnelMode === "named" ? " isActive" : ""}`}
                      onClick={() => setTunnelMode("named")}
                      disabled={cloudflaredBusy || cloudflaredStatus.running}
                    >
                      <span className="proxyLabel">{proxyCopy.namedModeLabel}</span>
                      <strong>{proxyCopy.namedModeTitle}</strong>
                      <p>{proxyCopy.namedModeDescription}</p>
                    </button>
                  </div>

                  {tunnelMode === "quick" ? (
                    <article className="cloudflaredCallout">
                      <strong>{proxyCopy.quickNoteTitle}</strong>
                      <p>{proxyCopy.quickNoteBody}</p>
                    </article>
                  ) : null}

                  {tunnelMode === "named" ? (
                    <div className="cloudflaredFormGrid">
                      <label className="cloudflaredInputField">
                        <span>{proxyCopy.apiTokenLabel}</span>
                        <input
                          type="password"
                          value={namedInput.apiToken}
                          onChange={(event) =>
                            setNamedInput((current) => ({ ...current, apiToken: event.target.value }))
                          }
                          placeholder={proxyCopy.apiTokenPlaceholder}
                          disabled={cloudflaredBusy || cloudflaredStatus.running}
                        />
                      </label>
                      <label className="cloudflaredInputField">
                        <span>{proxyCopy.accountIdLabel}</span>
                        <input
                          value={namedInput.accountId}
                          onChange={(event) =>
                            setNamedInput((current) => ({ ...current, accountId: event.target.value }))
                          }
                          placeholder={proxyCopy.accountIdPlaceholder}
                          disabled={cloudflaredBusy || cloudflaredStatus.running}
                        />
                      </label>
                      <label className="cloudflaredInputField">
                        <span>{proxyCopy.zoneIdLabel}</span>
                        <input
                          value={namedInput.zoneId}
                          onChange={(event) =>
                            setNamedInput((current) => ({ ...current, zoneId: event.target.value }))
                          }
                          placeholder={proxyCopy.zoneIdPlaceholder}
                          disabled={cloudflaredBusy || cloudflaredStatus.running}
                        />
                      </label>
                      <label className="cloudflaredInputField">
                        <span>{proxyCopy.hostnameLabel}</span>
                        <input
                          value={namedInput.hostname}
                          onChange={(event) =>
                            setNamedInput((current) => ({ ...current, hostname: event.target.value }))
                          }
                          placeholder={proxyCopy.hostnamePlaceholder}
                          disabled={cloudflaredBusy || cloudflaredStatus.running}
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="cloudflaredToolbar">
                    <div className="cloudflaredToolbarMeta">
                      <span className="proxyInlineLabel">{proxyCopy.useHttp2}</span>
                      <label className="themeSwitch" aria-label={proxyCopy.useHttp2}>
                        <input
                          type="checkbox"
                          checked={useHttp2}
                          onChange={(event) => setUseHttp2(event.target.checked)}
                          disabled={cloudflaredBusy || cloudflaredStatus.running}
                        />
                        <span className="themeSwitchTrack" aria-hidden="true">
                          <span className="themeSwitchThumb" />
                        </span>
                        <span className="themeSwitchText">
                          {useHttp2
                            ? proxyCopy.defaultStartEnabled
                            : proxyCopy.defaultStartDisabled}
                        </span>
                      </label>
                    </div>

                    <div className="cloudflaredToolbarActions">
                      <button
                        className="ghost"
                        onClick={onRefreshCloudflared}
                        disabled={cloudflaredBusy}
                      >
                        {proxyCopy.refreshPublicStatus}
                      </button>
                      {cloudflaredStatus.running ? (
                        <button
                          className="danger"
                          onClick={onStopCloudflared}
                          disabled={cloudflaredBusy}
                        >
                          {stoppingCloudflared ? proxyCopy.stoppingPublic : proxyCopy.stopPublic}
                        </button>
                      ) : (
                        <button
                          className="primary"
                          onClick={() => {
                            if (cloudflaredInput) {
                              onStartCloudflared(cloudflaredInput);
                            }
                          }}
                          disabled={!canStartCloudflared || cloudflaredInput === null}
                        >
                          {startingCloudflared ? proxyCopy.startingPublic : proxyCopy.startPublic}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="proxyDetailGrid">
                    <article className="proxyDetailCard">
                      <span className="proxyLabel">{proxyCopy.publicStatusLabel}</span>
                      <strong className={`proxyStatus${cloudflaredStatus.running ? " isRunning" : ""}`}>
                        {cloudflaredStatus.running
                          ? proxyCopy.publicStatusRunning
                          : proxyCopy.publicStatusStopped}
                      </strong>
                      <p>
                        {cloudflaredStatus.running
                          ? proxyCopy.publicStatusRunningDescription
                          : proxyCopy.publicStatusStoppedDescription}
                      </p>
                    </article>

                    <article className="proxyDetailCard">
                      <div className="proxyDetailHeader">
                        <span className="proxyLabel">{proxyCopy.publicUrlLabel}</span>
                        <button
                          className="ghost proxyCopyButton"
                          onClick={() => copyText(cloudflaredStatus.publicUrl)}
                          disabled={!cloudflaredStatus.publicUrl}
                        >
                          {proxyCopy.copy}
                        </button>
                      </div>
                      <code>{cloudflaredStatus.publicUrl ?? proxyCopy.baseUrlPlaceholder}</code>
                    </article>

                    <article className="proxyDetailCard">
                      <span className="proxyLabel">{proxyCopy.installPathLabel}</span>
                      <code>{cloudflaredStatus.binaryPath ?? proxyCopy.notDetected}</code>
                    </article>

                    <article className="proxyDetailCard">
                      <span className="proxyLabel">{proxyCopy.lastErrorLabel}</span>
                      <p className="proxyErrorText">{cloudflaredStatus.lastError ?? proxyCopy.none}</p>
                    </article>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
