function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ============================================================
   Scroll reveal
   ============================================================ */
function initReveal() {
  if (prefersReducedMotion()) return;

  const nodes = Array.from(document.querySelectorAll(".reveal"));
  if (!nodes.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12 }
  );

  nodes.forEach((n) => observer.observe(n));
}

/* ============================================================
   Hero carousel — crossfade + Ken Burns + progress segments
   ============================================================ */
function initHeroCarousel() {
  const root = document.querySelector("[data-hero]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll("[data-hero-slide]"));
  const dots = Array.from(root.querySelectorAll("[data-hero-dot]"));
  const prevBtn = root.querySelector("[data-hero-prev]");
  const nextBtn = root.querySelector("[data-hero-next]");
  const n = slides.length;
  if (n === 0) return;

  const DURATION = 6500;
  root.style.setProperty("--hero-dur", `${DURATION}ms`);

  const reduced = prefersReducedMotion();
  let index = 0;
  let timerId = null;

  function restartFill(dot) {
    const fill = dot.querySelector(".hero-seg-fill");
    if (!fill) return;
    // Retrigger the CSS fill animation from zero.
    fill.style.animation = "none";
    void fill.offsetWidth;
    fill.style.animation = "";
  }

  function setIndex(next, dir) {
    const newIndex = (next + n) % n;
    const oldSlide = slides[index];
    const newSlide = slides[newIndex];
    const changed = newSlide !== oldSlide;
    index = newIndex;

    if (changed && !reduced && dir) {
      // Directional swipe: incoming slides in from the travel direction,
      // outgoing drifts the opposite way while crossfading.
      newSlide.style.transition = "none";
      newSlide.style.transform = `translate3d(${dir * 4}%, 0, 0)`;
      void newSlide.offsetWidth;
      newSlide.style.transition = "";
      newSlide.style.transform = "";

      oldSlide.style.transform = `translate3d(${dir * -4}%, 0, 0)`;
      window.setTimeout(() => {
        oldSlide.style.transform = "";
      }, 1200);
    }

    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle("is-active", active);
      if (active) {
        dot.setAttribute("aria-current", "true");
        restartFill(dot);
      } else {
        dot.removeAttribute("aria-current");
      }
    });
  }

  function stop() {
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  function queueNext() {
    stop();
    if (reduced || n < 2 || document.hidden) return;
    timerId = window.setTimeout(() => {
      setIndex(index + 1, 1);
      queueNext();
    }, DURATION);
  }

  function goTo(next, dir) {
    setIndex(next, dir);
    queueNext();
  }

  prevBtn && prevBtn.addEventListener("click", () => goTo(index - 1, -1));
  nextBtn && nextBtn.addEventListener("click", () => goTo(index + 1, 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i, i > index ? 1 : -1)));

  // Swipe on touch devices
  let startX = 0;
  let tracking = false;
  root.addEventListener(
    "pointerdown",
    (e) => {
      if (e.target.closest("a, button, form")) return;
      tracking = true;
      startX = e.clientX;
    },
    { passive: true }
  );
  root.addEventListener(
    "pointerup",
    (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 44) goTo(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    },
    { passive: true }
  );
  root.addEventListener("pointercancel", () => { tracking = false; }, { passive: true });

  // Don't advance (or burn battery) while the tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else queueNext();
  });

  setIndex(0);
  queueNext();
}

/* ============================================================
   Mobile swipe galleries — snap-scroll with dot indicators
   ============================================================ */
