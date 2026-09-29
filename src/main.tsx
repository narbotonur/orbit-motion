import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import Translator from "./Translator.tsx";
import "./styles.css";

class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error">
          <h1>Связь прервалась</h1>
          <p>
            Не удалось отобразить приложение. Перезагрузи страницу, чтобы отключить
            текущую камеру и начать заново.
          </p>
          <button className="primary-button" onClick={() => location.reload()}>
            Перезагрузить
          </button>
        </main>
      );
    return this.props.children;
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    {new URLSearchParams(location.search).get("mode") === "translator" ? <Translator /> : <App />}
  </ErrorBoundary>,
);
