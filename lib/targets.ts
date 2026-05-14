import fs from 'fs';
import path from 'path';

export interface Targets {
  twitter: string[];
  websites: string[];
}

export function loadTargets(): Targets {
  const filePath = path.join(process.cwd(), '.claude', 'targets.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  const twitter: string[] = [];
  const websites: string[] = [];
  let section: 'twitter' | 'websites' | null = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '## [twitter]') {
      section = 'twitter';
    } else if (trimmed === '## [websites]') {
      section = 'websites';
    } else if (trimmed.startsWith('- ') && section !== null) {
      const value = trimmed.slice(2).trim();
      if (value) {
        if (section === 'twitter') twitter.push(value);
        else websites.push(value);
      }
    }
  }

  return { twitter, websites };
}