function initGalleries() {
  document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    const slides = Array.from(gallery.children);
    if (slides.length < 2) return;

    const dotsWrap = document.createElement("div");
    dotsWrap.className = "gallery-dots md:hidden";
    slides.forEach((slide, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gallery-dot";
      dot.setAttribute("aria-label", `Bilde ${i + 1} av ${slides.length}`);
      dot.addEventListener("click", () => {
        gallery.scrollTo({
          left: slide.offsetLeft - (gallery.clientWidth - slide.offsetWidth) / 2,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      });
      dotsWrap.appendChild(dot);
    });
    gallery.after(dotsWrap);
    const dots = Array.from(dotsWrap.children);

    function update() {
      const center = gallery.scrollLeft + gallery.clientWidth / 2;
      let index = 0;
      let best = Infinity;
      slides.forEach((slide, i) => {
        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        const dist = Math.abs(slideCenter - center);
        if (dist < best) {
          best = dist;
          index = i;
        }
      });
      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    }

    gallery.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
}

/* ============================================================
   Swipe pager — dots under a horizontal snap-scroll slider
   ============================================================ */
function attachScrollPager(scrollEl, trackEl, labelPrefix) {
  const slides = Array.from(trackEl.children);
  if (slides.length < 2) return;

  const dotsWrap = document.createElement("div");
  dotsWrap.className = "gallery-dots md:hidden";

  slides.forEach((slide, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "gallery-dot";
    dot.setAttribute("aria-label", `${labelPrefix} ${i + 1} av ${slides.length}`);
    dot.addEventListener("click", () => {
      const wrapRect = scrollEl.getBoundingClientRect();
      const r = slide.getBoundingClientRect();
      const left =
        scrollEl.scrollLeft + (r.left - wrapRect.left) - (scrollEl.clientWidth - slide.offsetWidth) / 2;
      scrollEl.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
    dotsWrap.appendChild(dot);
  });

  scrollEl.after(dotsWrap);
  const dots = Array.from(dotsWrap.children);

  function update() {
    const wrapRect = scrollEl.getBoundingClientRect();
    const center = wrapRect.left + wrapRect.width / 2;
    let index = 0;
    let best = Infinity;
    slides.forEach((slide, i) => {
      const r = slide.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - center);
      if (dist < best) {
        best = dist;
        index = i;
      }
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  }

  scrollEl.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

/* ============================================================
   Testimonial marquee — duplicate the set for a seamless loop
   ============================================================ */
function initTestimonialMarquee() {
  const wrap = document.querySelector("[data-marquee]");
  const track = wrap && wrap.querySelector("[data-marquee-track]");
  if (!track || track.children.length === 0) return;

  const mobile = window.matchMedia("(max-width: 767px)").matches;

  // Reduced motion or mobile: leave a single, manually swipeable set
  // (CSS turns the track into a snap-scroll slider below 768px). On mobile,
  // add a dots pager so it matches the image galleries.
  if (prefersReducedMotion() || mobile) {
    if (mobile) attachScrollPager(wrap, track, "Referanse");
    return;
  }

  Array.from(track.children).forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });

  // Constant speed regardless of card count: ~45 px/s
  requestAnimationFrame(() => {
    const setWidth = track.scrollWidth / 2;
    track.style.setProperty("--t-dur", `${Math.max(25, Math.round(setWidth / 45))}s`);
  });

  // Pause while a finger is down (touch devices have no hover)
  wrap.addEventListener("pointerdown", () => wrap.classList.add("is-paused"), { passive: true });
  window.addEventListener("pointerup", () => wrap.classList.remove("is-paused"), { passive: true });
}

/* ============================================================
   Pricing tier switcher
   ============================================================ */
function initPricing() {
  const tabs = Array.from(document.querySelectorAll("[data-price-tab]"));
  const amountEl = document.querySelector("[data-price-amount]");
  const perEl = document.querySelector("[data-price-per]");
  const descEl = document.querySelector("[data-price-desc]");
  const extraWrap = document.querySelector("[data-price-extra]");
  const extraTitle = document.querySelector("[data-price-extra-title]");
  const extraList = document.querySelector("[data-price-extra-list]");
  if (!tabs.length || !amountEl) return;

  const TIERS = {
    classic: {
      price: 5490,
      desc: "Minimalistisk premiumkort i plast — uten chip.",
      label: "Med Classic",
      includes: [
        "Matt eller glossy finish",
        "Tosidig trykk i full farge",
        "Skreddersydd design til din merkevare",
      ],
    },
    qr: {
      price: 6490,
      desc: "Premiumkort med trykket QR-kode — kunden scanner og åpner valgfri lenke.",
      label: "Med QR-kort",
      includes: [
        "Trykket QR-kode i ønsket design",
        "AI-drevet digital profil på korvi.no",
        "Lenke til nettside, booking eller LinkedIn",
        "Dynamisk QR — endre lenken når som helst",
      ],
    },
    nfc: {
      price: 7490,
      desc: "Premiumkort med innebygd NFC-chip — ett tapp mot telefonen åpner profilen din.",
      label: "Med NFC-kort",
      includes: [
        "Innebygd NFC-chip — ett tapp åpner profilen",
        "AI-drevet digital profil på korvi.no",
        "Fungerer uten app på moderne telefoner",
        "Endre destinasjonen når som helst",
      ],
    },
  };

  function buildExtra(tier) {
    if (!extraList) return;
    if (extraTitle) extraTitle.textContent = tier.label;
    extraList.innerHTML = tier.includes
      .map(
        (item) =>
          `<li class="list-row"><span class="list-check" aria-hidden="true"></span>${item}</li>`
      )
      .join("");
  }

  // Animate an element from its current height to the height it has after
  // `mutate()` changes its content, so the surrounding panel grows/shrinks
  // smoothly instead of snapping between tier descriptions of different length.
  function animateHeight(el, mutate) {
    if (prefersReducedMotion()) {
      mutate();
      return;
    }
    const startH = el.getBoundingClientRect().height;
    el.style.overflow = "hidden";
    mutate();
    const endH = el.getBoundingClientRect().height;
    const anim = el.animate(
      [
        { height: `${startH}px`, opacity: 0.5 },
        { height: `${endH}px`, opacity: 1 },
      ],
      { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
    anim.onfinish = anim.oncancel = () => {
      el.style.overflow = "";
    };
  }

  function apply(tier) {
    amountEl.textContent = String(tier.price);
    if (perEl) perEl.textContent = `under ${Math.ceil(tier.price / 100)} kr per kort`;
    if (descEl) animateHeight(descEl, () => { descEl.textContent = tier.desc; });
    if (extraWrap) animateHeight(extraWrap, () => buildExtra(tier));
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tier = TIERS[tab.dataset.priceTab];
      if (!tier) return;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
      });

      if (prefersReducedMotion()) {
        apply(tier);
        return;
      }
      amountEl.classList.add("is-swapping");
      window.setTimeout(() => {
        apply(tier);
        amountEl.classList.remove("is-swapping");
      }, 180);
    });
  });

  // Populate the tier-specific list for whichever tab is active on load
  const initialTab = tabs.find((t) => t.classList.contains("is-active")) || tabs[0];
  const initialTier = initialTab && TIERS[initialTab.dataset.priceTab];
  if (initialTier) buildExtra(initialTier);
}

/* ============================================================
   Contact form
   ============================================================ */
function initContactForm() {
  const form = document.getElementById("contactForm");
  const statusEl = document.getElementById("contactStatus");
  if (!form || !statusEl) return;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // field name -> validator returning an error string (or "" when valid)
  const FIELDS = {
    name: (v) => (v.trim() ? "" : "Skriv inn navnet ditt."),
    email: (v) =>
      !v.trim()
        ? "Skriv inn e-postadressen din."
        : EMAIL_RE.test(v.trim())
          ? ""
          : "Skriv inn en gyldig e-postadresse.",
    message: (v) => (v.trim() ? "" : "Skriv en kort melding om hva du ønsker."),
  };

  function fieldEls(name) {
    return {
      input: form.querySelector(`[name="${name}"]`),
      error: document.getElementById(`cf-${name}-err`),
    };
  }

  function showError(name, msg) {
    const { input, error } = fieldEls(name);
    if (!input || !error) return;
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      error.textContent = msg;
      error.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      error.textContent = "";
      error.hidden = true;
    }
  }

  function validateField(name) {
    const { input } = fieldEls(name);
    if (!input) return true;
    const msg = FIELDS[name](input.value);
    showError(name, msg);
    return !msg;
  }

  function setStatus(text, state) {
    statusEl.textContent = text;
    if (state) statusEl.dataset.state = state;
    else delete statusEl.dataset.state;
  }

  // Clear a field's error as soon as the user corrects it
  Object.keys(FIELDS).forEach((name) => {
    const { input } = fieldEls(name);
    if (!input) return;
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") validateField(name);
    });
    input.addEventListener("blur", () => validateField(name));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Honeypot: a filled "company" field means a bot. Pretend success, send nothing.
    const honeypot = form.querySelector('[name="company"]');
    if (honeypot && honeypot.value.trim()) {
      setStatus("Forespørselen er sendt. Vi tar kontakt snart.", "success");
      form.reset();
      return;
    }

    // Validate everything; focus the first invalid field
    const names = Object.keys(FIELDS);
    const results = names.map((name) => validateField(name));
    if (results.includes(false)) {
      const firstInvalid = names[results.indexOf(false)];
      const { input } = fieldEls(firstInvalid);
      if (input) input.focus();
      setStatus("Sjekk feltene som er markert.", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : "Send";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sender…";
    }
    setStatus("");

    try {
      const formData = new FormData(form);
      const payload = {
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
        message: String(formData.get("message") || ""),
      };

      const res = await fetch("/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error("Kunne ikke sende forespørsel. Prøv igjen.");
      }

      setStatus("Forespørselen er sendt. Vi tar kontakt snart.", "success");
      form.reset();
    } catch (err) {
      setStatus(err && err.message ? err.message : "Noe gikk galt.", "error");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

/* ============================================================
   Mobile nav
   ============================================================ */
function initMobileNav() {
  const toggle = document.getElementById("mobile-nav-toggle");
  const panel = document.getElementById("mobile-nav-panel");
  const backdrop = document.getElementById("mobile-nav-backdrop");
  if (!toggle || !panel || !backdrop) return;

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Lukk meny" : "Åpne meny");
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    panel.setAttribute("aria-modal", open ? "true" : "false");
    panel.classList.toggle("pointer-events-auto", open);
    panel.classList.toggle("pointer-events-none", !open);
    if (open) panel.removeAttribute("inert");
    else panel.setAttribute("inert", "");
    backdrop.classList.toggle("is-open", open);
    backdrop.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("mobile-nav-open", open);
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener("click", () => {
    const next = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(next);
  });

  backdrop.addEventListener("click", close);

  panel.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => close());
  });

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        close();
        toggle.focus();
      }
    },
    true
  );

  const mq = window.matchMedia("(min-width: 768px)");
  function onMq() {
    if (mq.matches) close();
  }
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", onMq);
  else if (typeof mq.addListener === "function") mq.addListener(onMq);
}

