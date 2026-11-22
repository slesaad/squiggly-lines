<script lang="ts">
  import type { Snippet } from 'svelte';

  // Native <dialog> shell: modal focus trapping, Esc to close and an inert
  // page behind come from the browser. Desktop shows a centered card; phones
  // get a bottom sheet.
  interface Props {
    open: boolean;
    label: string;
    onclose: () => void;
    children: Snippet;
  }

  let { open, label, onclose, children }: Props = $props();
  let el: HTMLDialogElement;

  $effect(() => {
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  });
</script>

<dialog
  bind:this={el}
  aria-label={label}
  onclose={onclose}
  onclick={(e) => {
    // The sheet fills the dialog, so a click landing on the dialog itself is a backdrop click.
    if (e.target === el) el.close();
  }}
>
  <div class="sheet">
    <button class="close" aria-label="Close" onclick={() => el.close()}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
    </button>
    {#if open}
      {@render children()}
    {/if}
  </div>
</dialog>

<style>
  dialog {
    /* The site's global reset zeroes margins; auto margins are what center a modal dialog. */
    margin: auto;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    width: min(860px, calc(100vw - 48px));
    max-width: none;
    max-height: calc(100dvh - 48px);
    overflow: visible;
  }
  dialog::backdrop {
    background: rgba(20, 16, 10, 0.45);
    backdrop-filter: blur(3px);
  }
  dialog[open] {
    animation: card-in 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.15);
  }
  dialog[open]::backdrop {
    animation: fade-in 0.2s ease;
  }

  /* Keepsake card: warm paper with a faint grain, sitting a touch crooked. */
  .sheet {
    --paper: #fbf6ea;
    position: relative;
    max-height: calc(100dvh - 48px);
    overflow: auto;
    padding: clamp(20px, 3vw, 36px);
    border-radius: 14px;
    rotate: -0.6deg;
    --ink: #3d2f20;
    --ink-soft: rgba(61, 47, 32, 0.62);
    --line: rgba(92, 72, 50, 0.5);
    --line-soft: rgba(92, 72, 50, 0.2);
    font-family: 'Schoolbell', cursive;
    color: var(--ink);
    background:
      url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.1  0 0 0 0.07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"),
      var(--paper);
    box-shadow:
      0 24px 60px -12px rgba(0, 0, 0, 0.45),
      0 2px 6px rgba(0, 0, 0, 0.15);
  }

  .close {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .close:hover {
    background: rgba(0, 0, 0, 0.06);
    color: var(--ink);
  }
  .close:focus-visible {
    outline: 2px solid var(--accent-color);
  }
  .close svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
  }

  :global([data-theme='dark']) .sheet {
    --paper: #2b2d31;
    --ink: #eceae6;
    --ink-soft: rgba(236, 234, 230, 0.62);
    --line: rgba(245, 245, 240, 0.45);
    --line-soft: rgba(245, 245, 240, 0.16);
  }

  @keyframes card-in {
    from {
      opacity: 0;
      scale: 0.94;
      translate: 0 12px;
    }
  }
  @keyframes sheet-in {
    from {
      translate: 0 100%;
    }
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }

  @media (max-width: 700px) {
    dialog {
      width: 100vw;
      max-height: 90dvh;
      margin: auto 0 0 0;
    }
    dialog[open] {
      animation: sheet-in 0.32s cubic-bezier(0.2, 0.9, 0.3, 1);
    }
    .sheet {
      max-height: 90dvh;
      rotate: none;
      border-radius: 18px 18px 0 0;
      padding: 28px 20px calc(24px + env(safe-area-inset-bottom));
    }
    /* Grab bar so the sheet reads as a sheet. */
    .sheet::before {
      content: '';
      position: absolute;
      top: 8px;
      left: 50%;
      width: 40px;
      height: 4px;
      translate: -50% 0;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.18);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    dialog[open] {
      animation: fade-in 0.15s ease;
    }
  }
</style>
