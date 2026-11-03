const API = '/api';
const $ = (selector) => document.querySelector(selector);
async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}
function escapeHTML(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function shortDate(date) {
  if (!date) return 'Date to be announced';
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
function jobCard(job) {
  const title = escapeHTML(job.title), company = escapeHTML(job.company);
  const skills = escapeHTML(job.skills);
  return `<article class="job-card"><div class="job-card-top"><span class="company-mark">${escapeHTML(company.charAt(0).toUpperCase())}</span><span class="job-tag">${Number(job.openings)} opening${Number(job.openings)===1?'':'s'}</span></div><h3>${title}</h3><div class="company-name">${company}</div><div class="job-meta"><span>⌖ ${escapeHTML(job.location)}</span><span>◷ ${escapeHTML(shortDate(job.interviewDate))}</span></div><p class="skill-list">${skills}</p><div class="job-card-foot"><div class="salary">${escapeHTML(job.salary)} <small>/ year</small></div><a class="apply-link" href="jobs.html">View role ↗</a></div></article>`;
}
function jobRow(job) {
  return `<article class="job-row"><span class="company-mark">${escapeHTML(job.company.charAt(0).toUpperCase())}</span><div><h3>${escapeHTML(job.title)}</h3><div class="company-name">${escapeHTML(job.company)}</div><div class="job-meta"><span>⌖ ${escapeHTML(job.location)}</span><span>◷ Interview: ${escapeHTML(shortDate(job.interviewDate))}</span><span>♙ ${Number(job.openings)} opening${Number(job.openings)===1?'':'s'}</span></div><p class="skill-list">${escapeHTML(job.skills)}</p></div><div class="job-row-side"><span class="salary">${escapeHTML(job.salary)}</span><button type="button" onclick="showJobInfo(${Number(job.id)})">View details ↗</button></div></article>`;
}
async function loadTitles() {
  try {
    const titles = await request(`${API}/job-titles`);
    ['#heroTitle','#titleFilter'].forEach(selector => {
      const select = $(selector);
      if (!select) return;
      titles.forEach(title => {
        const option = document.createElement('option'); option.value = title; option.textContent = title; select.appendChild(option);
      });
    });
  } catch (err) { console.warn(err.message); }
}
async function loadFeatured() {
  const container = $('#featuredJobs'); if (!container) return;
  try {
    const jobs = await request(`${API}/jobs`);
    const count = $('#jobCount'); if (count) count.textContent = jobs.length.toLocaleString('en-IN');
    container.innerHTML = jobs.length ? jobs.slice(0,3).map(jobCard).join('') : `<div class="empty-state"><h3>No jobs yet</h3><p>Post an opening to see it featured here.</p><a class="text-link" href="post-job.html">Post a job →</a></div>`;
  } catch (err) { container.innerHTML = `<div class="empty-state"><h3>Could not load jobs</h3><p>${escapeHTML(err.message)} Make sure the server and MySQL are running.</p></div>`; }
}
async function searchJobs() {
  const container = $('#allJobs'); if (!container) return;
  container.innerHTML = '<div class="loading">Searching opportunities…</div>';
  const params = new URLSearchParams();
  const search = $('#searchInput')?.value.trim(), title = $('#titleFilter')?.value, location = $('#locationFilter')?.value.trim();
  if (search) params.set('search', search);
  if (title) params.set('title', title);
  if (location) params.set('location', location);
  try {
    const jobs = await request(`${API}/jobs?${params.toString()}`);
    $('#resultsCount').textContent = `${jobs.length} position${jobs.length===1?'':'s'} found`;
    container.innerHTML = jobs.length ? jobs.map(jobRow).join('') : `<div class="empty-state"><h3>No matching jobs found</h3><p>Try another title or location, or clear your filters.</p></div>`;
  } catch (err) {
    $('#resultsCount').textContent = 'Unable to load results';
    container.innerHTML = `<div class="empty-state"><h3>We couldn't connect</h3><p>${escapeHTML(err.message)} Check the server and MySQL settings.</p></div>`;
  }
}
window.showJobInfo = async (id) => {
  try {
    const job = await request(`${API}/jobs/${id}`);
    alert(`${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nSalary: ${job.salary}\nSkills: ${job.skills}\nInterview date: ${shortDate(job.interviewDate)}\nOpenings: ${job.openings}\n\nTo apply, contact the company directly. Application submission is not enabled in this student project.`);
  } catch (err) { alert(err.message); }
};
document.addEventListener('DOMContentLoaded', async () => {
  const menu = $('.menu-toggle');
  menu?.addEventListener('click', () => $('nav')?.classList.toggle('open'));
  await loadTitles();
  await loadFeatured();
  if ($('#allJobs')) {
    const params = new URLSearchParams(location.search);
    if (params.get('search')) $('#searchInput').value = params.get('search');
    if (params.get('title')) $('#titleFilter').value = params.get('title');
    await searchJobs();
    $('#searchButton')?.addEventListener('click', searchJobs);
    $('#clearFilters')?.addEventListener('click', () => { $('#searchInput').value=''; $('#titleFilter').value=''; $('#locationFilter').value=''; searchJobs(); });
    $('#searchInput')?.addEventListener('keydown', e => { if(e.key==='Enter') searchJobs(); });
  }
  $('#heroSearch')?.addEventListener('submit', e => {
    e.preventDefault();
    const params = new URLSearchParams();
    if ($('#heroKeyword').value.trim()) params.set('search', $('#heroKeyword').value.trim());
    if ($('#heroTitle').value) params.set('title', $('#heroTitle').value);
    location.href = `jobs.html?${params.toString()}`;
  });
  $('#jobForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget, message = $('#formMessage'), values = Object.fromEntries(new FormData(form).entries());
    values.openings = Number(values.openings);
    message.textContent = 'Publishing your job…'; message.className = 'form-message';
    try {
      await request(`${API}/jobs`, { method: 'POST', body: JSON.stringify(values) });
      message.textContent = 'Job posted successfully! It is now visible on the Find Jobs page.';
      message.className = 'form-message success'; form.reset(); form.elements.openings.value = 1;
    } catch (err) { message.textContent = err.message; message.className = 'form-message error'; }
  });
});