/* ============================================================
   Scrollspy for header nav
   ============================================================ */
function initNavScrollSpy() {
  const links = Array.from(document.querySelectorAll('header a.nav-link[href^="#"]'));
  if (!links.length) return;

  const header = document.querySelector("header");
  const sectionIds = [...new Set(links.map((a) => a.getAttribute("href").slice(1)))]
    .filter((id) => document.getElementById(id))
    .sort((a, b) => document.getElementById(a).offsetTop - document.getElementById(b).offsetTop);

  function updateActive() {
    const offset = header ? header.offsetHeight + 32 : 120;
    const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 8;
    let activeId = atBottom ? sectionIds[sectionIds.length - 1] : "";
    if (!atBottom) {
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= offset) activeId = id;
      }
    }
    links.forEach((link) => {
      const id = link.getAttribute("href").slice(1);
      const active = id === activeId;
      link.classList.toggle("nav-link-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  window.addEventListener("scroll", updateActive, { passive: true });
  window.addEventListener("resize", updateActive);
  updateActive();
}

/* ============================================================
   FAQ accordion
   ============================================================ */
function initFaq() {
  document.querySelectorAll(".faq-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      const panel = btn.closest(".faq-item").querySelector(".faq-panel");
      if (!panel) return;

      if (prefersReducedMotion()) {
        btn.setAttribute("aria-expanded", String(!expanded));
        if (!expanded) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
        return;
      }

      if (!expanded) {
        btn.setAttribute("aria-expanded", "true");
        panel.removeAttribute("hidden");
        const pb = getComputedStyle(panel).paddingBottom;
        const endH = panel.getBoundingClientRect().height;
        panel.style.overflow = "hidden";
        const anim = panel.animate(
          [
            { height: "0px", paddingBottom: "0px", opacity: 0 },
            { height: `${endH}px`, paddingBottom: pb, opacity: 1 },
          ],
          { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
        anim.onfinish = anim.oncancel = () => {
          panel.style.overflow = "";
        };
      } else {
        btn.setAttribute("aria-expanded", "false");
        const startH = panel.getBoundingClientRect().height;
        panel.style.overflow = "hidden";
        const anim = panel.animate(
          [
            { height: `${startH}px`, paddingBottom: getComputedStyle(panel).paddingBottom, opacity: 1 },
            { height: "0px", paddingBottom: "0px", opacity: 0 },
          ],
          { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
        );
        anim.onfinish = () => {
          panel.setAttribute("hidden", "");
          panel.style.overflow = "";
          anim.cancel();
        };
      }
    });
  });
}

initReveal();
initHeroCarousel();
initGalleries();
initPricing();
initContactForm();
initMobileNav();
initNavScrollSpy();
initFaq();

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
