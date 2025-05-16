function main() {
  const img = document.getElementById("main-img");
  
  const pollAndUpdateImg = async (img) => {
    // poll the users clipboard.
    // if there is an image in the clipboard, update the img src to the b64 string of that image.
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onloadend = () => {
              img.src = reader.result;
            };
            reader.readAsDataURL(blob);
            return; // Found an image, no need to check further
          }
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      // Potentially request permission or inform the user
    }
  }
  setInterval(() => {
    pollAndUpdateImg(img)
  }, 100);
}

document.addEventListener("DOMContentLoaded", () => {
  main();
});
