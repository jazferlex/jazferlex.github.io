(() => {
  'use strict';
  const select = selector => document.querySelector(selector);
  const text = (selector, value) => { select(selector).textContent = value; };
  const node = (tag, value, className) => {
    const element = document.createElement(tag);
    if (value !== undefined) element.textContent = value;
    if (className) element.className = className;
    return element;
  };
  const safeUrl = value => {
    if (typeof value !== 'string' || !value || value !== value.trim() || /[\\\u0000-\u0020\u007f]/.test(value) || value.startsWith('//') || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(value)) throw new Error('Invalid content URL');
    const parsed = new URL(value, location.href);
    if (parsed.username || parsed.password || (parsed.protocol !== 'https:' && !(!/^[a-z][a-z\d+.-]*:/i.test(value) && parsed.origin === location.origin))) throw new Error('Unsafe content URL');
    return value;
  };
  const heading = (selector, value, className = '') => {
    select(selector).replaceChildren(document.createTextNode(value.lineOne), node('br'), node('span', value.lineTwo, className));
  };
  const image = (selector, value) => {
    const element = select(selector);
    if (element.getAttribute('src') !== value.url) {
      element.removeAttribute('srcset');
      element.removeAttribute('sizes');
    }
    element.src = safeUrl(value.url);
    element.alt = value.alt;
  };
  const link = (selector, value) => {
    const element = select(selector);
    element.textContent = value.label;
    element.hidden = !value.url;
    if (value.url) element.href = safeUrl(value.url);
    else element.removeAttribute('href');
  };
  const project = record => {
    const academic = record.category === 'academic';
    const wide = !academic && record.layout === 'wide';
    const article = node('article', undefined, academic ? 'academic-card' : `project-card${wide ? ' project-card-wide' : ''}`);
    article.id = record.id;
    const body = node('div', undefined, academic ? '' : `project-content${wide ? ' project-content-wide' : ''}`);
    const lead = wide ? node('div', undefined, 'project-lead') : body;
    const summary = wide ? node('div', undefined, 'project-summary') : body;
    const meta = node('p', undefined, 'project-meta');
    meta.append(document.createTextNode(record.organization + (academic && record.period ? ' · ' : ' ')), node('span', record.period));
    lead.append(meta, node('h3', record.title));
    if (record.description) summary.append(node('p', record.description));
    if (record.contribution) summary.append(node('p', record.contribution, 'project-contribution'));
    if (record.note) summary.append(node('p', record.note, 'academic-note'));
    if (record.tags.length) {
      const tags = node('ul', undefined, 'tags');
      tags.setAttribute('aria-label', record.tagsAriaLabel);
      tags.append(...record.tags.map(tag => node('li', tag)));
      summary.append(tags);
    }
    if (record.link.url) {
      const anchor = node('a', undefined, 'demo-link');
      anchor.href = safeUrl(record.link.url);
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.append(node('span', record.link.label));
      summary.append(anchor);
    }
    if (wide) body.append(lead, summary);
    article.append(body);
    return article;
  };
  const validateContent = content => {
    const headingShape = { lineOne: 'label', lineTwo: 'label' };
    const imageShape = { url: 'url', alt: 'label' };
    const linkShape = { label: 'label', url: 'optional-url' };
    const shape = {
      schemaVersion: 1,
      metadata: { title: 'label', description: 'text', canonicalUrl: 'url', themeColor: 'color', faviconUrl: 'url', socialImage: { ...imageShape, width: 'number', height: 'number' } },
      header: { logo: imageShape, brandAriaLabel: 'label', navigationAriaLabel: 'label', skipLinkLabel: 'label', navigation: { projects: 'label', about: 'label', skills: 'label', contact: 'label' }, resumeLabel: 'label' },
      resume: { url: 'url', downloadFilename: 'label' },
      hero: { eyebrow: 'label', heading: headingShape, description: 'text', primaryActionLabel: 'label', secondaryActionLabel: 'label', notes: ['label'], portrait: imageShape, footerText: 'label', footerLinkLabel: 'label' },
      work: { eyebrow: 'label', heading: headingShape, description: 'text', academicEyebrow: 'label', academicHeading: 'label' },
      projects: [{ id: 'id', category: 'category', status: 'status', layout: 'layout', organization: 'label', period: 'label', title: 'label', description: 'text', contribution: 'text', note: 'text', tags: ['label'], tagsAriaLabel: 'label', link: linkShape }],
      about: { eyebrow: 'label', heading: headingShape, paragraphs: ['text'], photo: imageShape, photoCaption: 'label', link: linkShape, experienceLabel: 'label' },
      experience: [{ id: 'id', status: 'status', organization: 'label', role: 'label', period: 'label' }],
      skills: { eyebrow: 'label', heading: headingShape, description: 'text' },
      skillGroups: [{ id: 'id', status: 'status', title: 'label', rows: ['text'] }],
      contact: { eyebrow: 'label', heading: headingShape, description: 'text', email: 'label', phoneDisplay: 'label', phoneDial: 'label', resumeLabel: 'label' },
      footer: { attribution: 'label', backToTopLabel: 'label' }
    };
    const check = (value, expected) => {
      if (expected === 1) { if (value !== 1) throw new Error('Unsupported schema'); return; }
      if (Array.isArray(expected)) {
        if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid content array');
        value.forEach(item => check(item, expected[0])); return;
      }
      if (typeof expected === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== Object.keys(expected).length) throw new Error('Invalid content object');
        Object.entries(expected).forEach(([key, type]) => check(value[key], type)); return;
      }
      if (expected === 'number') { if (!Number.isInteger(value) || value < 1 || value > 10000) throw new Error('Invalid image dimensions'); return; }
      const limit = expected === 'text' ? 10000 : expected.includes('url') ? 2000 : expected === 'id' ? 100 : 300;
      if (typeof value !== 'string' || value.length > limit) throw new Error('Invalid content text');
      const enums = { category: ['selected', 'academic'], status: ['published', 'draft'], layout: ['standard', 'wide'] };
      if (enums[expected] && !enums[expected].includes(value)) throw new Error('Invalid content choice');
      if (expected === 'id' && !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)) throw new Error('Invalid anchor');
      if (expected === 'color' && !/^#[a-f\d]{6}$/i.test(value)) throw new Error('Invalid color');
      if (expected === 'url' || (expected === 'optional-url' && value)) safeUrl(value);
    };
    check(content, shape);
    const ids = new Set(['main', 'top', 'projects', 'about', 'skills', 'contact', 'hero-title', 'work-title', 'about-title', 'skills-title', 'contact-title']);
    for (const record of [...content.projects, ...content.experience, ...content.skillGroups]) {
      if (ids.has(record.id)) throw new Error('Duplicate anchor');
      ids.add(record.id);
    }
  };
  const render = content => {
    // Validate all configurable destinations before touching the static fallback.
    const urls = [content.metadata.canonicalUrl, content.metadata.faviconUrl, content.metadata.socialImage.url, content.header.logo.url, content.resume.url, content.hero.portrait.url, content.about.photo.url, ...(content.about.link.url ? [content.about.link.url] : []), ...content.projects.map(record => record.link.url).filter(Boolean)];
    urls.forEach(safeUrl);
    if (new URL(content.metadata.canonicalUrl).protocol !== 'https:') throw new Error('Invalid canonical URL');
    const projects = content.projects.filter(record => record.status === 'published').map(project);
    document.title = content.metadata.title;
    const meta = (selector, value) => select(selector).setAttribute('content', value);
    meta('meta[name="description"]', content.metadata.description);
    meta('meta[name="theme-color"]', content.metadata.themeColor);
    select('link[rel="canonical"]').href = content.metadata.canonicalUrl;
    select('link[rel="icon"]').href = content.metadata.faviconUrl;
    for (const prefix of ['og', 'twitter']) {
      const attribute = prefix === 'og' ? 'property' : 'name';
      const set = (key, value) => meta(`meta[${attribute}="${prefix}:${key}"]`, value);
      set('title', content.metadata.title); set('description', content.metadata.description);
      set('url', content.metadata.canonicalUrl); set('image', new URL(content.metadata.socialImage.url, location.href).href);
      set('image:alt', content.metadata.socialImage.alt);
    }
    meta('meta[property="og:image:width"]', content.metadata.socialImage.width);
    meta('meta[property="og:image:height"]', content.metadata.socialImage.height);
    text('.skip-link', content.header.skipLinkLabel);
    select('.brand').setAttribute('aria-label', content.header.brandAriaLabel);
    select('.site-header nav').setAttribute('aria-label', content.header.navigationAriaLabel);
    image('.brand img', content.header.logo);
    for (const key of ['projects', 'about', 'skills', 'contact']) text(`.site-header nav a[href="#${key}"]`, content.header.navigation[key]);
    for (const selector of ['.resume-link', '.contact-bottom a[download]']) {
      select(selector).href = content.resume.url;
      select(selector).download = content.resume.downloadFilename;
    }
    text('.resume-link', content.header.resumeLabel);
    text('.hero-copy .eyebrow', content.hero.eyebrow);
    heading('#hero-title', content.hero.heading);
    text('.hero-description', content.hero.description);
    text('.hero-actions .button', content.hero.primaryActionLabel);
    text('.hero-actions .text-link', content.hero.secondaryActionLabel);
    select('.hero-notes').replaceChildren(...content.hero.notes.map(note => node('span', note)));
    image('.hero-portrait img', content.hero.portrait);
    text('.hero-footer > span', content.hero.footerText);
    text('.hero-footer > a', content.hero.footerLinkLabel);
    text('.work-section .section-heading .eyebrow', content.work.eyebrow);
    heading('#work-title', content.work.heading, 'work-title-line');
    text('.work-section .section-heading > p', content.work.description);
    text('.academic-heading .eyebrow', content.work.academicEyebrow);
    text('.academic-heading h3', content.work.academicHeading);
    select('.project-grid').replaceChildren(...projects.filter(record => record.classList.contains('project-card')));
    select('.academic-grid').replaceChildren(...projects.filter(record => record.classList.contains('academic-card')));
    text('.about-copy .eyebrow', content.about.eyebrow);
    heading('#about-title', content.about.heading, 'muted');
    const about = select('.about-copy');
    about.querySelectorAll(':scope > p:not(.eyebrow)').forEach(paragraph => paragraph.remove());
    const aboutLink = about.querySelector('.text-link');
    content.about.paragraphs.forEach(paragraph => about.insertBefore(node('p', paragraph), aboutLink));
    image('.about-photo img', content.about.photo);
    text('.about-photo > span', content.about.photoCaption);
    link('.about-copy .text-link', content.about.link);
    text('.experience > .eyebrow', content.about.experienceLabel);
    select('.experience-list').replaceChildren(...content.experience.filter(record => record.status === 'published').map(record => {
      const item = node('li'); const description = node('div');
      description.append(node('h3', record.organization), node('p', record.role));
      item.append(description, node('span', record.period)); return item;
    }));
    text('.skills-section .eyebrow', content.skills.eyebrow);
    heading('#skills-title', content.skills.heading, 'muted');
    text('.skills-section .section-heading > p', content.skills.description);
    select('.skills-grid').replaceChildren(...content.skillGroups.filter(record => record.status === 'published').map(record => {
      const article = node('article', undefined, 'skill-group'); const rows = node('p');
      record.rows.forEach((row, index) => { if (index) rows.append(node('br')); rows.append(document.createTextNode(row)); });
      article.append(node('h3', record.title), rows); return article;
    }));
    text('.contact-section .eyebrow', content.contact.eyebrow);
    heading('#contact-title', content.contact.heading);
    text('.contact-heading > p', content.contact.description);
    text('.contact-email', content.contact.email);
    select('.contact-email').href = `mailto:${encodeURIComponent(content.contact.email)}`;
    text('.contact-bottom a[href^="tel:"]', content.contact.phoneDisplay);
    select('.contact-bottom a[href^="tel:"]').href = `tel:${encodeURIComponent(content.contact.phoneDial)}`;
    text('.contact-bottom a[download]', content.contact.resumeLabel);
    text('.footer-inner > span', content.footer.attribution);
    text('.footer-inner > a', content.footer.backToTopLabel);
    // Reveal containers stay in place, so motion.js keeps observing the same nodes.
    window.dispatchEvent(new Event('portfolio:content-loaded'));
  };
  const origin = window.PORTFOLIO_API_ORIGIN;
  if (typeof origin !== 'string') return;
  let endpoint;
  try {
    const api = new URL(origin);
    if (api.username || api.password || !['http:', 'https:'].includes(api.protocol)) return;
    endpoint = new URL('/api/content', api);
  } catch { return; }
  fetch(endpoint, { credentials: 'omit', signal: AbortSignal.timeout(8000) })
    .then(response => { if (!response.ok) throw new Error('Content unavailable'); return response.json(); })
    .then(({ content }) => { if (content?.schemaVersion !== 1) throw new Error('Unsupported content'); validateContent(content); render(content); })
    .catch(() => { /* The complete static page remains available during API outages. */ });
})();
