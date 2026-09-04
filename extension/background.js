/// <reference types="firefox-webext-browser" />
const config = {
    mode: "detailed"
};
let nativePort = null;
function connect() {
    if (nativePort) {
        return nativePort;
    }
    try {
        nativePort = browser.runtime.connectNative("firefox_logger");
        nativePort.onDisconnect.addListener(() => {
            nativePort = null;
        });
        return nativePort;
    }
    catch (error) {
        console.error("[NATIVE CONNECT ERROR]", error);
        nativePort = null;
        return null;
    }
}
function send(event) {
    const port = connect();
    if (!port) {
        return;
    }
    try {
        console.error("[SEND ATTEMPT]");
        console.error("[SEND DATA]", JSON.stringify(event.data));
        port.postMessage({
            type: "event",
            event
        });
        console.error("[SEND SUCCESS]");
    }
    catch (error) {
        console.error("[SEND ERROR]", error);
        nativePort = null;
    }
}
function createEvent(type, data = {}) {
    return {
        id: crypto.randomUUID(),
        type,
        timestamp: new Date().toISOString(),
        ...data
    };
}
function prepareData(data) {
    if (config.mode !== "detailed")
        return undefined;
    const requestBody = data.requestBody;
    if (!requestBody)
        return data;
    const result = { ...data };
    if (requestBody.formData) {
        result.requestBody = { formData: requestBody.formData };
        return result;
    }
    if (requestBody.raw) {
        result.requestBody = {
            raw: requestBody.raw.map(part => {
                const bytes = part.bytes;
                if (bytes && typeof bytes.byteLength === "number") {
                    const view = new Uint8Array(bytes);
                    return {
                        bytes: Array.from(view)
                    };
                }
                return {
                    bytes: null
                };
            }),
            lenientFormData: requestBody.lenientFormData
        };
    }
    return result;
}
function prepareHeaders(headers) {
    if (config.mode !== "detailed" || !headers) {
        return undefined;
    }
    return headers.map(header => ({
        name: header.name,
        value: typeof header.value === "string" ? header.value : ""
    }));
}
browser.webRequest.onBeforeRequest.addListener(details => {
    const body = details.requestBody;
    console.error("[BODY TYPE]", body?.raw?.[0]?.bytes?.constructor?.name);
    console.error("[BODY PROTO]", Object.prototype.toString.call(body?.raw?.[0]?.bytes));
    console.error("[BODY LENGTH]", body?.raw?.[0]?.bytes?.byteLength);
    const prepared = prepareData({
        requestBody: details.requestBody
    });
    const preparedBody = prepared?.requestBody?.raw?.[0]?.bytes;
    console.error("[PREPARED TYPE]", preparedBody?.constructor?.name);
    console.error("[PREPARED LENGTH]", preparedBody?.length);
    console.error("[PREPARED SAMPLE]", Array.isArray(preparedBody) ? preparedBody.slice(0, 20) : preparedBody);
    send(createEvent("request", {
        tabId: details.tabId,
        url: details.url,
        requestId: details.requestId,
        resourceType: details.type,
        initiator: details.initiator,
        method: details.method,
        data: prepared
    }));
}, {
    urls: ["<all_urls>"]
}, ["requestBody"]);
browser.webRequest.onBeforeSendHeaders.addListener(details => {
    send(createEvent("request_headers", {
        tabId: details.tabId,
        url: details.url,
        requestId: details.requestId,
        resourceType: details.type,
        initiator: details.initiator,
        requestHeaders: prepareHeaders(details.requestHeaders)
    }));
}, {
    urls: ["<all_urls>"]
}, ["requestHeaders"]);
browser.webRequest.onHeadersReceived.addListener(details => {
    send(createEvent("response", {
        tabId: details.tabId,
        url: details.url,
        requestId: details.requestId,
        statusCode: details.statusCode,
        resourceType: details.type,
        initiator: details.initiator,
        responseHeaders: prepareHeaders(details.responseHeaders)
    }));
}, {
    urls: ["<all_urls>"]
}, ["responseHeaders"]);
browser.webRequest.onCompleted.addListener(details => {
    send(createEvent("request_completed", {
        tabId: details.tabId,
        url: details.url,
        requestId: details.requestId,
        statusCode: details.statusCode,
        resourceType: details.type
    }));
}, {
    urls: ["<all_urls>"]
});
browser.webRequest.onErrorOccurred.addListener(details => {
    send(createEvent("request_error", {
        tabId: details.tabId,
        url: details.url,
        requestId: details.requestId,
        resourceType: details.type,
        data: prepareData({
            error: details.error
        })
    }));
}, {
    urls: ["<all_urls>"]
});
browser.webRequest.onBeforeRequest.addListener(details => {
    if (details.type !== "websocket") {
        return;
    }
    send(createEvent("websocket", {
        tabId: details.tabId,
        url: details.url,
        requestId: details.requestId,
        resourceType: details.type,
        initiator: details.initiator,
        method: details.method
    }));
}, {
    urls: ["<all_urls>"],
    types: ["websocket"]
});
browser.downloads.onCreated.addListener(download => {
    send(createEvent("download", {
        url: download.url,
        data: prepareData({
            id: download.id,
            filename: download.filename,
            mime: download.mime,
            fileSize: download.fileSize,
            totalBytes: download.totalBytes,
            state: download.state
        })
    }));
});
browser.tabs.onCreated.addListener(tab => {
    send(createEvent("tab_created", {
        tabId: tab.id,
        windowId: tab.windowId,
        url: tab.url
    }));
});
browser.tabs.onRemoved.addListener((tabId, info) => {
    send(createEvent("tab_closed", {
        tabId,
        windowId: info.windowId
    }));
});
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    send(createEvent("tab_updated", {
        tabId,
        windowId: tab.windowId,
        url: changeInfo.url
    }));
});
browser.runtime.onStartup.addListener(() => {
    send(createEvent("browser_start"));
});
browser.runtime.onInstalled.addListener(() => {
    send(createEvent("extension_installed"));
});
connect();
export {};
