(() => {
  'use strict';
  const app = document.getElementById('app');
  const PUBLIC_SITE = 'https://jazferlex.github.io/';
  const tabs = ['Overview', 'Visits', 'Site & SEO', 'Hero', 'Projects', 'About', 'Experience', 'Toolkit', 'Contact & Footer'];
  const state = { content: null, revision: null, updatedAt: null, user: null, tab: 'Overview', dirty: false, saving: false, confirming: false, conflict: null };
  let fieldSequence = 0;
  let notice;
  let workspace;
  let saveButton;
  let saveState;
  const element = (tag, text, className) => {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  };
  const button = (label, action, className = '') => {
    const item = element('button', label, className);
    item.type = 'button';
    item.addEventListener('click', event => {
      if (state.confirming && !item.closest('dialog')) return;
      action(event);
    });
    return item;
  };
  const confirmAction = (title, description, confirmLabel) => new Promise(resolve => {
    if (state.confirming || state.saving) { resolve(false); return; }
    state.confirming = true;
    const previousFocus = document.activeElement;
    const previousInert = app.inert;
    app.inert = true;
    const dialog = element('dialog', undefined, 'confirmation');
    dialog.setAttribute('aria-labelledby', 'confirmation-title');
    dialog.setAttribute('aria-describedby', 'confirmation-description');
    const heading = element('h2', title); heading.id = 'confirmation-title';
    const detail = element('p', description); detail.id = 'confirmation-description';
    let accepted = false;
    const cancel = button('Cancel', () => dialog.close());
    const accept = button(confirmLabel, () => { accepted = true; dialog.close(); }, 'primary');
    const actions = element('div', undefined, 'confirmation-actions'); actions.append(cancel, accept);
    dialog.append(heading, detail, actions);
    dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      dialog.remove(); app.inert = previousInert; state.confirming = false;
      if (previousFocus?.isConnected) previousFocus.focus();
      resolve(accepted);
    }, { once: true });
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus();
  });
  const get = (object, path) => path.split('.').reduce((value, key) => value[key], object);
  const set = (object, path, value) => {
    const keys = path.split('.'); const key = keys.pop();
    keys.reduce((target, part) => target[part], object)[key] = value;
  };
  const field = (path, label, type = 'text', hint = '') => ({ path, label, type, hint });
  const headingFields = prefix => [field(`${prefix}.lineOne`, 'Heading · first line'), field(`${prefix}.lineTwo`, 'Heading · second line')];
  // Field descriptors keep the forms aligned with the strict document contract.
  const sections = {
    'Site & SEO': [
      ['Search & social sharing', 'Browser metadata updates immediately on the public page. Search engines and social crawlers may read the static page metadata.', [
        field('metadata.title', 'Page title'), field('metadata.description', 'Page description', 'textarea'),
        field('metadata.canonicalUrl', 'Canonical page URL', 'canonical'), field('metadata.themeColor', 'Browser theme color', 'color'),
        field('metadata.faviconUrl', 'Favicon URL', 'url'), field('metadata.socialImage.url', 'Social image URL', 'url'),
        field('metadata.socialImage.alt', 'Social image alternative text'), field('metadata.socialImage.width', 'Social image width', 'number'), field('metadata.socialImage.height', 'Social image height', 'number')]],
      ['Header & navigation', 'Section links keep their existing destinations. Change their visible labels here.', [
        field('header.logo.url', 'Logo URL', 'url'), field('header.logo.alt', 'Logo alternative text'),
        field('header.brandAriaLabel', 'Brand link accessible label'), field('header.navigationAriaLabel', 'Navigation accessible label'), field('header.skipLinkLabel', 'Skip link label'),
        ...['projects', 'about', 'skills', 'contact'].map(key => field(`header.navigation.${key}`, `${key[0].toUpperCase() + key.slice(1)} navigation label`)), field('header.resumeLabel', 'Header resume link label')]],
      ['Resume', 'Use an HTTPS URL or a path relative to your public website. File uploading is not part of this editor.', [field('resume.url', 'Resume file URL', 'url'), field('resume.downloadFilename', 'Download filename')]]
    ],
    Hero: [
      ['Introduction', 'The first section visitors see.', [field('hero.eyebrow', 'Eyebrow'), ...headingFields('hero.heading'), field('hero.description', 'Introduction', 'textarea'), field('hero.primaryActionLabel', 'Work button label'), field('hero.secondaryActionLabel', 'Contact link label'), field('hero.notes', 'Focus areas', 'list')]],
      ['Portrait & closing line', '', [field('hero.portrait.url', 'Portrait URL', 'url'), field('hero.portrait.alt', 'Portrait alternative text'), field('hero.footerText', 'Closing line'), field('hero.footerLinkLabel', 'Selected work link label')]]
    ],
    Projects: [
      ['Work section', '', [field('work.eyebrow', 'Section eyebrow'), ...headingFields('work.heading'), field('work.description', 'Section description', 'textarea'), field('work.academicEyebrow', 'Academic section eyebrow'), field('work.academicHeading', 'Academic section heading')]]
    ],
    About: [
      ['About you', '', [field('about.eyebrow', 'Section eyebrow'), ...headingFields('about.heading'), field('about.paragraphs', 'Biography paragraphs', 'list'), field('about.photo.url', 'Photo URL', 'url'), field('about.photo.alt', 'Photo alternative text'), field('about.photoCaption', 'Photo caption'), field('about.link.label', 'Profile link label'), field('about.link.url', 'Profile link URL', 'optional-url'), field('about.experienceLabel', 'Experience section label')]]
    ],
    Toolkit: [
      ['Toolkit introduction', '', [field('skills.eyebrow', 'Section eyebrow'), ...headingFields('skills.heading'), field('skills.description', 'Section description', 'textarea')]]
    ],
    'Contact & Footer': [
      ['Contact', 'The public email address is contact information. It does not change who can sign in to this editor.', [field('contact.eyebrow', 'Section eyebrow'), ...headingFields('contact.heading'), field('contact.description', 'Contact introduction', 'textarea'), field('contact.email', 'Email address', 'email'), field('contact.phoneDisplay', 'Phone number · display'), field('contact.phoneDial', 'Phone number · dial', 'tel'), field('contact.resumeLabel', 'Resume download link label')]],
      ['Footer', '', [field('footer.attribution', 'Attribution'), field('footer.backToTopLabel', 'Back to top link label')]]
    ]
  };
  const projectFields = [field('id', 'Project ID', 'slug', 'Unique, lowercase letters, numbers and hyphens. This is also the project’s public anchor.'), field('status', 'Visibility', ['published', 'draft']), field('category', 'Section', ['selected', 'academic']), field('layout', 'Card layout', ['standard', 'wide']), field('organization', 'Organization / context'), field('period', 'Period'), field('title', 'Project title'), field('description', 'Description', 'textarea'), field('contribution', 'Your contribution', 'textarea'), field('note', 'Additional note', 'textarea'), field('tags', 'Tags', 'list'), field('tagsAriaLabel', 'Tags accessible label'), field('link.label', 'Project link label'), field('link.url', 'Project link URL', 'optional-url', 'Leave blank to hide the link.')];
  const recordTypes = {
    projects: { label: 'Project', title: 'Projects', fields: projectFields, create: () => ({ id: `project-${crypto.randomUUID().slice(0, 8)}`, status: 'draft', category: 'selected', layout: 'standard', organization: '', period: '', title: 'New project', description: '', contribution: '', note: '', tags: [], tagsAriaLabel: 'Project focus areas', link: { label: '', url: '' } }) },
    experience: { label: 'Experience', title: 'Experience', fields: [field('id', 'Experience ID', 'slug'), field('status', 'Visibility', ['published', 'draft']), field('organization', 'Organization'), field('role', 'Role'), field('period', 'Period')], create: () => ({ id: `experience-${crypto.randomUUID().slice(0, 8)}`, status: 'draft', organization: 'New organization', role: '', period: '' }) },
    skillGroups: { label: 'Toolkit group', title: 'Toolkit groups', fields: [field('id', 'Group ID', 'slug'), field('status', 'Visibility', ['published', 'draft']), field('title', 'Group title'), field('rows', 'Skill rows', 'list')], create: () => ({ id: `toolkit-${crypto.randomUUID().slice(0, 8)}`, status: 'draft', title: 'New toolkit group', rows: [] }) }
  };
  class ApiError extends Error {
    constructor(status, body) {
      const message = typeof body?.error === 'string' ? body.error : body?.error?.message || body?.message;
      super(message || `Request failed (${status}).`); this.status = status; this.body = body;
    }
  }
  const request = async (path, options = {}) => {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
    let body;
    try { body = await response.json(); } catch { body = null; }
    if (!response.ok) throw new ApiError(response.status, body);
    return body;
  };
  const message = (text, kind = 'info') => {
    notice.replaceChildren(element('p', text)); notice.className = `notice ${kind}`;
    notice.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  };
  const markDirty = () => {
    state.dirty = true;
    if (saveState) { saveState.textContent = 'Unsaved changes'; saveState.dataset.dirty = 'true'; }
    if (saveButton) saveButton.disabled = state.saving;
  };
  const setEditorBusy = busy => {
    state.saving = busy;
    app.setAttribute('aria-busy', String(busy));
    if (busy) {
      app.querySelectorAll('input,textarea,select,button').forEach(input => {
        if (input === saveButton) return;
        input.dataset.wasDisabled = String(input.disabled);
        input.disabled = true;
      });
    } else {
      app.querySelectorAll('[data-was-disabled]').forEach(input => {
        input.disabled = input.dataset.wasDisabled === 'true';
        delete input.dataset.wasDisabled;
      });
    }
    if (saveButton) saveButton.disabled = busy || !state.dirty;
  };
  const safeUrl = (value, canonical = false) => {
    if (typeof value !== 'string' || !value || value !== value.trim() || /[\\\u0000-\u0020\u007f]/.test(value) || value.startsWith('//') || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(value)) throw new Error('Use an HTTPS URL or a safe relative path.');
    const parsed = new URL(value, PUBLIC_SITE);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || (canonical && !/^https:\/\//i.test(value))) throw new Error(canonical ? 'Use a complete HTTPS URL.' : 'Use an HTTPS URL or a safe relative path.');
    return parsed.href;
  };
  const move = (array, index, direction) => { [array[index], array[index + direction]] = [array[index + direction], array[index]]; markDirty(); renderContent(); };
  const stringList = (object, descriptor) => {
    const container = element('div', undefined, 'field wide');
    const title = element('h3', descriptor.label); title.id = `field-${++fieldSequence}`; container.append(title);
    const rows = get(object, descriptor.path);
    const list = element('div'); list.setAttribute('role', 'group'); list.setAttribute('aria-labelledby', title.id);
    rows.forEach((value, index) => {
      const row = element('div', undefined, 'list-row'); const id = `field-${++fieldSequence}`;
      const label = element('label', `${descriptor.label} · ${index + 1}`); label.htmlFor = id;
      const input = element('textarea'); input.id = id; input.value = value; input.rows = 2; input.maxLength = ['notes', 'tags'].includes(descriptor.path.split('.').pop()) ? 300 : 10000;
      input.addEventListener('input', () => { rows[index] = input.value; markDirty(); });
      const actions = element('div', undefined, 'actions');
      const up = button('Move up', () => move(rows, index, -1)); up.disabled = index === 0;
      const down = button('Move down', () => move(rows, index, 1)); down.disabled = index === rows.length - 1;
      const remove = button('Delete', async () => { if (await confirmAction('Delete item?', `Delete this ${descriptor.label.toLowerCase()} item? This takes effect when you save.`, 'Delete')) { rows.splice(index, 1); markDirty(); renderContent(); workspace.focus(); } }, 'danger');
      actions.append(up, down, remove); row.append(label, input, actions); list.append(row);
    });
    const add = button(`+ Add ${descriptor.label.toLowerCase()} item`, () => { rows.push(''); markDirty(); renderContent(); }); add.disabled = rows.length >= 100;
    container.append(list, add); return container;
  };
  const renderField = (object, descriptor) => {
    if (descriptor.type === 'list') return stringList(object, descriptor);
    const wrapper = element('div', undefined, `field${descriptor.type === 'textarea' ? ' wide' : ''}`);
    const id = `field-${++fieldSequence}`; const label = element('label', descriptor.label); label.htmlFor = id;
    let input;
    if (Array.isArray(descriptor.type)) {
      input = element('select'); descriptor.type.forEach(value => { const option = element('option', value === 'published' ? 'Published · visible on site' : value === 'draft' ? 'Draft · hidden from site' : value); option.value = value; input.append(option); });
    } else if (descriptor.type === 'textarea') input = element('textarea');
    else {
      input = element('input'); input.type = ['email', 'tel', 'number'].includes(descriptor.type) ? descriptor.type : 'text';
      if (descriptor.type === 'number') { input.min = '1'; input.max = '10000'; input.step = '1'; }
      if (descriptor.path === 'contact.phoneDial') input.pattern = '[+]?[0-9]{1,20}';
      if (descriptor.type === 'slug') input.pattern = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
      if (descriptor.type === 'color') input.pattern = '#[a-fA-F0-9]{6}';
      input.maxLength = /url|canonical/.test(descriptor.type) ? 2000 : descriptor.type === 'slug' ? 100 : 300;
    }
    input.id = id; input.value = get(object, descriptor.path);
    if (descriptor.type === 'textarea') input.maxLength = 10000;
    const preview = /url|canonical/.test(descriptor.type) ? element('a', 'Preview on public site ↗', 'link-preview') : null;
    const validate = () => {
      input.setCustomValidity('');
      if (preview) {
        try {
          if (!input.value && descriptor.type === 'optional-url') { preview.hidden = true; return; }
          preview.href = safeUrl(input.value, descriptor.type === 'canonical'); preview.hidden = false;
        } catch (error) { input.setCustomValidity(error.message); preview.hidden = true; }
      }
    };
    const hint = descriptor.hint || (preview ? 'HTTPS URL or path relative to jazferlex.github.io.' : '');
    wrapper.append(label, input);
    if (hint) { const help = element('p', hint, 'hint'); help.id = `${id}-hint`; input.setAttribute('aria-describedby', help.id); wrapper.append(help); }
    if (preview) { preview.target = '_blank'; preview.rel = 'noopener noreferrer'; wrapper.append(preview); }
    validate();
    input.addEventListener('input', () => { set(object, descriptor.path, descriptor.type === 'number' ? Number(input.value) : input.value); validate(); markDirty(); });
    if (descriptor.path === 'status') input.addEventListener('change', renderContent);
    return wrapper;
  };
  const panel = (title, description, descriptors) => {
    const card = element('section', undefined, 'panel'); card.append(element('h2', title));
    if (description) card.append(element('p', description));
    const grid = element('div', undefined, 'field-grid'); descriptors.forEach(descriptor => grid.append(renderField(state.content, descriptor))); card.append(grid); return card;
  };
  const records = key => {
    const config = recordTypes[key]; const array = state.content[key];
    const header = element('div', undefined, 'section-actions');
    header.append(element('h2', `${config.title} (${array.length})`));
    const add = button(`+ Add ${config.label.toLowerCase()}`, () => { array.push(config.create()); markDirty(); renderContent(); const cards = workspace.querySelectorAll('.record'); cards[cards.length - 1]?.scrollIntoView({ block: 'start' }); });
    add.disabled = array.length >= 100; header.append(add); workspace.append(header);
    if (!array.length) workspace.append(element('div', `No ${config.title.toLowerCase()} yet. Add one to get started.`, 'empty'));
    array.forEach((record, index) => {
      const card = element('section', undefined, 'record'); const top = element('div', undefined, 'record-header');
      const description = element('div'); const title = element('h2', record.title || record.organization || `${config.label} ${index + 1}`);
      title.append(element('span', record.status === 'draft' ? 'DRAFT' : 'PUBLISHED', `badge ${record.status === 'draft' ? 'draft' : ''}`));
      description.append(title, element('p', `#${record.id}`, 'small'));
      const actions = element('div', undefined, 'actions');
      const up = button('↑ Move up', () => move(array, index, -1)); up.disabled = index === 0;
      const down = button('↓ Move down', () => move(array, index, 1)); down.disabled = index === array.length - 1;
      const remove = button('Delete', async () => { if (await confirmAction(`Delete ${config.label.toLowerCase()}?`, `Delete “${record.title || record.organization || config.label}”? This takes effect when you save.`, 'Delete')) { array.splice(index, 1); markDirty(); renderContent(); workspace.focus(); } }, 'danger');
      actions.append(up, down, remove); top.append(description, actions);
      const body = element('div', undefined, 'record-body field-grid'); config.fields.forEach(descriptor => body.append(renderField(record, descriptor)));
      card.append(top, body); workspace.append(card);
    });
  };
  const overview = () => {
    const stats = element('div', undefined, 'stats');
    for (const [key, label] of [['projects', 'published projects'], ['experience', 'published roles'], ['skillGroups', 'published toolkit groups']]) {
      const card = element('div', undefined, 'stat'); card.append(element('strong', String(state.content[key].filter(record => record.status === 'published').length)), element('span', label)); stats.append(card);
    }
    workspace.append(stats);
    const card = element('section', undefined, 'panel'); card.append(element('h2', 'Your portfolio, in one place'), element('p', 'Edit a section, review your changes, then save. All sections are saved together. Draft records stay hidden from visitors.'));
    const list = element('ul', undefined, 'overview-list');
    [['Site title', state.content.metadata.title], ['Current revision', String(state.revision)], ['Last saved', state.updatedAt ? new Date(state.updatedAt).toLocaleString() : 'Not available'], ['Document schema', `Version ${state.content.schemaVersion}`]].forEach(([label, value]) => { const item = element('li'); item.append(element('strong', label), element('span', value)); list.append(item); });
    card.append(list); workspace.append(card);
    workspace.append(panel('Publishing notes', 'Images and resume files use URLs. The site stays available if the content API is unavailable. Google sign-in is restricted to your authorized account.', []));
  };
  const visitCounts = new Intl.NumberFormat();
  const visitDates = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
  const countryNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
  const countryName = code => /^[A-Z]{2}$/.test(code) ? countryNames?.of(code) || code : code;
  const regionName = code => {
    const country = code.split('-')[0];
    return country === code ? code : `${countryName(country)} · ${code}`;
  };
  const visitBreakdown = (title, entries, formatLabel = label => label) => {
    const card = element('section', undefined, 'panel');
    card.append(element('h2', title));
    if (!entries.length) {
      card.append(element('p', 'No data yet.'));
      return card;
    }
    const list = element('dl', undefined, 'visit-list');
    entries.forEach(({ label, count }) => {
      const row = element('div');
      row.append(element('dt', formatLabel(label)), element('dd', visitCounts.format(count)));
      list.append(row);
    });
    card.append(list);
    return card;
  };
  const dailyVisits = days => {
    const card = element('section', undefined, 'panel');
    const heading = element('h2', 'Daily page views');
    heading.id = 'daily-views-heading';
    const table = element('table', undefined, 'visit-table');
    table.setAttribute('aria-labelledby', heading.id);
    const header = table.createTHead().insertRow();
    for (const label of ['Date (Manila)', 'Page views']) {
      const cell = element('th', label);
      cell.scope = 'col';
      header.append(cell);
    }
    const body = table.createTBody();
    [...days].sort((first, second) => second.date.localeCompare(first.date)).forEach(({ date, count }) => {
      const row = body.insertRow();
      const dateCell = element('th', visitDates.format(new Date(date)));
      dateCell.scope = 'row';
      row.append(dateCell, element('td', visitCounts.format(count)));
    });
    card.append(heading, table);
    return card;
  };
  const visits = () => {
    const report = element('div');
    const toolbar = element('div', undefined, 'visit-toolbar');
    const status = element('p');
    status.setAttribute('role', 'status');
    const results = element('div');
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      refresh.setAttribute('aria-disabled', 'true');
      results.setAttribute('aria-busy', 'true');
      status.textContent = 'Loading visit data…';
      try {
        const data = await request('/api/admin/visits');
        if (!report.isConnected) return;
        const summary = element('div', undefined, 'stat visit-total');
        summary.append(element('strong', visitCounts.format(data.total)), element('span', 'page views in the last 30 days'));
        results.replaceChildren(summary);
        if (data.total === 0) {
          results.append(element('p', 'No page views recorded yet.', 'empty'));
        } else {
          const grid = element('div', undefined, 'visit-grid');
          grid.append(visitBreakdown('Countries', data.countries, countryName),
            visitBreakdown('Regions', data.regions, regionName),
            visitBreakdown('Browsers', data.browsers),
            visitBreakdown('Operating systems', data.operatingSystems));
          results.append(grid, dailyVisits(data.days));
        }
        status.textContent = 'Visit data is up to date.';
      } catch (error) {
        if (!report.isConnected) return;
        status.textContent = error.status === 401
          ? 'Your session expired. Sign in in another tab, then refresh this report.'
          : 'Could not load visit data. Try refreshing.';
      } finally {
        loading = false;
        refresh.removeAttribute('aria-disabled');
        results.removeAttribute('aria-busy');
      }
    };
    const refresh = button('Refresh report', load);
    toolbar.append(status, refresh);
    report.append(toolbar, results);
    workspace.append(report);
    load();
  };
  function renderContent() {
    workspace.replaceChildren(); fieldSequence = 0;
    const description = {
      Overview: 'A little space to keep your work up to date.',
      Visits: 'Page views for the last 30 days in Manila time. Location is estimated from network data. A refresh counts as a new page view.'
    };
    const intro = element('div', undefined, 'intro'); intro.append(element('h1', state.tab), element('p', description[state.tab] || 'Make it yours. Changes go live when you save.')); workspace.append(intro);
    if (state.tab === 'Overview') overview();
    else if (state.tab === 'Visits') visits();
    else {
      (sections[state.tab] || []).forEach(([title, description, fields]) => workspace.append(panel(title, description, fields)));
      if (state.tab === 'Projects') records('projects');
      if (state.tab === 'Experience') records('experience');
      if (state.tab === 'Toolkit') records('skillGroups');
    }
    app.querySelectorAll('.navigation button').forEach(item => { if (item.textContent === state.tab) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current'); });
  }
  const downloadDraft = () => {
    const blob = new Blob([JSON.stringify({ content: state.content, revision: state.revision }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = element('a'); anchor.href = url; anchor.download = 'portfolio-draft.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const showConflict = () => {
    message('A newer version was saved elsewhere. Your draft is still here and has not been overwritten. Download it, load the latest saved version, or keep your draft after reviewing the conflict.', 'error');
    const actions = element('div', undefined, 'conflict-actions');
    actions.append(button('Download my draft', downloadDraft));
    actions.append(button('Load latest saved version', async () => {
      if (!await confirmAction('Replace your local draft?', 'Replace the local draft with the latest saved content? Download your draft first if you want to keep a copy.', 'Load latest version')) return;
      const latest = state.conflict; state.content = latest.content; state.revision = latest.revision; state.updatedAt = latest.updatedAt; state.conflict = null; state.dirty = false;
      saveState.textContent = 'All changes saved'; saveState.dataset.dirty = 'false'; saveButton.disabled = true; renderContent(); message('Loaded the latest saved version.', 'success');
    }));
    actions.append(button('Keep my draft', async () => {
      if (!await confirmAction('Keep your draft?', 'Keep your draft and use the latest revision for your next save? Saving will replace the newer content with your draft.', 'Keep my draft')) return;
      state.revision = state.conflict.revision; state.updatedAt = state.conflict.updatedAt; state.conflict = null; markDirty(); message('Your draft is ready for review. Saving will replace the current saved content with this draft.', 'info');
    }));
    notice.append(actions);
  };
  const validateDocument = () => {
    const descriptors = Object.values(sections).flatMap(items => items.flatMap(([, , fields]) => fields));
    for (const descriptor of descriptors) {
      if (['url', 'canonical'].includes(descriptor.type) || (descriptor.type === 'optional-url' && get(state.content, descriptor.path))) { try { safeUrl(get(state.content, descriptor.path), descriptor.type === 'canonical'); } catch (error) { throw new Error(`${descriptor.label}: ${error.message}`); } }
    }
    const reserved = new Set(['main', 'top', 'projects', 'about', 'skills', 'contact', 'hero-title', 'work-title', 'about-title', 'skills-title', 'contact-title']);
    const ids = new Set();
    for (const [key, config] of Object.entries(recordTypes)) {
      for (const record of state.content[key]) {
        if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(record.id) || reserved.has(record.id) || ids.has(record.id)) throw new Error(`${config.label} ID “${record.id}” must be a unique slug and must not match a section ID.`);
        ids.add(record.id);
        if (key === 'projects' && record.link.url) { try { safeUrl(record.link.url); } catch (error) { throw new Error(`Project “${record.title}” link: ${error.message}`); } }
      }
    }
  };
  const save = async () => {
    if (state.saving || !state.dirty) return;
    if (state.conflict) { showConflict(); return; }
    try { validateDocument(); } catch (error) { message(error.message, 'error'); return; }
    const invalid = [...workspace.querySelectorAll('input,textarea,select')].find(input => !input.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    setEditorBusy(true); saveButton.textContent = 'Saving…'; saveButton.setAttribute('aria-busy', 'true');
    try {
      const result = await request('/api/admin/content', { method: 'PUT', body: JSON.stringify({ content: state.content, revision: state.revision }) });
      state.content = result.content; state.revision = result.revision; state.updatedAt = result.updatedAt; state.dirty = false;
      saveState.textContent = 'All changes saved'; saveState.dataset.dirty = 'false'; renderContent(); message('Saved. Your published content is ready on the public site.', 'success');
    } catch (error) {
      if (error.status === 409) {
        try { state.conflict = await request('/api/admin/content'); showConflict(); } catch { message('A newer version exists. Your draft is preserved. Try saving again to load recovery options.', 'error'); }
      } else if (error.status === 401) message('Your session expired. Download your draft before signing in again.', 'error');
      else if (error.status === 403) message('This account or request is not authorized to save. Your draft is preserved.', 'error');
      else {
        const issues = Array.isArray(error.body?.issues) ? error.body.issues.slice(0, 8).map(issue => `${Array.isArray(issue.path) ? issue.path.join('.') : issue.path}: ${issue.message}`).join('; ') : '';
        message(`Could not save. ${error.message}${issues ? ` ${issues}` : ''} Your draft is preserved.`, 'error');
      }
      if (error.status === 401) notice.append(button('Download my draft', downloadDraft), button('Sign in again', () => signIn()));
    } finally {
      setEditorBusy(false); saveButton.textContent = 'Save changes'; saveButton.removeAttribute('aria-busy');
    }
  };
  const signOut = async () => {
    if (state.saving) return;
    if (state.dirty && !await confirmAction('Sign out?', 'Sign out and discard unsaved changes? Download or save your draft first if you want to keep it.', 'Sign out')) return;
    setEditorBusy(true);
    try { await request('/api/auth/sign-out', { method: 'POST', body: '{}' }); state.dirty = false; state.content = null; showLogin(); }
    catch (error) { message(`Could not sign out. ${error.message} Your draft is preserved.`, 'error'); }
    finally { setEditorBusy(false); }
  };
  const shell = () => {
    app.replaceChildren(); app.setAttribute('aria-busy', 'false'); const layout = element('div', undefined, 'shell');
    const sidebar = element('aside', undefined, 'sidebar'); const identity = element('div', undefined, 'identity'); const brand = element('span', 'J.', 'brand-mark'); brand.setAttribute('aria-hidden', 'true');
    const identityText = element('div'); identityText.append(element('strong', 'Portfolio Studio'), element('span', 'YOUR WORK, KEPT CURRENT')); identity.append(brand, identityText);
    const navigation = element('nav', undefined, 'navigation'); navigation.setAttribute('aria-label', 'Editor sections');
    tabs.forEach(tab => navigation.append(button(tab, () => { if (state.saving) return; state.tab = tab; renderContent(); workspace.focus(); })));
    const sidebarFooter = element('div', undefined, 'sidebar-footer'); const publicLink = element('a', 'View public site ↗'); publicLink.href = PUBLIC_SITE; publicLink.target = '_blank'; publicLink.rel = 'noopener noreferrer';
    sidebarFooter.append(publicLink, element('p', state.user.email, 'small'), button('Sign out', signOut)); sidebar.append(identity, navigation, sidebarFooter);
    const main = element('main', undefined, 'workspace'); const toolbar = element('div', undefined, 'toolbar'); const title = element('div'); title.append(element('p', 'JAZFER LICAROS / CONTENT', 'eyebrow'), element('span', 'Google account · private editor', 'toolbar-title'));
    const actions = element('div', undefined, 'toolbar-actions'); saveState = element('span', 'All changes saved', 'small save-state'); saveState.dataset.dirty = 'false';
    const discard = button('Discard changes', async () => {
      if (!state.dirty || state.saving) return;
      if (!await confirmAction('Discard unsaved changes?', 'Discard all unsaved changes and load the saved version?', 'Discard changes')) return;
      loadContent();
    });
    saveButton = button('Save changes', save, 'primary'); saveButton.disabled = true; actions.append(saveState, discard, saveButton); toolbar.append(title, actions);
    notice = element('div', undefined, 'notice'); notice.setAttribute('aria-live', 'polite');
    workspace = element('div'); workspace.id = 'workspace'; workspace.tabIndex = -1;
    main.append(toolbar, notice, workspace); layout.append(sidebar, main); app.append(layout); renderContent();
  };
  const loadContent = async () => {
    if (state.saving) return;
    setEditorBusy(true);
    try {
      const result = await request('/api/admin/content');
      if (!result?.content || result.content.schemaVersion !== 1) throw new Error('The server returned an unsupported content document.');
      state.content = result.content; state.revision = result.revision; state.updatedAt = result.updatedAt; state.conflict = null; state.dirty = false; shell();
    } catch (error) {
      if (state.content) {
        message(`Could not reload. ${error.message} Your draft is preserved.`, 'error');
        if (error.status === 401) notice.append(button('Download my draft', downloadDraft), button('Sign in again', () => signIn()));
      } else if (error.status === 401) showLogin();
      else showLogin(error.status === 403 ? 'This Google account is not authorized to edit this portfolio.' : `The editor could not load content. ${error.message}`);
    } finally { setEditorBusy(false); }
  };
  const signIn = async () => {
    const signInButton = document.getElementById('google-sign-in');
    if (signInButton) { signInButton.disabled = true; signInButton.textContent = 'Connecting to Google…'; }
    try {
      const result = await request('/api/auth/sign-in/social', { method: 'POST', body: JSON.stringify({ provider: 'google', callbackURL: '/admin/', errorCallbackURL: '/admin/' }) });
      const destination = result?.url || result?.redirectURL;
      const target = new URL(destination);
      if (!destination || target.protocol !== 'https:' || target.username || target.password) throw new Error('Google sign-in did not return a valid redirect URL.');
      location.assign(target.href);
    } catch (error) {
      message(error.status === 503 ? 'Google sign-in is not configured yet. The owner needs to finish Google OAuth setup on the server. Editing is unavailable until setup is complete.' : `Could not start Google sign-in. ${error.message}`, 'error');
      if (signInButton) { signInButton.disabled = error.status === 503; signInButton.textContent = error.status === 503 ? 'Google setup required' : 'Continue with Google'; }
    }
  };
  function showLogin(errorMessage = '', setupMissing = false) {
    app.replaceChildren(); app.setAttribute('aria-busy', 'false'); const login = element('main', undefined, 'login'); login.id = 'workspace';
    const brand = element('span', 'J.', 'brand-mark'); brand.setAttribute('aria-hidden', 'true');
    login.append(brand, element('p', 'PRIVATE CONTENT EDITOR', 'eyebrow'), element('h1', 'A home for your work.'), element('p', 'Sign in to update your portfolio, share a new project, or keep the details current.'));
    notice = element('div', undefined, 'notice'); notice.setAttribute('aria-live', 'polite'); login.append(notice);
    const loginButton = button(setupMissing ? 'Google setup required' : 'Continue with Google', signIn, 'primary'); loginButton.id = 'google-sign-in'; loginButton.disabled = setupMissing;
    login.append(loginButton, element('p', 'Google sign-in only. Access is limited to the authorized portfolio owner.', 'small'));
    const publicLink = element('a', '← Back to the portfolio'); publicLink.href = PUBLIC_SITE; login.append(publicLink); app.append(login);
    if (errorMessage) message(errorMessage, 'error');
  }
  window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
  const start = async () => {
    try {
      const session = await request('/api/auth/get-session');
      if (!session?.user) {
        const authError = new URLSearchParams(location.search).get('error');
        showLogin(authError ? 'Google sign-in was not completed or this account is not authorized. Try your authorized Google account.' : ''); return;
      }
      state.user = session.user; await loadContent();
    } catch (error) {
      showLogin(error.status === 503 ? 'Google sign-in is not configured yet. The owner needs to finish server OAuth setup before editing is available.' : `Could not check your session. ${error.message}`, error.status === 503);
    }
  };
  start();
})();
