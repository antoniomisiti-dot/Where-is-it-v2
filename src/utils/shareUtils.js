/**
 * Utility functions for sharing and clipboard operations
 */

export async function sharePoint(lat, lng, note) {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const text = note
    ? `Saved location: "${note}"\n${url}`
    : `Here is my location: ${url}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Location',
        text: text,
        url: url
      });
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return false;
    }
  } else {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard failed:', err);
      return false;
    }
  }
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Clipboard failed:', err);
    return false;
  }
}

export async function shareText(text, title = 'Share') {
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        text: text
      });
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return false;
    }
  } else {
    return await copyToClipboard(text);
  }
}
