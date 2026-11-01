import { z } from 'zod';
const label = z.string().max(300);
const text = z.string().max(10000);
const list = schema => z.array(schema).max(100);
export function isSafeUrl(value, absoluteOnly = false) {
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(value)) return false;
  if (value.startsWith('//')) return false;
  try {
    const url = new URL(value, 'https://relative.invalid/');
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    return !absoluteOnly || /^https:\/\//i.test(value);
  } catch { return false; }
}
const url = z.string().max(2000).refine(v => isSafeUrl(v), 'Use HTTPS or a safe relative URL');
const optionalUrl = z.union([z.literal(''), url]);
const heading = z.strictObject({lineOne: label, lineTwo: label});
const image = z.strictObject({url, alt: label});
const link = z.strictObject({label, url: optionalUrl});
const status = z.enum(['published','draft']);
const id = z.string().min(1).max(100).regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
const reserved = new Set(['main','top','projects','about','skills','contact','hero-title','work-title','about-title','skills-title','contact-title']);
export const contentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  metadata: z.strictObject({title: label, description: text, canonicalUrl: url.refine(v => isSafeUrl(v, true), 'Canonical URL must be HTTPS'), themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), faviconUrl: url, socialImage: z.strictObject({url, alt: label, width: z.number().int().min(1).max(10000), height: z.number().int().min(1).max(10000)})}),
  header: z.strictObject({logo: image, brandAriaLabel: label, navigationAriaLabel: label, skipLinkLabel: label, navigation: z.strictObject({projects: label, about: label, skills: label, contact: label}), resumeLabel: label}),
  resume: z.strictObject({url, downloadFilename: z.string().max(300).regex(/^[^/\\\u0000-\u001f]*$/)}),
  hero: z.strictObject({eyebrow: label, heading, description: text, primaryActionLabel: label, secondaryActionLabel: label, notes: list(label), portrait: image, footerText: label, footerLinkLabel: label}),
  work: z.strictObject({eyebrow: label, heading, description: text, academicEyebrow: label, academicHeading: label}),
  projects: list(z.strictObject({id, category: z.enum(['selected','academic']), status, layout: z.enum(['standard','wide']), organization: label, period: label, title: label, description: text, contribution: text, note: text, tags: list(label), tagsAriaLabel: label, link})),
  about: z.strictObject({eyebrow: label, heading, paragraphs: list(text), photo: image, photoCaption: label, link, experienceLabel: label}),
  experience: list(z.strictObject({id, status, organization: label, role: label, period: label})),
  skills: z.strictObject({eyebrow: label, heading, description: text}),
  skillGroups: list(z.strictObject({id, status, title: label, rows: list(text)})),
  contact: z.strictObject({eyebrow: label, heading, description: text, email: z.email().max(300), phoneDisplay: label, phoneDial: z.string().regex(/^\+?[0-9]{1,20}$/), resumeLabel: label}),
  footer: z.strictObject({attribution: label, backToTopLabel: label})
}).superRefine((value, ctx) => {
  const seen = new Set(reserved);
  for (const key of ['projects','experience','skillGroups']) value[key].forEach((item, index) => {
    if (seen.has(item.id)) ctx.addIssue({code:'custom', path:[key,index,'id'], message:'IDs must be unique and cannot use a reserved section ID'});
    seen.add(item.id);
  });
});
export const saveSchema = z.strictObject({content: contentSchema, revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER)});
export function publicContent(content) {
  return {...content, ...Object.fromEntries(['projects','experience','skillGroups'].map(key => [key, content[key].filter(item => item.status === 'published')]))};
}
