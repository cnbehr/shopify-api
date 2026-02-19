interface SocialLinksRowProps {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  pinterest?: string;
  linkedin?: string;
}

const icons: Record<string, { viewBox: string; path: string }> = {
  instagram: {
    viewBox: '0 0 24 24',
    path: 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  },
  tiktok: {
    viewBox: '0 0 24 24',
    path: 'M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48',
  },
  facebook: {
    viewBox: '0 0 24 24',
    path: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2z',
  },
  twitter: {
    viewBox: '0 0 24 24',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  youtube: {
    viewBox: '0 0 24 24',
    path: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.35 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z',
  },
  pinterest: {
    viewBox: '0 0 24 24',
    path: 'M12 0a12 12 0 0 0-4.373 23.178c-.07-.633-.134-1.606.028-2.298.146-.625.943-3.998.943-3.998s-.24-.482-.24-1.193c0-1.116.648-1.95 1.455-1.95.686 0 1.018.516 1.018 1.133 0 .69-.44 1.722-.667 2.678-.19.803.402 1.457 1.192 1.457 1.43 0 2.53-1.51 2.53-3.69 0-1.929-1.387-3.278-3.369-3.278-2.295 0-3.642 1.72-3.642 3.5 0 .693.266 1.435.6 1.838a.24.24 0 0 1 .056.231c-.061.256-.198.803-.225.916-.036.149-.116.18-.268.109-1-.465-1.624-1.926-1.624-3.1 0-2.523 1.835-4.84 5.287-4.84 2.775 0 4.932 1.977 4.932 4.62 0 2.757-1.739 4.976-4.151 4.976-.81 0-1.573-.422-1.834-.92l-.498 1.902c-.18.695-.668 1.566-.994 2.097A12 12 0 1 0 12 0',
  },
  linkedin: {
    viewBox: '0 0 24 24',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z',
  },
};

export function SocialLinksRow(props: SocialLinksRowProps) {
  const links = [
    { key: 'instagram', url: props.instagram },
    { key: 'tiktok', url: props.tiktok },
    { key: 'facebook', url: props.facebook },
    { key: 'twitter', url: props.twitter },
    { key: 'youtube', url: props.youtube },
    { key: 'pinterest', url: props.pinterest },
    { key: 'linkedin', url: props.linkedin },
  ].filter(l => l.url);

  if (links.length === 0) return null;

  return (
    <div className="mt-3 flex items-center gap-3">
      {links.map(({ key, url }) => {
        const icon = icons[key];
        if (!icon) return null;
        return (
          <a
            key={key}
            href={url!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--muted)] hover:text-[var(--ink-strong)] transition-colors"
            title={key.charAt(0).toUpperCase() + key.slice(1)}
          >
            <svg
              width="16"
              height="16"
              viewBox={icon.viewBox}
              fill="currentColor"
            >
              <path d={icon.path} />
            </svg>
          </a>
        );
      })}
    </div>
  );
}
