/**
 * Phân tích User-Agent để nhận diện thiết bị, hệ điều hành và trình duyệt
 */
export function parseUserAgent(uaString = "") {
  const ua = String(uaString).toLowerCase();

  // 1. Device Type
  let deviceType = "desktop";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = "tablet";
  } else if (/iphone|ipod|mobile|android/i.test(ua)) {
    deviceType = "mobile";
  }

  // 2. OS
  let os = "Khác";
  if (/windows nt 10\.0/i.test(ua)) {
    // Windows 10 hoặc 11 (user agent đều là NT 10.0)
    os = "Windows 10/11";
  } else if (/windows nt 6\.3/i.test(ua)) {
    os = "Windows 8.1";
  } else if (/windows nt 6\.1/i.test(ua)) {
    os = "Windows 7";
  } else if (/windows/i.test(ua)) {
    os = "Windows";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/os (\d+[._]\d+)/);
    os = match ? `iOS ${match[1].replace("_", ".")}` : "iOS";
  } else if (/mac os x/i.test(ua)) {
    const match = ua.match(/mac os x (\d+[._]\d+)/);
    os = match ? `macOS ${match[1].replace("_", ".")}` : "macOS";
  } else if (/android/i.test(ua)) {
    const match = ua.match(/android (\d+(\.\d+)?)/);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  }

  // 3. Browser
  let browser = "Trình duyệt khác";
  if (/edg\//i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/opr\/|opera/i.test(ua)) {
    browser = "Opera";
  } else if (/chrome|crios/i.test(ua)) {
    browser = "Google Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Mozilla Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = "Apple Safari";
  }

  return { deviceType, os, browser };
}
