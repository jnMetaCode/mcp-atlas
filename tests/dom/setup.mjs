import { JSDOM } from "jsdom";
const dom = new JSDOM(
  '<!doctype html><html lang="zh-CN"><head></head><body></body></html>',
  { url: "https://directory.example/servers/", pretendToBeVisual: true },
);
for (const key of [
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "sessionStorage",
  "localStorage",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "PopStateEvent",
  "Storage",
  "MutationObserver",
])
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: dom.window[key],
  });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
// jsdom does not load remote resources or execute third-party scripts in this setup.
