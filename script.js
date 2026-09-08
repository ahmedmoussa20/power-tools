const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.product-card');
filters.forEach(btn => btn.addEventListener('click', () => {
  filters.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filter = btn.dataset.filter;
  cards.forEach(card => {
    card.classList.toggle('hidden', filter !== 'all' && card.dataset.cat !== filter);
  });
}));

const navLinks = document.querySelectorAll('.nav a');
const sections = [...document.querySelectorAll('main section[id]')];
window.addEventListener('scroll', () => {
  const y = window.scrollY + 120;
  let current = 'top';
  sections.forEach(section => { if (y >= section.offsetTop) current = section.id; });
  navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${current}`));
});
