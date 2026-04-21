module.exports.requestGroupActions = [
  {
    label: "Send All Requests",
    action: async (context, data) => {
      const { requests, requestGroup } = data;
      const results = [];

      for (const request of requests) {
        try {
          const response = await context.network.sendRequest(request);
          results.push({
            requestName: request.name,
            requestMethod: request.method,
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
            elapsedTime: response.elapsedTime,
            bytesRead: response.bytesRead,
          });
        } catch (error) {
          results.push({
            requestName: request.name,
            requestMethod: request.method,
            statusCode: null,
            statusMessage: getErrorMessage(error),
            elapsedTime: null,
            bytesRead: null,
          });
        }
      }

      const element = createResultsDialog(results);

      context.app.dialog(`Send All Requests - ${requestGroup.name}`, element, {
        onHide() {},
      });
    },
  },
];

function createResultsDialog(results) {
  const summary = summarizeResults(results);
  const content =
    results.length > 0
      ? `<div class="run-folder-table-wrapper">
         <table class="run-folder-table">
           <colgroup>
             <col class="run-folder-col-request" />
             <col class="run-folder-col-status" />
             <col class="run-folder-col-time" />
             <col class="run-folder-col-size" />
           </colgroup>
           <thead>
             <tr>
               <th>Request</th>
               <th>Status</th>
               <th>Time</th>
               <th>Size</th>
             </tr>
           </thead>
           <tbody>
             ${results.map(renderRow).join("\n")}
           </tbody>
         </table>
       </div>`
      : `<div class="run-folder-empty-state">This folder does not contain any runnable requests.</div>`;

  const html = `<html>
    <body>
      <div class="run-folder-root">
        <style>${getDialogCss()}</style>
        <div class="run-folder-modal">
          <div class="run-folder-summary">
            <div class="run-folder-summary-card">
              <span class="run-folder-summary-label">Requests</span>
              <strong>${summary.total}</strong>
            </div>
            <div class="run-folder-summary-card">
              <span class="run-folder-summary-label">Successful</span>
              <strong>${summary.successful}</strong>
            </div>
            <div class="run-folder-summary-card">
              <span class="run-folder-summary-label">Failed</span>
              <strong>${summary.failed}</strong>
            </div>
            <div class="run-folder-summary-card">
              <span class="run-folder-summary-label">Total Time</span>
              <strong>${escapeHtml(formatDuration(summary.totalElapsedTime))}</strong>
            </div>
          </div>
          ${content}
        </div>
      </div>
    </body>
  </html>`;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  return doc.body.firstElementChild;
}

function renderRow(result) {
  const statusMeta = getStatusMeta(result.statusCode);
  const statusText = result.statusCode
    ? `${result.statusCode} ${result.statusMessage || ""}`.trim()
    : result.statusMessage;
  const requestName = result.requestName || "Unnamed request";

  return `<tr>
    <td>
      <div class="run-folder-request-cell">
        <span class="run-folder-method">${escapeHtml(result.requestMethod || "REQ")}</span>
        <span class="run-folder-request-name" title="${escapeHtml(requestName)}">${escapeHtml(requestName)}</span>
      </div>
    </td>
    <td>
      <span
        class="run-folder-status-badge"
        title="${escapeHtml(statusText || "No response")}"
        style="--status-color: ${statusMeta.textColor}; --status-background: ${statusMeta.backgroundColor};"
      >
        ${escapeHtml(statusText || "No response")}
      </span>
    </td>
    <td class="run-folder-number">${escapeHtml(formatDuration(result.elapsedTime))}</td>
    <td class="run-folder-number">${escapeHtml(formatBytes(result.bytesRead))}</td>
  </tr>`;
}

function summarizeResults(results) {
  return results.reduce(
    (summary, result) => {
      summary.total += 1;

      if (isSuccessful(result.statusCode)) {
        summary.successful += 1;
      } else {
        summary.failed += 1;
      }

      if (
        typeof result.elapsedTime === "number" &&
        Number.isFinite(result.elapsedTime)
      ) {
        summary.totalElapsedTime += result.elapsedTime;
      }

      return summary;
    },
    {
      total: 0,
      successful: 0,
      failed: 0,
      totalElapsedTime: 0,
    },
  );
}

