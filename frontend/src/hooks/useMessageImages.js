import { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";

/**
 * Chuẩn hóa ảnh của một tin nhắn thành danh sách mô tả:
 *  - { src }  : ảnh có sẵn tại client (tin nhắn vừa gửi: data URL) hoặc dữ liệu base64 kiểu cũ.
 *  - { url }  : ảnh nằm trên server (GET /conversations/:id/messages trả về { url }, KHÔNG kèm base64).
 */
function describeImages(images, imageBase64, imageMimeType) {
  if (images?.length) {
    return images.map((img) => (img.url ? { url: img.url } : { src: `data:${img.mimeType};base64,${img.data}` }));
  }
  if (imageBase64) return [{ src: `data:${imageMimeType};base64,${imageBase64}` }];
  return [];
}

/**
 * Trả về [{ src, failed }] cho từng ảnh của tin nhắn.
 * Endpoint ảnh trên server yêu cầu header Authorization nên KHÔNG thể đặt thẳng vào <img src>:
 * hook tải ảnh bằng axios (đã gắn token) rồi tạo blob URL, và thu hồi blob URL khi không còn dùng.
 * src = null và failed = false nghĩa là đang tải.
 */
export function useMessageImages(message) {
  const { images, imageBase64, imageMimeType } = message;
  const descriptors = useMemo(() => describeImages(images, imageBase64, imageMimeType), [images, imageBase64, imageMimeType]);
  const remoteKey = descriptors.map((d) => d.url || "").join("|");
  const [remote, setRemote] = useState({ key: "", values: {} });

  useEffect(() => {
    const urls = [...new Set(descriptors.filter((d) => d.url).map((d) => d.url))];
    if (urls.length === 0) return undefined;

    let cancelled = false;
    const controller = new AbortController();
    setRemote({ key: remoteKey, values: {} });
    const created = [];
    urls.forEach(async (url) => {
      try {
        const res = await api.get(url, { responseType: "blob", signal: controller.signal });
        const objectUrl = URL.createObjectURL(res.data);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        created.push(objectUrl);
        setRemote((prev) => ({ key: remoteKey, values: { ...prev.values, [url]: objectUrl } }));
      } catch {
        if (!cancelled) setRemote((prev) => ({ key: remoteKey, values: { ...prev.values, [url]: "error" } }));
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
      created.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteKey]);

  return descriptors.map((d) => {
    if (d.src) return { src: d.src, failed: false };
    const value = remote.key === remoteKey ? remote.values[d.url] : null;
    if (value === "error") return { src: null, failed: true };
    return { src: value || null, failed: false };
  });
}
