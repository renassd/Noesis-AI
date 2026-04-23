"use client";

import {
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type RevealMode = "words" | "soft";

type ScrollRevealTextProps<T extends ElementType> = {
  as?: T;
  text: string;
  className?: string;
  mode?: RevealMode;
  stagger?: number;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ScrollRevealText<T extends ElementType = "p">({
  as,
  text,
  className,
  mode = "words",
  stagger = 0.9,
  ...rest
}: ScrollRevealTextProps<T>) {
  const Component = (as ?? "p") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  const tokens = useMemo(() => text.split(/(\s+)/).filter((token) => token.length > 0), [text]);
  const words = useMemo(() => tokens.filter((token) => !/^\s+$/.test(token)), [tokens]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const start = viewportHeight * 0.92;
      const end = viewportHeight * 0.28;
      const next = clamp((start - rect.top) / (start - end), 0, 1);

      setProgress((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
      frameRef.current = null;
    };

    const requestUpdate = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (mode === "soft") {
    return (
      <Component
        ref={ref}
        className={className}
        data-scroll-reveal="soft"
        style={{ "--reveal-progress": `${progress}` } as CSSProperties}
        {...rest}
      >
        <span className="srt-soft-inner">{text}</span>
      </Component>
    );
  }

  const total = Math.max(words.length - 1, 1);
  let revealIndex = -1;

  return (
    <Component ref={ref} className={className} data-scroll-reveal="words" aria-label={text} {...rest}>
      {tokens.map((token, index) => {
        if (/^\s+$/.test(token)) {
          return (
            <span key={`space-${index}`} className="srt-space" aria-hidden="true">
              {token}
            </span>
          );
        }

        revealIndex += 1;
        const wordProgress = clamp(progress * (total + stagger) - revealIndex, 0, 1);

        return (
          <span key={`word-${index}-${token}`} className="srt-word-wrap" aria-hidden="true">
            <span className="srt-word-base">{token}</span>
            <span
              className="srt-word-fill"
              style={{ "--word-progress": `${wordProgress}` } as CSSProperties}
            >
              {token}
            </span>
          </span>
        );
      })}
    </Component>
  );
}