function getStatusMeta(statusCode) {
  if (typeof statusCode !== "number") {
    return {
      textColor: "#fca5a5",
      backgroundColor: "rgba(239, 68, 68, 0.18)",
    };
  }

  if (statusCode >= 200 && statusCode < 300) {
    return {
      textColor: "#86efac",
      backgroundColor: "rgba(34, 197, 94, 0.16)",
    };
  }

  if (statusCode >= 300 && statusCode < 400) {
    return {
      textColor: "#93c5fd",
      backgroundColor: "rgba(59, 130, 246, 0.16)",
    };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return {
      textColor: "#fdba74",
      backgroundColor: "rgba(249, 115, 22, 0.18)",
    };
  }

  return {
    textColor: "#fca5a5",
    backgroundColor: "rgba(239, 68, 68, 0.18)",
  };
}

function isSuccessful(statusCode) {
  return typeof statusCode === "number" && statusCode < 400;
}

function formatDuration(durationInMillis) {
  if (
    typeof durationInMillis !== "number" ||
    !Number.isFinite(durationInMillis)
  ) {
    return "-";
  }

  if (durationInMillis < 1000) {
    return `${durationInMillis.toFixed(0)} ms`;
  }

  const seconds = durationInMillis / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}

function formatBytes(bytesRead) {
  if (
    typeof bytesRead !== "number" ||
    !Number.isFinite(bytesRead) ||
    bytesRead < 0
  ) {
    return "-";
  }

  if (bytesRead < 1024) {
    return `${bytesRead} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytesRead / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function getErrorMessage(error) {
  if (!error) {
    return "Request failed";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Request failed";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDialogCss() {
  return `
    .run-folder-root {
      margin: 0;
      padding: 0;
      background: transparent;
      color: inherit;
      font-family: inherit;
    }

    .run-folder-root * {
      box-sizing: border-box;
    }

    .run-folder-root .run-folder-modal {
      width: min(960px, 92vw);
      max-width: 100%;
      color: inherit;
    }

    .run-folder-root .run-folder-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .run-folder-root .run-folder-summary-card {
      border: 1px solid rgba(127, 127, 127, 0.28);
      border-radius: 12px;
      padding: 12px 14px;
      background: rgba(127, 127, 127, 0.10);
    }

    .run-folder-root .run-folder-summary-card strong {
      display: block;
      font-size: 20px;
      line-height: 1.2;
    }

    .run-folder-root .run-folder-summary-label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.72;
    }

    .run-folder-root .run-folder-table-wrapper {
      overflow-x: hidden;
      overflow-y: auto;
      max-height: 60vh;
      border: 1px solid rgba(127, 127, 127, 0.28);
      border-radius: 14px;
      background: rgba(127, 127, 127, 0.06);
    }

    .run-folder-root .run-folder-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .run-folder-root .run-folder-col-request {
      width: auto;
    }

    .run-folder-root .run-folder-col-status {
      width: 120px;
    }

    .run-folder-root .run-folder-col-time,
    .run-folder-root .run-folder-col-size {
      width: 76px;
    }

    .run-folder-root .run-folder-table thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 12px 10px;
      text-align: left;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: rgba(127, 127, 127, 0.16);
      backdrop-filter: blur(8px);
    }

    .run-folder-root .run-folder-table tbody tr:nth-child(even) {
      background: rgba(127, 127, 127, 0.06);
    }

    .run-folder-root .run-folder-table td {
      padding: 10px;
      border-top: 1px solid rgba(127, 127, 127, 0.16);
      vertical-align: middle;
    }

    .run-folder-root .run-folder-table th:nth-child(2),
    .run-folder-root .run-folder-table td:nth-child(2),
    .run-folder-root .run-folder-table th:nth-child(3),
    .run-folder-root .run-folder-table td:nth-child(3),
    .run-folder-root .run-folder-table th:nth-child(4),
    .run-folder-root .run-folder-table td:nth-child(4) {
      white-space: nowrap;
    }

    .run-folder-root .run-folder-request-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .run-folder-root .run-folder-method {
      flex: 0 0 auto;
      min-width: 50px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(59, 130, 246, 0.16);
      color: #93c5fd;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-align: center;
    }

    .run-folder-root .run-folder-request-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .run-folder-root .run-folder-status-badge {
      display: block;
      width: 100%;
      max-width: 100%;
      padding: 5px 10px;
      border-radius: 999px;
      background: var(--status-background);
      color: var(--status-color);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: middle;
    }

    .run-folder-root .run-folder-number {
      white-space: nowrap;
    }

    .run-folder-root .run-folder-empty-state {
      padding: 32px 16px;
      border: 1px dashed rgba(127, 127, 127, 0.36);
      border-radius: 12px;
      text-align: center;
      opacity: 0.8;
    }
  `;
}
