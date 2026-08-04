export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function getMapUrl(lat, lng) {
  return isIOS()
    ? `maps://maps.apple.com/?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function openMap(lat, lng) {
  window.open(getMapUrl(lat, lng), '_blank');
}

export async function sharePoint(lat, lng, note) {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const text = note
    ? `Saved location: "${note}"\n${url}`
    : `Here is my location: ${url}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: note ? `Where is it? - ${note}` : 'My location',
        text: text,
        url: url
      });
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Location link copied to clipboard!');
    } catch {
      alert('Could not copy to clipboard.');
    }
  } else {
    alert('Sharing not supported on this device.');
  }
}