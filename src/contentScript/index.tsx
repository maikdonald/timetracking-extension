import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const nodeToInsertBefore = document.querySelector(".TimesheetSummary__divider") || document.querySelector(".ApprovalSummary");

const rootElement = document.createElement("div");
rootElement.id = "timetracking-extension-data";

nodeToInsertBefore!.parentNode!.insertBefore(rootElement, nodeToInsertBefore)

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);