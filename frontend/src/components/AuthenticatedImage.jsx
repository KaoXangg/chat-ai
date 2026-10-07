import { useEffect, useState } from "react";
import api from "../api/axios.js";

export default function AuthenticatedImage({ src, ...props }) {
  const [loaded, setLoaded] = useState(null);
  const remote = src.startsWith("/conversations/");

  useEffect(() => {
    if (!remote) return;
    const controller = new AbortController();
    let objectUrl;
    api.get(src, { responseType: "blob", signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(data);
        setLoaded({ src, url: objectUrl });
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, remote]);

  return <img {...props} loading="lazy" src={remote ? (loaded?.src === src ? loaded.url : undefined) : src} />;
}
