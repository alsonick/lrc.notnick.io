"use client";

/**
 * The first Tab stop on every page: past the header, into the page. It moves
 * focus itself instead of letting the browser follow `#main`, because that
 * adds a history entry the router doesn't know about, and pressing Back onto
 * it changes the address while the wrong page stays on screen.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="skip-link"
      onClick={(event) => {
        const main = document.getElementById("main");
        if (!main) return;
        event.preventDefault();
        main.focus();
        main.scrollIntoView();
      }}
    >
      Skip to content
    </a>
  );
}
