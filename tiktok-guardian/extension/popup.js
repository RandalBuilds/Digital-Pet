chrome.runtime.sendMessage({ type: "get_status" }, (response) => {
  const dot = document.getElementById("dot");
  const label = document.getElementById("label");
  if (response && response.connected) {
    dot.classList.add("connected");
    label.textContent = "Connected to desktop app";
  } else {
    dot.classList.add("disconnected");
    label.textContent = "Not connected";
  }
});
