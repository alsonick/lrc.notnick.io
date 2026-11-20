import type { Metadata } from "next";

const title = "MIT License";

export const metadata: Metadata = {
  title,
  // Only the home page has a description; search engines write their own
  // snippet for the rest. Null, as leaving it out would inherit the home page's.
  description: null,
  alternates: { canonical: "/license" },
  // No titles here: Next fills them in from `title`, the same as the tab.
  openGraph: { url: "/license", images: ["/og.png"] },
  twitter: { images: ["/og.png"] },
};

/**
 * The license from the LICENSE file at the root of the repo, word for word,
 * with its line breaks joined so it wraps to the screen. Change both together.
 */
export default function Page() {
  return (
    <div className="mx-auto mt-4 w-full max-w-5xl px-4 py-6 sm:mt-8 sm:py-10">
      <article className="max-w-208">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          License
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Copyright (c) {new Date().getFullYear()} Nicholas Njoki
        </p>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Permission is hereby granted, free of charge, to any person
            obtaining a copy of this software and associated documentation
            files (the &quot;Software&quot;), to deal in the Software without
            restriction, including without limitation the rights to use, copy,
            modify, merge, publish, distribute, sublicense, and/or sell copies
            of the Software, and to permit persons to whom the Software is
            furnished to do so, subject to the following conditions:
          </p>
          <p>
            The above copyright notice and this permission notice shall be
            included in all copies or substantial portions of the Software.
          </p>
          <p>
            THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY
            KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
            NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
            BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
            ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
            CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
            SOFTWARE.
          </p>
        </div>
      </article>
    </div>
  );
}
