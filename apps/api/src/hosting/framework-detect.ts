export type HostingFrameworkId =
  | 'vite-react'
  | 'vite-vue'
  | 'astro'
  | 'nuxt'
  | 'sveltekit'
  | 'next-static'
  | 'next-ssr'
  | 'unknown';

export type FrameworkPreset = {
  id: HostingFrameworkId;
  label: string;
  buildCommand: string;
  outputDirectory: string;
  installCommand: string;
  envPrefix: 'NEXT_PUBLIC_' | 'VITE_' | 'PUBLIC_' | 'NUXT_PUBLIC_' | '';
  supportsDeploy: boolean;
  warning?: string;
};

export const FRAMEWORK_PRESETS: Record<HostingFrameworkId, FrameworkPreset> = {
  'vite-react': {
    id: 'vite-react',
    label: 'Vite + React',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install',
    envPrefix: 'VITE_',
    supportsDeploy: true,
  },
  'vite-vue': {
    id: 'vite-vue',
    label: 'Vite + Vue',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install',
    envPrefix: 'VITE_',
    supportsDeploy: true,
  },
  astro: {
    id: 'astro',
    label: 'Astro',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install',
    envPrefix: 'PUBLIC_',
    supportsDeploy: true,
  },
  nuxt: {
    id: 'nuxt',
    label: 'Nuxt (static)',
    buildCommand: 'npx nuxi generate',
    outputDirectory: '.output/public',
    installCommand: 'npm install',
    envPrefix: 'NUXT_PUBLIC_',
    supportsDeploy: true,
  },
  sveltekit: {
    id: 'sveltekit',
    label: 'SvelteKit',
    buildCommand: 'npm run build',
    // adapter-cloudflare (used when repo has adapter-auto) writes here
    outputDirectory: '.svelte-kit/cloudflare',
    installCommand: 'npm install',
    envPrefix: 'PUBLIC_',
    supportsDeploy: true,
  },
  'next-static': {
    id: 'next-static',
    label: 'Next.js (static export)',
    buildCommand: 'npx next build',
    outputDirectory: 'out',
    installCommand: 'npm install',
    envPrefix: 'NEXT_PUBLIC_',
    supportsDeploy: true,
  },
  'next-ssr': {
    id: 'next-ssr',
    label: 'Next.js (SSR)',
    buildCommand: 'npx next build',
    outputDirectory: '.next',
    installCommand: 'npm install',
    envPrefix: 'NEXT_PUBLIC_',
    supportsDeploy: false,
    warning:
      'Full Next.js SSR requires Hosting Pro (Cloudflare Workers / OpenNext). Use `output: "export"` for Free Pages.',
  },
  unknown: {
    id: 'unknown',
    label: 'Custom',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install',
    envPrefix: 'VITE_',
    supportsDeploy: true,
  },
};

type PkgJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

export function detectFramework(
  pkg: PkgJson,
  nextConfigRaw?: string | null,
): FrameworkPreset {
  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };
  const has = (name: string) => Boolean(deps[name]);

  if (has('next')) {
    const isExport =
      typeof nextConfigRaw === 'string' &&
      (/output\s*:\s*['"]export['"]/.test(nextConfigRaw) ||
        /output:\s*['"]export['"]/.test(nextConfigRaw));
    return FRAMEWORK_PRESETS[isExport ? 'next-static' : 'next-ssr'];
  }
  if (has('nuxt') || has('nuxt3')) return FRAMEWORK_PRESETS.nuxt;
  if (has('@sveltejs/kit')) return FRAMEWORK_PRESETS.sveltekit;
  if (has('astro')) return FRAMEWORK_PRESETS.astro;
  if (has('vite') && has('vue')) return FRAMEWORK_PRESETS['vite-vue'];
  if (has('vite') && (has('react') || has('react-dom'))) {
    return FRAMEWORK_PRESETS['vite-react'];
  }
  if (has('vite')) return FRAMEWORK_PRESETS['vite-react'];
  return FRAMEWORK_PRESETS.unknown;
}

export function voltbaseEnvForFramework(
  preset: FrameworkPreset,
  projectUrl: string,
  anonKey: string,
): Record<string, string> {
  const prefix = preset.envPrefix;
  const env: Record<string, string> = {
    VOLTBASE_URL: projectUrl,
    VOLTBASE_ANON_KEY: anonKey,
  };
  if (prefix) {
    env[`${prefix}VOLTBASE_URL`] = projectUrl;
    env[`${prefix}VOLTBASE_ANON_KEY`] = anonKey;
  }
  return env;
}
