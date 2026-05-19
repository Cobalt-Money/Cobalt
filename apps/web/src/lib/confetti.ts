import confetti from "canvas-confetti";

export function fireSideCannons() {
  const end = Date.now() + 3000;
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
  const frame = () => {
    if (Date.now() > end) {
      return;
    }
    confetti({
      angle: 60,
      colors,
      origin: { x: 0, y: 0.5 },
      particleCount: 2,
      spread: 55,
      startVelocity: 60,
    });
    confetti({
      angle: 120,
      colors,
      origin: { x: 1, y: 0.5 },
      particleCount: 2,
      spread: 55,
      startVelocity: 60,
    });
    requestAnimationFrame(frame);
  };
  frame();
}
