export function bindPreviewForms(root: ParentNode) {
  const cleanups: Array<() => void> = [];
  root.querySelectorAll("form[data-preview]").forEach((form) => {
    const onSubmit = (event: Event) => {
      event.preventDefault();
      const note = form.querySelector(".success");
      if (note instanceof HTMLElement) note.style.display = "block";
      if (form instanceof HTMLFormElement) form.reset();
    };
    form.addEventListener("submit", onSubmit);
    cleanups.push(() => form.removeEventListener("submit", onSubmit));
  });
  return () => cleanups.forEach((stop) => stop());
}

export function startCarousel(root: ParentNode) {
  const bookCarousel = root.querySelector(".book-carousel");
  if (!(bookCarousel instanceof HTMLElement)) return () => {};
  const found = bookCarousel.querySelector(".book-track");
  if (!(found instanceof HTMLElement)) return () => {};
  const track: HTMLElement = found;

  const originals = [...track.children];
  const count = originals.length;
  const copies: HTMLElement[] = [];
  originals.slice(0, 3).forEach((book) => {
    const copy = book.cloneNode(true);
    if (copy instanceof HTMLElement) {
      copy.setAttribute("aria-hidden", "true");
      copy.setAttribute("tabindex", "-1");
      track.appendChild(copy);
      copies.push(copy);
    }
  });

  let index = 0;
  let timer = 0;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function shift() {
    const card = track.children[0];
    if (!(card instanceof HTMLElement)) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  function go(next: number, animate: boolean) {
    index = next;
    track.style.transition = animate ? "" : "none";
    track.style.transform = `translateX(${-index * shift()}px)`;
    if (!animate) track.offsetHeight;
  }

  function step() {
    go(index + 1, true);
    if (index < count) return;
    const finish = () => {
      track.removeEventListener("transitionend", onEnd);
      go(0, false);
    };
    const onEnd = (event: Event) => {
      if (!(event instanceof TransitionEvent)) return;
      if (event.target !== track || event.propertyName !== "transform") return;
      finish();
    };
    track.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, 1400);
  }

  function start() {
    if (motion.matches || timer) return;
    timer = window.setInterval(step, 3000);
  }

  function stop() {
    window.clearInterval(timer);
    timer = 0;
  }

  const onEnter = () => stop();
  const onLeave = () => start();
  const onResize = () => go(0, false);
  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };

  bookCarousel.addEventListener("mouseenter", onEnter);
  bookCarousel.addEventListener("mouseleave", onLeave);
  bookCarousel.addEventListener("focusin", onEnter);
  bookCarousel.addEventListener("focusout", onLeave);
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);
  start();

  return () => {
    stop();
    copies.forEach((copy) => copy.remove());
    track.style.transition = "none";
    track.style.transform = "";
    bookCarousel.removeEventListener("mouseenter", onEnter);
    bookCarousel.removeEventListener("mouseleave", onLeave);
    bookCarousel.removeEventListener("focusin", onEnter);
    bookCarousel.removeEventListener("focusout", onLeave);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
