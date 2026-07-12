import { useEffect, useState } from "react";
import api from "./api/client";

function App() {
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setStatus(JSON.stringify(res.data)))
      .catch((err) => setStatus(`error: ${err.message}`));
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 40 }}>
      <h1>AssetFlow</h1>
      <p>Backend health check:</p>
      <pre>{status}</pre>
    </div>
  );
}

export default App;
